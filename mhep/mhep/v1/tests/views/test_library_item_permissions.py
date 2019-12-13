from rest_framework.test import APITestCase
from rest_framework import status

from mhep.users.tests.factories import UserFactory

from ... import VERSION
from ..factories import LibraryFactory


class CommonMixin:
    def _assert_error(self, response, expected_status, expected_detail):
        assert expected_status == response.status_code
        assert {"detail": expected_detail} == response.json()

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.library = LibraryFactory.create(
            data={"tag1": {"name": "foo"}, "tag2": {"name": "bar"},}
        )


class TestCreateLibraryItemPermissions(CommonMixin, APITestCase):
    def test_owner_can_create_library_item(self):
        self.client.force_authenticate(self.library.owner)

        response = self._call_endpoint(self.library)
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def test_unauthenticated_user_cannot_create_library_item(self):
        response = self._call_endpoint(self.library)
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "Authentication credentials were not provided.",
        )

    def test_user_who_isnt_owner_cannot_create_library_item(self):
        non_owner = UserFactory.create()
        self.client.force_authenticate(non_owner)

        response = self._call_endpoint(self.library)
        self._assert_error(
            response, status.HTTP_404_NOT_FOUND, "Not found.",
        )

    def _call_endpoint(self, library):
        item_data = {"tag": "new_tag", "item": {"name": "bar",}}

        return self.client.post(
            f"/{VERSION}/api/libraries/{self.library.id}/items/",
            item_data,
            format="json",
        )


class TestUpdateLibraryItemPermissions(CommonMixin, APITestCase):
    def test_owner_can_update_library(self):
        self.client.force_authenticate(self.library.owner)

        response = self._call_endpoint(self.library)
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def test_unauthenticated_user_cannot_update_library_item(self):
        response = self._call_endpoint(self.library)
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "Authentication credentials were not provided.",
        )

    def test_user_who_isnt_owner_cannot_update_library_item(self):
        non_owner = UserFactory.create()
        self.client.force_authenticate(non_owner)

        response = self._call_endpoint(self.library)
        self._assert_error(
            response, status.HTTP_404_NOT_FOUND, "Not found.",
        )

    def _call_endpoint(self, library):
        replacement_data = {
            "name": "bar",
            "other": "data",
        }

        return self.client.put(
            f"/{VERSION}/api/libraries/{self.library.id}/items/tag1/",
            replacement_data,
            format="json",
        )


class TestDeleteLibraryItemPermissions(CommonMixin, APITestCase):
    def test_owner_can_delete_library_item(self):
        self.client.force_authenticate(self.library.owner)

        response = self._call_endpoint(self.library)
        assert status.HTTP_204_NO_CONTENT == response.status_code

    def test_unauthenticated_user_cannot_delete_library_item(self):
        response = self._call_endpoint(self.library)
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "Authentication credentials were not provided.",
        )

    def test_user_who_isnt_owner_cannot_delete_library_item(self):
        non_owner = UserFactory.create()
        self.client.force_authenticate(non_owner)

        response = self._call_endpoint(self.library)
        self._assert_error(
            response, status.HTTP_404_NOT_FOUND, "Not found.",
        )

    def _call_endpoint(self, library):
        return self.client.delete(
            f"/{VERSION}/api/libraries/{self.library.id}/items/tag2/"
        )
