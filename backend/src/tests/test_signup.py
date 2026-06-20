"""End-to-end tests for the signup endpoint and user service.

These exercise the full request path (routing -> SignupSchema validation ->
create_user service -> token issuance) so the validation that previously existed
only as dead code stays wired up.
"""

import json

from django.contrib.auth import get_user_model
from django.test import TestCase

User = get_user_model()

SIGNUP_URL = "/api/signup/"
TOKEN_PAIR_URL = "/api/token/pair/"
TOKEN_REFRESH_URL = "/api/token/refresh/"

VALID_PAYLOAD = {
    "username": "validuser",
    "email": "valid@example.com",
    "password": "Ztr9wKqp42",
    "confirm_password": "Ztr9wKqp42",
}


def post_json(client, url, payload):
    return client.post(url, data=json.dumps(payload), content_type="application/json")


def post_signup(client, **overrides):
    return post_json(client, SIGNUP_URL, {**VALID_PAYLOAD, **overrides})


def seed_user(**overrides):
    """Create the canonical user directly via the ORM (no HTTP round trip)."""
    fields = {
        "username": VALID_PAYLOAD["username"],
        "email": VALID_PAYLOAD["email"],
        "password": VALID_PAYLOAD["password"],
        "is_active": True,
        **overrides,
    }
    return User.objects.create_user(**fields)


class SignupTests(TestCase):
    def test_valid_signup_creates_user_and_returns_tokens(self):
        response = post_signup(self.client)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["username"], "validuser")
        self.assertEqual(body["email"], "valid@example.com")
        self.assertTrue(body["is_authenticated"])
        self.assertTrue(body["access_token"])
        self.assertTrue(body["refresh_token"])
        self.assertTrue(User.objects.filter(username="validuser").exists())

    def _assert_field_error(self, response, field):
        """A 422 whose ONLY field error's loc ends in `field`."""
        self.assertEqual(response.status_code, 422)
        detail = response.json()["detail"]
        self.assertIsInstance(detail, list)
        fields = {entry["loc"][-1] for entry in detail}
        # Exactly the expected field errored — guards against over-rejection
        # that would break the frontend's per-field rendering.
        self.assertEqual(fields, {field})

    def test_short_username_rejected(self):
        self._assert_field_error(post_signup(self.client, username="ab"), "username")

    def test_invalid_username_chars_rejected(self):
        self._assert_field_error(
            post_signup(self.client, username="bad user!"), "username"
        )

    def test_invalid_email_rejected(self):
        self._assert_field_error(
            post_signup(self.client, email="not-an-email"), "email"
        )

    def test_each_password_rule_enforced(self):
        # One case per branch of validate_password, so a regression in any single
        # rule is caught (a single 'abc' would only ever hit the length check).
        cases = [
            "short1A",  # < 8 chars
            "alllowercase1",  # missing uppercase
            "ALLUPPERCASE1",  # missing lowercase
            "NoDigitsHere",  # missing number
        ]
        for password in cases:
            with self.subTest(password=password):
                response = post_signup(
                    self.client, password=password, confirm_password=password
                )
                self._assert_field_error(response, "password")
                self.assertEqual(User.objects.count(), 0)

    def test_password_mismatch_maps_to_confirm_password(self):
        response = post_signup(self.client, confirm_password="Different9X")
        self._assert_field_error(response, "confirm_password")
        self.assertFalse(User.objects.filter(username="validuser").exists())

    def test_garbage_payload_does_not_create_user(self):
        # The bug this whole refactor fixes: junk used to create a user.
        response = post_signup(
            self.client,
            username="ab",
            email="bad",
            password="a",
            confirm_password="x",
        )
        self.assertEqual(response.status_code, 422)
        self.assertEqual(User.objects.count(), 0)


class SignupUniquenessTests(TestCase):
    def setUp(self):
        seed_user()

    def test_duplicate_username_rejected(self):
        response = post_signup(self.client, email="other@example.com")
        self.assertEqual(response.status_code, 400)
        self.assertIn("not available", response.json()["detail"])
        # No second account, and the existing one is untouched.
        self.assertEqual(User.objects.filter(username="validuser").count(), 1)
        self.assertEqual(User.objects.count(), 1)

    def test_duplicate_email_rejected(self):
        response = post_signup(self.client, username="differentuser")
        self.assertEqual(response.status_code, 400)
        self.assertIn("not available", response.json()["detail"])
        self.assertEqual(User.objects.count(), 1)

    def test_common_password_rejected_by_django_validators(self):
        # 'Password1' passes the schema's format rules but fails Django's
        # CommonPasswordValidator, proving AUTH_PASSWORD_VALIDATORS are wired
        # into create_user. (Use a fresh username/email to isolate from setUp.)
        response = post_signup(
            self.client,
            username="brandnew",
            email="brandnew@example.com",
            password="Password1",
            confirm_password="Password1",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("too common", response.json()["detail"])
        self.assertFalse(User.objects.filter(username="brandnew").exists())


class TokenTests(TestCase):
    def setUp(self):
        seed_user()

    def _obtain_pair(self, password):
        return post_json(
            self.client,
            TOKEN_PAIR_URL,
            {"username": VALID_PAYLOAD["username"], "password": password},
        )

    def test_valid_credentials_return_token_pair(self):
        response = self._obtain_pair(VALID_PAYLOAD["password"])
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["access"])
        self.assertTrue(body["refresh"])

    def test_bad_credentials_rejected(self):
        self.assertEqual(self._obtain_pair("wrong-password").status_code, 401)

    def test_refresh_token_yields_new_access(self):
        # Round-trips the refresh token back through the JWT machinery: proves
        # the issued token is genuinely valid, not just a truthy string.
        refresh = self._obtain_pair(VALID_PAYLOAD["password"]).json()["refresh"]
        response = post_json(self.client, TOKEN_REFRESH_URL, {"refresh": refresh})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["access"])


class CurrentUserTests(TestCase):
    def setUp(self):
        seed_user()

    def _access_token(self):
        response = post_json(
            self.client,
            TOKEN_PAIR_URL,
            {"username": VALID_PAYLOAD["username"], "password": VALID_PAYLOAD["password"]},
        )
        return response.json()["access"]

    def test_me_requires_authentication(self):
        self.assertEqual(self.client.get("/api/me/").status_code, 401)

    def test_me_returns_authenticated_user(self):
        # Full round trip: the access token actually authenticates a request to a
        # user_required endpoint (not just that it was issued).
        token = self._access_token()
        response = self.client.get("/api/me/", HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["username"], VALID_PAYLOAD["username"])
        self.assertEqual(body["email"], VALID_PAYLOAD["email"])
        self.assertTrue(body["is_authenticated"])
        self.assertNotIn("access_token", body)  # /me must not leak tokens

    def test_me_rejects_garbage_token(self):
        response = self.client.get(
            "/api/me/", HTTP_AUTHORIZATION="Bearer not-a-real-token"
        )
        self.assertEqual(response.status_code, 401)
