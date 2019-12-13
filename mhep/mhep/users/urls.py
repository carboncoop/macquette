from django.conf import settings
from django.urls import include
from django.urls import path

from . import views

# User management
if settings.USE_AUTH_SERVICE:

    urlpatterns = [
        path("", include("social_django.urls")),
        path("logout/", views.logout, name="logout"),
        path("log_in/", views.Login.as_view(), name="login"),
        path("login-error/", views.LoginError.as_view(), name="login-error"),
    ]
else:
    urlpatterns = [path("", include("django.contrib.auth.urls"))]
