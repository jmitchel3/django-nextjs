from helpers.api.auth.controllers import DjangoNextCustomController
from helpers.api.auth.permissions import anon_required, user_or_anon, user_required
from helpers.api.auth.schemas import SignupSchema
from helpers.api.users.schemas import CurrentUserSchema, UserSchema
from helpers.api.users.services import create_user, tokens_for_user
from ninja_extra import NinjaExtraAPI

api = NinjaExtraAPI(auth=user_or_anon)

# adds /token/ pair/refresh/
api.register_controllers(DjangoNextCustomController)


@api.get("/hello/", auth=user_or_anon)
def hello(request):
    return {"message": "Hello World"}


@api.get("/me/", response=CurrentUserSchema, auth=user_required)
def me(request):
    return CurrentUserSchema.from_user(request.user)


@api.post("/signup/", response=UserSchema, auth=anon_required)
def signup(request, payload: SignupSchema):
    user = create_user(
        username=payload.username,
        email=payload.email,
        password=payload.password,
    )
    return UserSchema.from_user(user, tokens_for_user(user))
