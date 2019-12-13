from django.conf import settings
from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import decorators
from django.contrib import admin


class UsersConfig(AppConfig):
    name = "mhep.users"
    verbose_name = _("Users")

    def ready(self):
        if settings.USE_AUTH_SERVICE:
            # Force the `admin` sign in process to go through the auth service
            admin.site.login = decorators.login_required(admin.site.login)
