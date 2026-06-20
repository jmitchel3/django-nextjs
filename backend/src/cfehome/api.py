from helpers.api.auth.controllers import DjangoNextCustomController
from helpers.api.auth.permissions import anon_required, user_or_anon
from helpers.api.auth.schemas import SignupSchema
from helpers.api.users.schemas import UserSchema
from helpers.api.users.services import create_user, tokens_for_user
from ninja_extra import NinjaExtraAPI

api = NinjaExtraAPI(auth=user_or_anon)

# adds /token/ pair/refresh/
api.register_controllers(DjangoNextCustomController)


@api.get("/hello/", auth=user_or_anon)
def hello(request):
    return {"message": "Hello World"}


@api.post("/signup/", response=UserSchema, auth=anon_required)
def signup(request, payload: SignupSchema):
    user = create_user(
        username=payload.username,
        email=payload.email,
        password=payload.password,
    )
    return UserSchema.from_user(user, tokens_for_user(user))
