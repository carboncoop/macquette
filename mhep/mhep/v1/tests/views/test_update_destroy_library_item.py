from freezegun import freeze_time

from rest_framework.test import APITestCase
from rest_framework import status

from ... import VERSION
from ...models import Library
from ..factories import LibraryFactory


class TestUpdateDestroyLibraryItem(APITestCase):
    def test_destroy_library_item(self):
        library = LibraryFactory.create(
            data={"tag1": {"name": "foo"}, "tag2": {"name": "bar"},},
        )

        self.client.force_authenticate(library.owner)
        response = self.client.delete(
            f"/{VERSION}/api/libraries/{library.id}/items/tag2/"
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT

        retrieved = Library.objects.get(id=library.id)
        assert retrieved.data == {"tag1": {"name": "foo"}}

    def test_update_library_item(self):
        library = LibraryFactory.create(data={"tag1": {"name": "foo"},},)

        replacement_data = {
            "name": "bar",
            "other": "data",
        }

        with freeze_time("2019-06-01T16:35:34Z"):
            self.client.force_authenticate(library.owner)
            response = self.client.put(
                f"/{VERSION}/api/libraries/{library.id}/items/tag1/",
                replacement_data,
                format="json",
            )

        assert response.status_code == status.HTTP_204_NO_CONTENT
        retrieved = Library.objects.get(id=library.id)
        assert retrieved.data == {"tag1": replacement_data}

    def test_update_library_item_fails_if_tag_doesnt_exist(self):
        library = LibraryFactory.create()

        replacement_data = {
            "name": "bar",
            "other": "data",
        }

        self.client.force_authenticate(library.owner)

        response = self.client.put(
            f"/{VERSION}/api/libraries/{library.id}/items/tag5/",
            replacement_data,
            format="json",
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
