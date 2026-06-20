import re

from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import EmailValidator
from ninja import Schema
from pydantic import ValidationInfo, field_validator
from pydantic_core import PydanticCustomError

USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]+$")


class SignupSchema(Schema):
    """Registration payload with format validation.

    Field validators raise ``PydanticCustomError`` so django-ninja returns a
    standard 422 ``{"detail": [{"loc": [...], "msg": ...}]}`` response that the
    frontend maps to per-field errors. Uniqueness is intentionally *not* checked
    here (that is a database concern handled by the user service).
    """

    username: str
    email: str
    password: str
    confirm_password: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        if len(value) < 3:
            raise PydanticCustomError(
                "username", "Username must be at least 3 characters long"
            )
        if not USERNAME_RE.match(value):
            raise PydanticCustomError(
                "username",
                "Username can only contain letters, numbers, and underscores",
            )
        return value

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        try:
            EmailValidator()(value)
        except DjangoValidationError:
            raise PydanticCustomError("email", "Invalid email address")
        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise PydanticCustomError(
                "password", "Password must be at least 8 characters long"
            )
        if not any(c.isupper() for c in value):
            raise PydanticCustomError(
                "password", "Password must contain at least one uppercase letter"
            )
        if not any(c.islower() for c in value):
            raise PydanticCustomError(
                "password", "Password must contain at least one lowercase letter"
            )
        if not any(c.isdigit() for c in value):
            raise PydanticCustomError(
                "password", "Password must contain at least one number"
            )
        return value

    @field_validator("confirm_password")
    @classmethod
    def validate_passwords_match(cls, value: str, info: ValidationInfo) -> str:
        # `password` is validated first (declared earlier), so it's available in
        # info.data unless it failed its own validation. Validating here (rather
        # than a model_validator) keeps the error's loc on `confirm_password` so
        # the frontend can render it under the matching field.
        password = info.data.get("password")
        if password is not None and value != password:
            raise PydanticCustomError("confirm_password", "Passwords do not match")
        return value
