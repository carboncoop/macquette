from django.conf import settings
from django.contrib.auth import logout as django_logout
from django.http import HttpResponseRedirect
from django.views.generic import TemplateView
from django.views.generic.base import RedirectView


def logout(request):
    django_logout(request)
    domain = settings.SOCIAL_AUTH_AUTH0_DOMAIN
    client_id = settings.SOCIAL_AUTH_AUTH0_KEY
    return_to = settings.SITE_URL
    return HttpResponseRedirect(
        f"https://{domain}/v2/logout?client_id={client_id}&returnTo={return_to}"
    )


class Login(RedirectView):
    url = settings.LOGIN_URL


class LoginError(TemplateView):
    template_name = "registration/login_error.html"
