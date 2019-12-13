from django.urls import path, reverse_lazy
from django.views.generic.base import RedirectView

from . import VERSION

from .views import (
    AssessmentHTMLView,
    CreateUpdateDeleteLibraryItem,
    ListAssessmentsHTMLView,
    ListCreateAssessments,
    ListCreateLibraries,
    ListCreateOrganisationAssessments,
    ListOrganisations,
    RetrieveUpdateDestroyAssessment,
    UpdateDestroyLibrary,
)

app_name = "assessments"
urlpatterns = [
    path(
        "",
        RedirectView.as_view(url=reverse_lazy(f"{VERSION}:list-assessments")),
        name="index",
    ),
    path("assessments/", ListAssessmentsHTMLView.as_view(), name="list-assessments",),
    path(
        "assessments/<int:pk>/", AssessmentHTMLView.as_view(), name="view-assessment",
    ),
    path(
        "api/assessments/",
        view=ListCreateAssessments.as_view(),
        name="list-create-assessments",
    ),
    path(
        "api/assessments/<int:pk>/",
        view=RetrieveUpdateDestroyAssessment.as_view(),
        name="retrieve-update-destroy-assessment",
    ),
    path(
        "api/libraries/",
        view=ListCreateLibraries.as_view(),
        name="list-create-libraries",
    ),
    path(
        "api/libraries/<int:pk>/",
        view=UpdateDestroyLibrary.as_view(),
        name="update-destroy-library",
    ),
    path(
        "api/organisations/",
        view=ListOrganisations.as_view(),
        name="list-organisations",
    ),
    path(
        "api/organisations/<int:pk>/assessments/",
        view=ListCreateOrganisationAssessments.as_view(),
        name="list-create-organisation-assessments",
    ),
    path(
        "api/libraries/<int:pk>/items/",
        view=CreateUpdateDeleteLibraryItem.as_view(),
        name="create-update-delete-library-item",
    ),
    path(
        "api/libraries/<int:pk>/items/<str:tag>/",
        view=CreateUpdateDeleteLibraryItem.as_view(),
        name="create-update-delete-library-item",
    ),
]
