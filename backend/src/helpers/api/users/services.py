"""User-related business logic kept out of the API layer.

The API endpoints stay thin: parse a schema, call one of these helpers, return a
response. Database concerns (uniqueness, password policy, token issuance) live
here so they are enforced for every code path that creates a user.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from ninja.errors import HttpError
from ninja_jwt.tokens import RefreshToken

# NOTE: Django's default ``auth.User`` enforces a UNIQUE constraint on
# ``username`` but NOT on ``email``. The email check below is therefore
# best-effort: a narrow race between two concurrent signups with the same email
# can still create duplicates. Closing that fully requires a custom user model
# with ``unique=True`` on email, which is intentionally out of scope here.

TAKEN_MESSAGE = "Username and/or email are not available. Please try again"


def username_or_email_taken(username: str, email: str) -> bool:
    User = get_user_model()
    return (
        User.objects.filter(username__iexact=username).exists()
        or User.objects.filter(email__iexact=email).exists()
    )


def create_user(*, username: str, email: str, password: str):
    """Create an active user.

    Enforces uniqueness, the project's configured ``AUTH_PASSWORD_VALIDATORS``,
    and the DB-level username constraint (as a race-safe backstop). Raises
    ``HttpError(400)`` with a user-facing message on any of these.
    """
    User = get_user_model()

    if username_or_email_taken(username, email):
        raise HttpError(400, TAKEN_MESSAGE)

    # Run the project's configured password validators (common-password,
    # all-numeric, similarity-to-user, etc.) against an unsaved instance.
    try:
        validate_password(password, User(username=username, email=email))
    except ValidationError as exc:
        raise HttpError(400, " ".join(exc.messages))

    try:
        with transaction.atomic():
            return User.objects.create_user(
                username=username,
                email=email,
                password=password,
                is_active=True,
            )
    except IntegrityError:
        # Lost the race on the UNIQUE(username) constraint.
        raise HttpError(400, TAKEN_MESSAGE)


def tokens_for_user(user) -> dict:
    """Return a fresh access/refresh token pair for ``user``."""
    refresh = RefreshToken.for_user(user)
    return {
        "access_token": str(refresh.access_token),
        "refresh_token": str(refresh),
    }
