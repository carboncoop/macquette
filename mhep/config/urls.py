from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include
from django.urls import path
from django.urls import reverse_lazy
from django.views import defaults as default_views
from django.views.generic.base import RedirectView

admin.site.site_header = "My Home Energy Planner administration"
admin.site.site_title = "Django admin"
admin.site.index_title = "My Home Energy Planner administration"

if settings.ENV == "production":
    DEFAULT_ROUTE = "v2:list-assessments"
else:
    DEFAULT_ROUTE = "dev:list-assessments"

urlpatterns = [
    # Django Admin, use {% url 'admin:index' %}
    path(settings.ADMIN_URL, admin.site.urls),
    # Login stuff
    path("", include("mhep.users.urls")),
    # Your stuff: custom urls includes go here
    path("", RedirectView.as_view(url=reverse_lazy(DEFAULT_ROUTE)), name="index"),
    # Add app versions after this line
    path("v2/", include("mhep.v2.urls", namespace="v2")),
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
