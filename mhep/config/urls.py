from django.conf import settings
from django.urls import include, path, reverse_lazy
from django.conf.urls.static import static
from django.contrib import admin
from django.views.generic.base import RedirectView
from django.views import defaults as default_views

admin.site.site_header = "My Home Energy Planner administration"
admin.site.site_title = "Django admin"
admin.site.index_title = "My Home Energy Planner administration"

urlpatterns = [
    # Django Admin, use {% url 'admin:index' %}
    path(settings.ADMIN_URL, admin.site.urls),
    # User management
    path("users/", include("mhep.users.urls", namespace="users")),
    path("accounts/", include("allauth.urls")),
    # Your stuff: custom urls includes go here
    path(
        "", RedirectView.as_view(url=reverse_lazy("v1:list-assessments")), name="index"
    ),
    # Add app versions after this line
    path("dev/", include("mhep.dev.urls", namespace="dev")),
    path("v1/", include("mhep.v1.urls", namespace="v1")),
    path("versions/", include("mhep.versions.urls", namespace="versions")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.DEBUG:
    # This allows the error pages to be debugged during development, just visit
    # these url in browser to see how these error pages look like.
    urlpatterns += [
        path(
            "400/",
            default_views.bad_request,
            kwargs={"exception": Exception("Bad Request!")},
        ),
        path(
            "403/",
            default_views.permission_denied,
            kwargs={"exception": Exception("Permission Denied")},
        ),
        path(
            "404/",
            default_views.page_not_found,
            kwargs={"exception": Exception("Page not Found")},
        ),
        path("500/", default_views.server_error),
    ]
    if "debug_toolbar" in settings.INSTALLED_APPS:
        import debug_toolbar

        urlpatterns = [path("__debug__/", include(debug_toolbar.urls))] + urlpatterns
