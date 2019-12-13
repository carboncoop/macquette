from freezegun import freeze_time

from rest_framework.test import APITestCase
from rest_framework import exceptions, status

from ... import VERSION
from ...models import Library
from ..factories import LibraryFactory

from mhep.users.tests.factories import UserFactory


class TestListCreateLibraries(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.me = UserFactory.create()

    def test_list_libraries(self):
        with freeze_time("2019-06-01T16:35:34Z"):
            l1 = LibraryFactory.create(owner=self.me)
            l2 = LibraryFactory.create(owner=self.me)
            LibraryFactory.create(
                owner=UserFactory.create()
            )  # another library (someone else's)

        self.client.force_authenticate(self.me)
        response = self.client.get(f"/{VERSION}/api/libraries/")
        assert response.status_code == status.HTTP_200_OK

        assert 2 == len(response.data)

        assert {
            "id": "{}".format(l1.pk),
            "created_at": "2019-06-01T16:35:34Z",
            "updated_at": "2019-06-01T16:35:34Z",
            "name": l1.name,
            "type": l1.type,
            "writeable": True,
            "data": l1.data,
        } == response.data[0]

        assert {
            "id": "{}".format(l2.pk),
            "created_at": "2019-06-01T16:35:34Z",
            "updated_at": "2019-06-01T16:35:34Z",
            "name": l2.name,
            "type": l2.type,
            "writeable": True,
            "data": l2.data,
        } == response.data[1]

    def test_list_libraries_fails_if_not_logged_in(self):
        LibraryFactory.create(owner=self.me)
        LibraryFactory.create(owner=self.me)

        response = self.client.get(f"/{VERSION}/api/libraries/")
        assert status.HTTP_403_FORBIDDEN == response.status_code

    def test_create_library(self):

        with self.subTest("a valid library"):
            new_library = {
                "name": "test library 1",
                "type": "test type 1",
                "data": {"foo": "bar"},
            }

            self.client.force_authenticate(self.me)
            with freeze_time("2019-06-01T16:35:34Z"):
                response = self.client.post(
                    f"/{VERSION}/api/libraries/", new_library, format="json"
                )

            assert response.status_code == status.HTTP_201_CREATED

            expected_result = {
                "created_at": "2019-06-01T16:35:34Z",
                "updated_at": "2019-06-01T16:35:34Z",
                "name": "test library 1",
                "type": "test type 1",
                "writeable": True,
                "data": {"foo": "bar"},
            }

            assert "id" in response.data
            response.data.pop("id")
            assert expected_result == response.data

        with self.subTest("a library with data as a string"):
            new_library = {
                "name": "test library 1",
                "type": "test type 1",
                "data": "foo string",
            }

            self.client.force_authenticate(self.me)

            with freeze_time("2019-06-01T16:35:34Z"):
                response = self.client.post(
                    f"/{VERSION}/api/libraries/", new_library, format="json"
                )

            assert status.HTTP_400_BAD_REQUEST == response.status_code
            assert {
                "data": [
                    exceptions.ErrorDetail(
                        string="This field is not a dict.", code="invalid"
                    )
                ]
            } == response.data

    def test_create_library_has_logged_in_user_as_owner(self):
        new_library = {
            "name": "test library 1",
            "type": "test type 1",
            "data": {"foo": "bar"},
        }

        self.client.force_authenticate(self.me)

        with freeze_time("2019-06-01T16:35:34Z"):
            response = self.client.post(
                f"/{VERSION}/api/libraries/", new_library, format="json"
            )

        assert response.status_code == status.HTTP_201_CREATED

        assert "id" in response.data
        new_id = response.data.pop("id")

        retrieved = Library.objects.get(id=new_id)
        assert self.me == retrieved.owner
