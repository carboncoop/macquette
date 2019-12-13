import pytest

# from django.conf import settings
from django.urls import reverse, resolve

from ..models import Assessment, Library
from .. import VERSION

pytestmark = pytest.mark.django_db


def test_assessments_home():
    assert reverse(f"{VERSION}:list-assessments") == f"/{VERSION}/assessments/"
    assert (
        resolve(f"/{VERSION}/assessments/").view_name == f"{VERSION}:list-assessments"
    )


def test_list_create_assessments(assessment: Assessment):
    assert (
        reverse(f"{VERSION}:list-create-assessments") == f"/{VERSION}/api/assessments/"
    )
    assert (
        resolve(f"/{VERSION}/api/assessments/").view_name
        == f"{VERSION}:list-create-assessments"
    )


def test_assessment_detail_update_destroy(assessment: Assessment):
    assert (
        reverse(
            f"{VERSION}:retrieve-update-destroy-assessment",
            kwargs={"pk": assessment.id},
        )
        == f"/{VERSION}/api/assessments/{assessment.id}/"
    )
    assert (
        resolve(f"/{VERSION}/api/assessments/{assessment.id}/").view_name
        == f"{VERSION}:retrieve-update-destroy-assessment"
    )


def test_list_create_libraries():
    assert reverse(f"{VERSION}:list-create-libraries") == f"/{VERSION}/api/libraries/"
    assert (
        resolve(f"/{VERSION}/api/libraries/").view_name
        == f"{VERSION}:list-create-libraries"
    )


def test_update_destroy_library(library: Library):
    assert (
        reverse(f"{VERSION}:update-destroy-library", kwargs={"pk": library.id})
        == f"/{VERSION}/api/libraries/{library.id}/"
    )
    assert (
        resolve(f"/{VERSION}/api/libraries/{library.id}/").view_name
        == f"{VERSION}:update-destroy-library"
    )


def test_create_library_item(library: Library):
    assert (
        reverse(
            f"{VERSION}:create-update-delete-library-item", kwargs={"pk": library.id}
        )
        == f"/{VERSION}/api/libraries/{library.id}/items/"
    )
    assert (
        resolve(f"/{VERSION}/api/libraries/{library.id}/items/").view_name
        == f"{VERSION}:create-update-delete-library-item"
    )


def test_update_destroy_library_item(library: Library):
    tag = "SW_01"

    assert (
        reverse(
            f"{VERSION}:create-update-delete-library-item",
            kwargs={"pk": library.id, "tag": tag},
        )
        == f"/{VERSION}/api/libraries/{library.id}/items/{tag}/"
    )
    assert (
        resolve(f"/{VERSION}/api/libraries/{library.id}/items/{tag}/").view_name
        == f"{VERSION}:create-update-delete-library-item"
    )


def test_list_organisations():
    assert reverse(f"{VERSION}:list-organisations") == f"/{VERSION}/api/organisations/"
    assert (
        resolve(f"/{VERSION}/api/organisations/").view_name
        == f"{VERSION}:list-organisations"
    )


def test_list_create_organisation_assessments():
    assert (
        reverse(f"{VERSION}:list-create-organisation-assessments", kwargs={"pk": 1})
        == f"/{VERSION}/api/organisations/1/assessments/"
    )
    assert (
        resolve(f"/{VERSION}/api/organisations/1/assessments/").view_name
        == f"{VERSION}:list-create-organisation-assessments"
    )
