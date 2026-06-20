from ninja import Schema


class UserSchema(Schema):
    """Authenticated user payload returned after signup/login."""

    username: str
    email: str | None
    is_authenticated: bool
    access_token: str | None
    refresh_token: str | None

    @classmethod
    def from_user(cls, user, tokens: dict) -> "UserSchema":
        return cls(
            username=user.username,
            email=user.email,
            is_authenticated=True,
            access_token=tokens.get("access_token"),
            refresh_token=tokens.get("refresh_token"),
        )
