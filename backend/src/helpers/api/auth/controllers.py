from ninja_extra import api_controller, http_post
from ninja_jwt.controller import TokenObtainPairController
from ninja_jwt.schema_control import SchemaControl
from ninja_jwt.settings import api_settings

schema = SchemaControl(api_settings)


class DjangoNextTokenObtainPairController(TokenObtainPairController):
    @http_post(
        "/pair/",
        response=schema.obtain_pair_schema.get_response_schema(),
        url_name="token_obtain_pair_slash",
        operation_id="token_obtain_pair",
    )
    def obtain_token(self, user_token: schema.obtain_pair_schema):
        user_token.check_user_authentication_rule()
        return user_token.to_response_schema()

    @http_post(
        "/refresh/",
        response=schema.obtain_pair_refresh_schema.get_response_schema(),
        url_name="token_refresh_slash",
        operation_id="token_refresh",
    )
    def refresh_token(self, refresh_token: schema.obtain_pair_refresh_schema):
        return refresh_token.to_response_schema()


@api_controller("token", tags=["Auth"])
class DjangoNextCustomController(DjangoNextTokenObtainPairController):
    """obtain token and refresh_token with support for trailing slashes"""
