from django.urls import path

from mhep.versions.views import ListVersionsView

app_name = "versions"

urlpatterns = [path("", ListVersionsView.as_view(), name="list-versions")]
