from rest_framework.test import APITestCase
from rest_framework import status

from mhep.users.tests.factories import UserFactory

from ... import VERSION
from ..factories import (
    LibraryFactory,
    OrganisationFactory,
)

from .mixins import AssertErrorMixin


class CreateLibraryMixin:
    def create_library(self, *args, **kwargs):
        return LibraryFactory.create(
            data={"tag1": {"name": "foo"}, "tag2": {"name": "bar"}}, *args, **kwargs
        )


class TestCreateLibraryPermissions(AssertErrorMixin, APITestCase):
    def test_authenticated_user_can_create_a_library(self):
        person = UserFactory.create()

        self.client.force_authenticate(person)
        response = self._call_endpoint()
        assert status.HTTP_201_CREATED == response.status_code

    def test_unauthenticated_user_cannot_create_a_library(self):
        response = self._call_endpoint()
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "Authentication credentials were not provided.",
        )

    def _call_endpoint(self):
        new_library = {
            "name": "test library 1",
            "type": "test type 1",
            "data": {"foo": "bar"},
        }

        return self.client.post(
            f"/{VERSION}/api/libraries/", new_library, format="json"
        )


class TestCreateOrganisationLibraryPermissions(AssertErrorMixin, APITestCase):
    def test_librarian_of_organisation_can_create_a_library_in_organisation(self):
        person = UserFactory.create()
        organisation = OrganisationFactory.create()
        organisation.members.add(person)
        organisation.librarians.add(person)

        self.client.force_authenticate(person)
        response = self._call_endpoint(organisation)
        assert status.HTTP_201_CREATED == response.status_code

    def test_member_of_organisation_cannot_create_a_library_in_organisation(self):
        person = UserFactory.create()
        organisation = OrganisationFactory.create()
        organisation.members.add(person)

        self.client.force_authenticate(person)
        response = self._call_endpoint(organisation)
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "You are not a librarian of the Organisation.",
        )

    def test_unauthenticated_user_cannot_create_a_library_in_organisation(self):
        response = self._call_endpoint(OrganisationFactory.create())
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "Authentication credentials were not provided.",
        )

    def test_user_who_isnt_member_cannot_create_a_library_in_organisation(self):
        person = UserFactory.create()
        org_with_no_members = OrganisationFactory.create()

        self.client.force_authenticate(person)
        response = self._call_endpoint(org_with_no_members)
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "You are not a librarian of the Organisation.",
        )

    def _call_endpoint(self, org):
        new_library = {
            "name": "test library 1",
            "type": "test type 1",
            "data": {"foo": "bar"},
        }

        return self.client.post(
            f"/{VERSION}/api/organisations/{org.id}/libraries/",
            new_library,
            format="json",
        )


class TestUpdateLibraryPermissions(AssertErrorMixin, APITestCase):
    def test_owner_user_can_update_library(self):
        library = LibraryFactory.create()
        self.client.force_authenticate(library.owner_user)

        response = self._call_endpoint(library)
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def test_unauthenticated_user_cannot_update_library(self):
        library = LibraryFactory.create()
        response = self._call_endpoint(library)
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "Authentication credentials were not provided.",
        )

    def test_user_who_isnt_owner_cannot_update_library(self):
        non_owner = UserFactory.create()
        self.client.force_authenticate(non_owner)

        response = self._call_endpoint(LibraryFactory.create())
        self._assert_error(
            response, status.HTTP_404_NOT_FOUND, "Not found.",
        )

    def test_librarian_of_organisation_can_update_a_library_in_organisation(self):
        organisation = OrganisationFactory.create()
        library = LibraryFactory.create(
            owner_organisation=organisation, owner_user=None,
        )
        person = UserFactory.create()
        organisation.members.add(person)
        organisation.librarians.add(person)

        self.client.force_authenticate(person)
        response = self._call_endpoint(library)
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def test_member_of_organisation_cannot_update_a_library_in_organisation(self):
        organisation = OrganisationFactory.create()
        library = LibraryFactory.create(
            owner_organisation=organisation, owner_user=None,
        )
        person = UserFactory.create()
        organisation.members.add(person)

        self.client.force_authenticate(person)
        response = self._call_endpoint(library)
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "You do not have permission to perform this action.",
        )

    def test_user_who_isnt_member_cannot_update_a_library_in_organisation(self):
        org_with_no_members = OrganisationFactory.create()
        library = LibraryFactory.create(
            owner_organisation=org_with_no_members, owner_user=None,
        )
        person = UserFactory.create()

        self.client.force_authenticate(person)
        response = self._call_endpoint(library)
        self._assert_error(
            response, status.HTTP_404_NOT_FOUND, "Not found.",
        )

    def test_user_who_is_superuser_can_update_a_global_library(self):
        library = LibraryFactory.create(owner_organisation=None, owner_user=None,)

        self.client.force_authenticate(UserFactory.create(is_superuser=True))

        response = self._call_endpoint(library)
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def test_user_who_isnt_superuser_cannot_update_a_global_library(self):
        library = LibraryFactory.create(owner_organisation=None, owner_user=None,)

        self.client.force_authenticate(UserFactory.create(is_superuser=False))

        response = self._call_endpoint(library)
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "You do not have permission to perform this action.",
        )

    def _call_endpoint(self, library):
        update_fields = {
            "data": {"new": "data"},
        }

        return self.client.patch(
            f"/{VERSION}/api/libraries/{library.id}/", update_fields, format="json",
        )


class TestDeleteLibraryPermissions(AssertErrorMixin, APITestCase):
    def test_owner_user_can_delete_library(self):
        library = LibraryFactory.create()
        self.client.force_authenticate(library.owner_user)

        response = self._call_endpoint(library)
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def test_unauthenticated_user_cannot_delete_library(self):
        response = self._call_endpoint(LibraryFactory.create())
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "Authentication credentials were not provided.",
        )

    def test_user_who_isnt_owner_cannot_delete_library(self):
        non_owner = UserFactory.create()
        self.client.force_authenticate(non_owner)

        response = self._call_endpoint(LibraryFactory.create())
        self._assert_error(
            response, status.HTTP_404_NOT_FOUND, "Not found.",
        )

    def test_librarian_of_organisation_cannot_delete_a_library_in_organisation(self):
        organisation = OrganisationFactory.create()
        library = LibraryFactory.create(
            owner_organisation=organisation, owner_user=None,
        )
        person = UserFactory.create()
        organisation.members.add(person)
        organisation.librarians.add(person)

        self.client.force_authenticate(person)
        response = self._call_endpoint(library)
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def test_member_of_organisation_cannot_delete_a_library_in_organisation(self):
        organisation = OrganisationFactory.create()
        library = LibraryFactory.create(
            owner_organisation=organisation, owner_user=None,
        )
        person = UserFactory.create()
        organisation.members.add(person)

        self.client.force_authenticate(person)
        response = self._call_endpoint(library)
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "You do not have permission to perform this action.",
        )

    def test_user_who_isnt_member_cannot_delete_a_library_in_organisation(self):
        org_with_no_members = OrganisationFactory.create()
        library = LibraryFactory.create(
            owner_organisation=org_with_no_members, owner_user=None,
        )
        person = UserFactory.create()

        self.client.force_authenticate(person)
        response = self._call_endpoint(library)
        self._assert_error(
            response, status.HTTP_404_NOT_FOUND, "Not found.",
        )

    def test_user_who_is_superuser_can_delete_a_global_library(self):
        library = LibraryFactory.create(owner_organisation=None, owner_user=None,)

        self.client.force_authenticate(UserFactory.create(is_superuser=True))

        response = self._call_endpoint(library)
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def test_user_who_isnt_superuser_cannot_delete_a_global_library(self):
        library = LibraryFactory.create(owner_organisation=None, owner_user=None,)

        self.client.force_authenticate(UserFactory.create(is_superuser=False))

        response = self._call_endpoint(library)
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "You do not have permission to perform this action.",
        )

    def _call_endpoint(self, library):
        return self.client.delete(f"/{VERSION}/api/libraries/{library.id}/")


class TestCreateLibraryItemPermissions(
    CreateLibraryMixin, AssertErrorMixin, APITestCase
):
    def test_owner_can_create_library_item(self):
        library = self.create_library()
        self.client.force_authenticate(library.owner_user)

        response = self._call_endpoint(library)
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def test_unauthenticated_user_cannot_create_library_item(self):
        library = self.create_library()
        response = self._call_endpoint(library)
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "Authentication credentials were not provided.",
        )

    def test_user_who_isnt_owner_cannot_create_library_item(self):
        non_owner = UserFactory.create()
        self.client.force_authenticate(non_owner)

        response = self._call_endpoint(self.create_library())
        self._assert_error(
            response, status.HTTP_404_NOT_FOUND, "Not found.",
        )

    def test_librarian_of_organisation_can_create_a_library_item_in_organisation(self):
        organisation = OrganisationFactory.create()
        library = self.create_library(owner_organisation=organisation, owner_user=None,)
        person = UserFactory.create()
        organisation.members.add(person)
        organisation.librarians.add(person)

        self.client.force_authenticate(person)
        response = self._call_endpoint(library)
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def test_member_of_organisation_cannot_create_a_library_item_in_organisation(self):
        organisation = OrganisationFactory.create()
        library = self.create_library(owner_organisation=organisation, owner_user=None,)
        person = UserFactory.create()
        organisation.members.add(person)

        self.client.force_authenticate(person)
        response = self._call_endpoint(library)
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "You do not have permission to perform this action.",
        )

    def test_user_who_isnt_member_cannot_create_a_library_item_in_organisation(self):
        org_with_no_members = OrganisationFactory.create()
        library = self.create_library(
            owner_organisation=org_with_no_members, owner_user=None,
        )
        person = UserFactory.create()

        self.client.force_authenticate(person)
        response = self._call_endpoint(library)
        self._assert_error(
            response, status.HTTP_404_NOT_FOUND, "Not found.",
        )

    def test_user_who_is_superuser_can_create_item_in_global_library(self):
        library = self.create_library(owner_organisation=None, owner_user=None,)

        self.client.force_authenticate(UserFactory.create(is_superuser=True))

        response = self._call_endpoint(library)
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def test_user_who_isnt_superuser_cannot_create_item_in_global_library(self):
        library = LibraryFactory.create(owner_organisation=None, owner_user=None,)

        self.client.force_authenticate(UserFactory.create(is_superuser=False))

        response = self._call_endpoint(library)
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "You do not have permission to perform this action.",
        )

    def _call_endpoint(self, library):
        item_data = {"tag": "new_tag", "item": {"name": "bar",}}

        return self.client.post(
            f"/{VERSION}/api/libraries/{library.id}/items/", item_data, format="json"
        )


class TestUpdateLibraryItemPermissions(
    CreateLibraryMixin, AssertErrorMixin, APITestCase
):
    def test_owner_can_update_library(self):
        library = self.create_library()
        self.client.force_authenticate(library.owner_user)

        response = self._call_endpoint(library)
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def test_unauthenticated_user_cannot_update_library_item(self):
        response = self._call_endpoint(self.create_library())
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "Authentication credentials were not provided.",
        )

    def test_user_who_isnt_owner_cannot_update_library_item(self):
        non_owner = UserFactory.create()
        self.client.force_authenticate(non_owner)

        response = self._call_endpoint(self.create_library())
        self._assert_error(
            response, status.HTTP_404_NOT_FOUND, "Not found.",
        )

    def test_librarian_of_organisation_can_update_a_library_item_in_organisation(self):
        organisation = OrganisationFactory.create()
        library = self.create_library(owner_organisation=organisation, owner_user=None,)
        person = UserFactory.create()
        organisation.members.add(person)
        organisation.librarians.add(person)

        self.client.force_authenticate(person)
        response = self._call_endpoint(library)
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def test_member_of_organisation_cannot_update_a_library_item_in_organisation(self):
        organisation = OrganisationFactory.create()
        library = self.create_library(owner_organisation=organisation, owner_user=None,)
        person = UserFactory.create()
        organisation.members.add(person)

        self.client.force_authenticate(person)
        response = self._call_endpoint(library)
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "You do not have permission to perform this action.",
        )

    def test_user_who_isnt_member_cannot_update_a_library_item_in_organisation(self):
        org_with_no_members = OrganisationFactory.create()
        library = self.create_library(
            owner_organisation=org_with_no_members, owner_user=None,
        )
        person = UserFactory.create()

        self.client.force_authenticate(person)
        response = self._call_endpoint(library)
        self._assert_error(
            response, status.HTTP_404_NOT_FOUND, "Not found.",
        )

    def test_user_who_is_superuser_can_update_item_in_global_library(self):
        library = self.create_library(owner_organisation=None, owner_user=None,)

        self.client.force_authenticate(UserFactory.create(is_superuser=True))

        response = self._call_endpoint(library)
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def test_user_who_isnt_superuser_cannot_update_item_in_global_library(self):
        library = self.create_library(owner_organisation=None, owner_user=None,)

        self.client.force_authenticate(UserFactory.create(is_superuser=False))

        response = self._call_endpoint(library)
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "You do not have permission to perform this action.",
        )

    def _call_endpoint(self, library):
        replacement_data = {
            "name": "bar",
            "other": "data",
        }

        return self.client.put(
            f"/{VERSION}/api/libraries/{library.id}/items/tag1/",
            replacement_data,
            format="json",
        )


class TestDeleteLibraryItemPermissions(
    CreateLibraryMixin, AssertErrorMixin, APITestCase
):
    def test_owner_can_delete_library_item(self):
        library = self.create_library()
        self.client.force_authenticate(library.owner_user)

        response = self._call_endpoint(library)
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def test_unauthenticated_user_cannot_delete_library_item(self):
        response = self._call_endpoint(self.create_library())
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "Authentication credentials were not provided.",
        )

    def test_user_who_isnt_owner_cannot_delete_library_item(self):
        non_owner = UserFactory.create()
        self.client.force_authenticate(non_owner)

        response = self._call_endpoint(self.create_library())
        self._assert_error(
            response, status.HTTP_404_NOT_FOUND, "Not found.",
        )

    def test_librarian_of_organisation_can_delete_a_library_item_in_organisation(self):
        organisation = OrganisationFactory.create()
        library = self.create_library(owner_organisation=organisation, owner_user=None,)
        person = UserFactory.create()
        organisation.members.add(person)
        organisation.librarians.add(person)

        self.client.force_authenticate(person)
        response = self._call_endpoint(library)
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def test_member_of_organisation_can_delete_a_library_item_in_organisation(self):
        organisation = OrganisationFactory.create()
        library = self.create_library(owner_organisation=organisation, owner_user=None,)
        person = UserFactory.create()
        organisation.members.add(person)

        self.client.force_authenticate(person)
        response = self._call_endpoint(library)
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "You do not have permission to perform this action.",
        )

    def test_user_who_isnt_member_cannot_delete_a_library_item_in_organisation(self):
        org_with_no_members = OrganisationFactory.create()
        library = self.create_library(
            owner_organisation=org_with_no_members, owner_user=None,
        )
        person = UserFactory.create()

        self.client.force_authenticate(person)
        response = self._call_endpoint(library)
        self._assert_error(
            response, status.HTTP_404_NOT_FOUND, "Not found.",
        )

    def test_user_who_is_superuser_can_delete_item_in_global_library(self):
        library = self.create_library(owner_organisation=None, owner_user=None,)

        self.client.force_authenticate(UserFactory.create(is_superuser=True))

        response = self._call_endpoint(library)
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def test_user_who_isnt_superuser_cannot_delete_item_in_global_library(self):
        library = self.create_library(owner_organisation=None, owner_user=None,)

        self.client.force_authenticate(UserFactory.create(is_superuser=False))

        response = self._call_endpoint(library)
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "You do not have permission to perform this action.",
        )

    def _call_endpoint(self, library):
        return self.client.delete(f"/{VERSION}/api/libraries/{library.id}/items/tag2/")
