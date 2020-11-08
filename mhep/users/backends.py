import logging
from urllib import request

from jose import jwt
from social_core.backends import auth0
from social_django.middleware import SocialAuthExceptionMiddleware

logger = logging.getLogger(__name__)


class ExceptionMiddleware(SocialAuthExceptionMiddleware):
    """
    Override the social_auth middleware to behave in the way we want things to behave.

    c.f. https://github.com/python-social-auth/social-app-django/blob/master/social_django/middleware.py
    """

    def raise_exception(self, request, exception):
        """
        Never raise an exception - but do log it.  Logging will go to Sentry, the user
        will always be redirected to the error page.

        This is useful because the default behaviour is to change behaviour based on
        settings.DEBUG - if it's turned on, exceptions will be raised, and so it's
        impossible to test the login error page on a development setup as you end up
        on Django exception catching page.
        """
        logging.exception(exception)
        return False


class Auth0(auth0.Auth0OAuth2):
    """
    Auth0 OAuth authentication backend

    Base class:
    https://github.com/python-social-auth/social-core/blob/master/social_core/backends/auth0.py
    """

    ROLES_CLAIM_URL = "https://carbon.coop/auth/roles"
    GROUPS_CLAIM_URL = "https://carbon.coop/auth/groups"

    # See extra_data at:
    # https://python-social-auth.readthedocs.io/en/latest/configuration/django.html#personalized-configuration
    def extra_data(self, user, uid, response, details=None, *args, **kwargs):
        """Return roles and groups to store in extra_data field"""
        data = super().extra_data(user, uid, response, details=details, *args, **kwargs)

        data["roles"] = details["authorization.roles"]
        data["groups"] = details["authorization.groups"]

        user.is_staff = "mhep:staff" in data["roles"]
        user.is_superuser = "mhep:superuser" in data["roles"]
        user.save()

        return data

    def get_user_details(self, response):
        # Obtain JWT and the keys to validate the signature
        id_token = response.get("id_token")
        jwks = request.urlopen(
            "https://" + self.setting("DOMAIN") + "/.well-known/jwks.json"
        )
        issuer = "https://" + self.setting("DOMAIN") + "/"
        audience = self.setting("KEY")  # CLIENT_ID
        payload = jwt.decode(
            id_token,
            jwks.read(),
            algorithms=["RS256"],
            audience=audience,
            issuer=issuer,
        )
        fullname, first_name, last_name = self.get_user_names(payload["name"])

        return {
            "username": payload["nickname"],
            "email": payload.get("email", False),
            "email_verified": payload.get("email_verified", False),
            "fullname": fullname,
            "first_name": first_name,
            "last_name": last_name,
            "user_id": payload["sub"],
            "authorization.roles": payload.get(self.ROLES_CLAIM_URL, []),
            "authorization.groups": payload.get(self.GROUPS_CLAIM_URL, []),
        }
