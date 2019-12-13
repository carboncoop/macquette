from rest_framework.test import APITestCase
from rest_framework import status

from ... import VERSION
from ..factories import LibraryFactory


class TestCreateLibraryItem(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.library = LibraryFactory.create(data={"tag1": {"name": "foo"}})

    def test_create_library_item(self):
        item_data = {"tag": "tag2", "item": {"name": "bar",}}

        self.client.force_authenticate(self.library.owner)
        response = self.client.post(
            f"/{VERSION}/api/libraries/{self.library.id}/items/",
            item_data,
            format="json",
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_create_library_item_fails_if_tag_already_exists(self):
        item_data = {"tag": "tag1", "item": {"name": "bar",}}

        self.client.force_authenticate(self.library.owner)
        response = self.client.post(
            f"/{VERSION}/api/libraries/{self.library.id}/items/",
            item_data,
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data == {
            "detail": f"tag `tag1` already exists in library {self.library.id}"
        }
