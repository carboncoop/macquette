from freezegun import freeze_time

from rest_framework.test import APITestCase
from rest_framework import status

from ... import VERSION
from ...models import Library
from ..factories import LibraryFactory

from mhep.users.tests.factories import UserFactory


class TestUpdateLibrary(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.me = UserFactory.create()

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        Library.objects.all().delete()

    def test_update_library(self):
        with freeze_time("2019-06-01T16:35:34Z"):
            lib = LibraryFactory.create(owner=self.me)

        with freeze_time("2019-07-13T12:10:12Z"):
            updateFields = {
                "data": {"new": "data"},
            }

            self.client.force_authenticate(self.me)

            response = self.client.patch(
                f"/{VERSION}/api/libraries/{lib.pk}/", updateFields, format="json",
            )

        assert status.HTTP_204_NO_CONTENT == response.status_code
        assert b"" == response.content

        updated_library = Library.objects.get(pk=lib.pk)

        assert {"new": "data"} == updated_library.data

        assert "2019-07-13T12:10:12+00:00" == updated_library.updated_at.isoformat()

    def test_update_library_name(self):
        with freeze_time("2019-06-01T16:35:34Z"):
            lib = LibraryFactory.create(owner=self.me)

        with freeze_time("2019-07-13T12:10:12Z"):
            updateFields = {
                "name": "updated name",
            }

            self.client.force_authenticate(self.me)
            response = self.client.patch(
                f"/{VERSION}/api/libraries/{lib.pk}/", updateFields, format="json",
            )

        assert status.HTTP_204_NO_CONTENT == response.status_code
        assert b"" == response.content

        updated_library = Library.objects.get(pk=lib.pk)

        assert "updated name" == updated_library.name

    def test_destroy_library(self):
        lib = LibraryFactory.create(owner=self.me)

        assessment_count = Library.objects.count()

        self.client.force_authenticate(self.me)
        response = self.client.delete(f"/{VERSION}/api/libraries/{lib.pk}/")

        assert status.HTTP_204_NO_CONTENT == response.status_code
        assert b"" == response.content

        assert (assessment_count - 1) == Library.objects.count()
