from ninja import Schema


class CurrentUserSchema(Schema):
    """The authenticated user's public profile (no tokens)."""

    username: str
    email: str | None
    is_authenticated: bool

    @classmethod
    def from_user(cls, user) -> "CurrentUserSchema":
        return cls(
            username=user.username,
            email=user.email,
            is_authenticated=True,
        )


class UserSchema(CurrentUserSchema):
    """Profile plus a freshly issued token pair, returned after signup/login."""

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
