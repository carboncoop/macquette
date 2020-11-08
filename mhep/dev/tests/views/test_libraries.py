from freezegun import freeze_time
from rest_framework import exceptions
from rest_framework import status
from rest_framework.test import APITestCase

from ... import VERSION
from ...models import Library
from ..factories import LibraryFactory
from ..factories import OrganisationFactory
from mhep.users.tests.factories import UserFactory


class TestListLibraries(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.me = UserFactory.create()

    def test_returns_libraries_in_correct_format(self):
        with freeze_time("2019-06-01T16:35:34Z"):
            l1 = LibraryFactory.create(owner_user=self.me)
            l2 = LibraryFactory.create(owner_user=self.me)
            global_lib = LibraryFactory.create(owner_user=None, owner_organisation=None)
            LibraryFactory.create(
                owner_user=UserFactory.create()
            )  # another library (someone else's)

        self.client.force_authenticate(self.me)
        response = self.client.get(f"/{VERSION}/api/libraries/")
        assert response.status_code == status.HTTP_200_OK

        assert 3 == len(response.data)

        assert {
            "id": "{}".format(l1.pk),
            "created_at": "2019-06-01T16:35:34Z",
            "updated_at": "2019-06-01T16:35:34Z",
            "name": l1.name,
            "type": l1.type,
            "permissions": {"can_write": True, "can_share": False},
            "data": l1.data,
            "owner": {
                "id": f"{self.me.id}",
                "name": f"{self.me.username}",
                "type": "personal",
            },
        } == response.data[0]

        assert {
            "id": "{}".format(l2.pk),
            "created_at": "2019-06-01T16:35:34Z",
            "updated_at": "2019-06-01T16:35:34Z",
            "name": l2.name,
            "type": l2.type,
            "permissions": {"can_write": True, "can_share": False},
            "data": l2.data,
            "owner": {
                "id": f"{self.me.id}",
                "name": f"{self.me.username}",
                "type": "personal",
            },
        } == response.data[1]

        assert {
            "id": "{}".format(global_lib.pk),
            "created_at": "2019-06-01T16:35:34Z",
            "updated_at": "2019-06-01T16:35:34Z",
            "name": global_lib.name,
            "type": global_lib.type,
            "permissions": {"can_write": False, "can_share": False},
            "data": global_lib.data,
            "owner": {"id": None, "name": "Global", "type": "global"},
        } == response.data[2]

    def test_includes_libraries_from_my_organisations(self):
        my_lib = LibraryFactory.create(owner_user=self.me, owner_organisation=None)

        org1 = OrganisationFactory.create()
        org1.members.add(self.me)
        org_lib_1 = LibraryFactory.create(owner_organisation=org1, owner_user=None)

        org2 = OrganisationFactory.create()
        org2.members.add(self.me)
        org_lib_2 = LibraryFactory.create(owner_organisation=org2, owner_user=None)

        other_org = OrganisationFactory.create()  # not a member of this org
        other_lib = LibraryFactory.create(owner_organisation=other_org, owner_user=None)

        self.client.force_authenticate(self.me)
        response = self.client.get(f"/{VERSION}/api/libraries/")
        assert response.status_code == status.HTTP_200_OK

        assert 3 == len(response.data)

        retrieved_ids = [int(row["id"]) for row in response.data]

        assert my_lib.id in retrieved_ids
        assert org_lib_1.id in retrieved_ids
        assert org_lib_2.id in retrieved_ids
        assert other_lib.id not in retrieved_ids

    def test_includes_global_libraries_with_no_owner(self):
        global_lib = LibraryFactory.create(owner_organisation=None, owner_user=None)

        self.client.force_authenticate(self.me)
        response = self.client.get(f"/{VERSION}/api/libraries/")
        assert response.status_code == status.HTTP_200_OK

        assert 1 == len(response.data)

        retrieved_ids = [int(row["id"]) for row in response.data]

        assert global_lib.id in retrieved_ids

    def test_includes_libraries_shared_with_my_organisation(self):
        my_org = OrganisationFactory.create()
        sharing_org = OrganisationFactory.create()

        my_org.members.add(self.me)

        shared_lib = LibraryFactory.create(
            owner_organisation=sharing_org, owner_user=None
        )
        shared_lib.shared_with.add(my_org)

        self.client.force_authenticate(self.me)
        response = self.client.get(f"/{VERSION}/api/libraries/")
        assert response.status_code == status.HTTP_200_OK

        assert 1 == len(response.data)

        retrieved_ids = [int(row["id"]) for row in response.data]

        assert shared_lib.id in retrieved_ids

    def test_can_write_is_false_for_org_librarian(self):
        my_org = OrganisationFactory.create()
        my_org.members.add(self.me)
        my_org.librarians.add(self.me)
        LibraryFactory.create(owner_organisation=my_org, owner_user=None)

        self.client.force_authenticate(self.me)
        response = self.client.get(f"/{VERSION}/api/libraries/")
        assert response.status_code == status.HTTP_200_OK

        assert True is response.data[0]["permissions"]["can_write"]

    def test_can_write_is_false_for_org_admin_not_librarian(self):
        my_org = OrganisationFactory.create()
        my_org.members.add(self.me)
        my_org.admins.add(self.me)
        LibraryFactory.create(owner_organisation=my_org, owner_user=None)

        self.client.force_authenticate(self.me)
        response = self.client.get(f"/{VERSION}/api/libraries/")
        assert response.status_code == status.HTTP_200_OK

        assert False is response.data[0]["permissions"]["can_write"]

    def test_can_write_is_false_for_org_member(self):
        my_org = OrganisationFactory.create()
        my_org.members.add(self.me)
        LibraryFactory.create(owner_organisation=my_org, owner_user=None)

        self.client.force_authenticate(self.me)
        response = self.client.get(f"/{VERSION}/api/libraries/")
        assert response.status_code == status.HTTP_200_OK

        assert False is response.data[0]["permissions"]["can_write"]

    def test_can_share_is_true_for_org_admin(self):
        my_org = OrganisationFactory.create()
        my_org.members.add(self.me)
        my_org.admins.add(self.me)
        LibraryFactory.create(owner_organisation=my_org, owner_user=None)

        self.client.force_authenticate(self.me)
        response = self.client.get(f"/{VERSION}/api/libraries/")
        assert response.status_code == status.HTTP_200_OK

        assert True is response.data[0]["permissions"]["can_share"]

    def test_can_share_is_false_for_org_member(self):
        my_org = OrganisationFactory.create()
        my_org.members.add(self.me)
        LibraryFactory.create(owner_organisation=my_org, owner_user=None)

        self.client.force_authenticate(self.me)
        response = self.client.get(f"/{VERSION}/api/libraries/")
        assert response.status_code == status.HTTP_200_OK

        assert False is response.data[0]["permissions"]["can_share"]

    def test_can_share_is_false_for_org_librarian(self):
        my_org = OrganisationFactory.create()
        my_org.members.add(self.me)
        my_org.librarians.add(self.me)
        LibraryFactory.create(owner_organisation=my_org, owner_user=None)

        self.client.force_authenticate(self.me)
        response = self.client.get(f"/{VERSION}/api/libraries/")
        assert response.status_code == status.HTTP_200_OK

        assert False is response.data[0]["permissions"]["can_share"]

    def test_list_libraries_fails_if_not_logged_in(self):
        LibraryFactory.create(owner_user=self.me)

        response = self.client.get(f"/{VERSION}/api/libraries/")
        assert status.HTTP_403_FORBIDDEN == response.status_code


class TestCreateLibraries(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.me = UserFactory.create()

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
                "permissions": {"can_write": True, "can_share": False},
                "data": {"foo": "bar"},
                "owner": {
                    "id": f"{self.me.id}",
                    "name": f"{self.me.username}",
                    "type": "personal",
                },
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
        assert self.me == retrieved.owner_user
        assert None is retrieved.owner_organisation


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
            lib = LibraryFactory.create(owner_user=self.me)

        with freeze_time("2019-07-13T12:10:12Z"):
            updateFields = {"data": {"new": "data"}}

            self.client.force_authenticate(self.me)

            response = self.client.patch(
                f"/{VERSION}/api/libraries/{lib.pk}/", updateFields, format="json"
            )

        assert status.HTTP_204_NO_CONTENT == response.status_code
        assert b"" == response.content

        updated_library = Library.objects.get(pk=lib.pk)

        assert {"new": "data"} == updated_library.data

        assert "2019-07-13T12:10:12+00:00" == updated_library.updated_at.isoformat()

    def test_update_library_name(self):
        with freeze_time("2019-06-01T16:35:34Z"):
            lib = LibraryFactory.create(owner_user=self.me)

        with freeze_time("2019-07-13T12:10:12Z"):
            updateFields = {"name": "updated name"}

            self.client.force_authenticate(self.me)
            response = self.client.patch(
                f"/{VERSION}/api/libraries/{lib.pk}/", updateFields, format="json"
            )

        assert status.HTTP_204_NO_CONTENT == response.status_code
        assert b"" == response.content

        updated_library = Library.objects.get(pk=lib.pk)

        assert "updated name" == updated_library.name

    def test_destroy_library(self):
        lib = LibraryFactory.create(owner_user=self.me)

        assessment_count = Library.objects.count()

        self.client.force_authenticate(self.me)
        response = self.client.delete(f"/{VERSION}/api/libraries/{lib.pk}/")

        assert status.HTTP_204_NO_CONTENT == response.status_code
        assert b"" == response.content

        assert (assessment_count - 1) == Library.objects.count()


class TestCreateLibraryItem(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.library = LibraryFactory.create(data={"tag1": {"name": "foo"}})

    def test_create_library_item(self):
        item_data = {"tag": "tag2", "item": {"name": "bar"}}

        self.client.force_authenticate(self.library.owner_user)
        response = self.client.post(
            f"/{VERSION}/api/libraries/{self.library.id}/items/",
            item_data,
            format="json",
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_create_library_item_fails_if_tag_already_exists(self):
        item_data = {"tag": "tag1", "item": {"name": "bar"}}

        self.client.force_authenticate(self.library.owner_user)
        response = self.client.post(
            f"/{VERSION}/api/libraries/{self.library.id}/items/",
            item_data,
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data == {
            "detail": f"tag `tag1` already exists in library {self.library.id}"
        }


class TestUpdateDestroyLibraryItem(APITestCase):
    def test_destroy_library_item(self):
        library = LibraryFactory.create(
            data={"tag1": {"name": "foo"}, "tag2": {"name": "bar"}}
        )

        self.client.force_authenticate(library.owner_user)
        response = self.client.delete(
            f"/{VERSION}/api/libraries/{library.id}/items/tag2/"
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT

        retrieved = Library.objects.get(id=library.id)
        assert retrieved.data == {"tag1": {"name": "foo"}}

    def test_update_library_item(self):
        library = LibraryFactory.create(data={"tag1": {"name": "foo"}})

        replacement_data = {"name": "bar", "other": "data"}

        with freeze_time("2019-06-01T16:35:34Z"):
            self.client.force_authenticate(library.owner_user)
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

        replacement_data = {"name": "bar", "other": "data"}

        self.client.force_authenticate(library.owner_user)

        response = self.client.put(
            f"/{VERSION}/api/libraries/{library.id}/items/tag5/",
            replacement_data,
            format="json",
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
