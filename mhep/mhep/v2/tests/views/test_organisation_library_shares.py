from collections import OrderedDict

from rest_framework import status
from rest_framework.test import APITestCase

from ... import VERSION
from ..factories import LibraryFactory
from ..factories import OrganisationFactory
from .mixins import AssertErrorMixin
from mhep.users.tests.factories import UserFactory


class SetUpMixin:
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.my_org = OrganisationFactory.create()
        cls.other_org = OrganisationFactory.create()
        cls.org_admin = UserFactory.create()

        cls.my_org.members.add(cls.org_admin)
        cls.my_org.admins.add(cls.org_admin)

        cls.library = LibraryFactory.create(
            owner_organisation=cls.my_org, owner_user=None
        )


class TestShareOrganisationLibrary(SetUpMixin, AssertErrorMixin, APITestCase):
    def test_can_share_library_with_other_organisation(self):
        self.client.force_authenticate(self.org_admin)

        response = self.client.post(
            f"/{VERSION}/api/organisations/{self.my_org.id}/libraries/{self.library.id}"
            f"/shares/{self.other_org.id}/"
        )

        assert status.HTTP_204_NO_CONTENT == response.status_code
        assert self.library in self.other_org.libraries_shared_with.all()

    def test_returns_204_if_sharing_library_thats_already_shared_with_organisation(
        self,
    ):
        self.client.force_authenticate(self.org_admin)

        self.library.shared_with.add(self.other_org)

        response = self.client.post(
            f"/{VERSION}/api/organisations/{self.my_org.id}/libraries/{self.library.id}"
            f"/shares/{self.other_org.id}/"
        )

        assert status.HTTP_204_NO_CONTENT == response.status_code
        assert self.library in self.other_org.libraries_shared_with.all()

    def test_returns_404_if_other_organisation_id_doesnt_exist(self):
        self.client.force_authenticate(self.org_admin)

        response = self.client.post(
            f"/{VERSION}/api/organisations/{self.my_org.id}/libraries/{self.library.id}"
            f"/shares/9999/"
        )

        self._assert_error(
            response,
            status.HTTP_404_NOT_FOUND,
            f"can't share library with non-existent organisation: id=9999",
        )
        assert self.library not in self.other_org.libraries_shared_with.all()

    def test_returns_404_if_library_id_doesnt_exist(self):
        self.client.force_authenticate(self.org_admin)

        response = self.client.post(
            f"/{VERSION}/api/organisations/{self.my_org.id}/libraries/9999"
            f"/shares/{self.other_org.id}/"
        )

        self._assert_error(
            response,
            status.HTTP_404_NOT_FOUND,
            f"organisation doesn't have a library with id=9999",
        )
        assert self.library not in self.other_org.libraries_shared_with.all()

    def test_returns_404_if_library_id_exists_but_doesnt_belong_to_organisation(self):
        self.client.force_authenticate(self.org_admin)

        other_library = LibraryFactory.create()  # belongs to random user

        response = self.client.post(
            f"/{VERSION}/api/organisations/{self.my_org.id}/libraries/{other_library.id}"
            f"/shares/{self.other_org.id}/"
        )

        self._assert_error(
            response,
            status.HTTP_404_NOT_FOUND,
            f"organisation doesn't have a library with id={other_library.id}",
        )
        assert self.library not in self.other_org.libraries_shared_with.all()


class TestUnshareOrganisationLibrary(SetUpMixin, AssertErrorMixin, APITestCase):
    def test_can_unshare_library_with_other_organisation(self):
        self.library.shared_with.add(self.other_org)

        self.client.force_authenticate(self.org_admin)
        response = self.client.delete(
            f"/{VERSION}/api/organisations/{self.my_org.id}/libraries/{self.library.id}"
            f"/shares/{self.other_org.id}/"
        )

        assert status.HTTP_204_NO_CONTENT == response.status_code
        assert self.library not in self.other_org.libraries_shared_with.all()

    def test_returns_204_if_unsharing_library_thats_not_already_shared_with_organisation(
        self,
    ):
        self.library.shared_with.add(self.other_org)

        self.client.force_authenticate(self.org_admin)
        response = self.client.delete(
            f"/{VERSION}/api/organisations/{self.my_org.id}/libraries/{self.library.id}"
            f"/shares/{self.other_org.id}/"
        )

        assert status.HTTP_204_NO_CONTENT == response.status_code
        assert self.library not in self.other_org.libraries_shared_with.all()

    def test_returns_404_is_sharing_organisation_id_does_not_exist(self):
        self.client.force_authenticate(self.org_admin)
        response = self.client.delete(
            f"/{VERSION}/api/organisations/999/libraries/{self.library.id}"
            f"/shares/{self.other_org.id}/"
        )

        self._assert_error(
            response, status.HTTP_404_NOT_FOUND, f"Organisation not found"
        )

    def test_returns_404_if_other_organisation_id_doesnt_exist(self):
        self.library.shared_with.add(self.other_org)

        self.client.force_authenticate(self.org_admin)
        response = self.client.delete(
            f"/{VERSION}/api/organisations/{self.my_org.id}/libraries/{self.library.id}"
            f"/shares/9999/"
        )

        self._assert_error(
            response,
            status.HTTP_404_NOT_FOUND,
            f"can't share library with non-existent organisation: id=9999",
        )
        assert self.library in self.other_org.libraries_shared_with.all()

    def test_returns_404_if_library_id_doesnt_exist(self):
        self.library.shared_with.add(self.other_org)

        self.client.force_authenticate(self.org_admin)
        response = self.client.delete(
            f"/{VERSION}/api/organisations/{self.my_org.id}/libraries/9999"
            f"/shares/{self.other_org.id}/"
        )

        self._assert_error(
            response,
            status.HTTP_404_NOT_FOUND,
            f"organisation doesn't have a library with id=9999",
        )
        assert self.library in self.other_org.libraries_shared_with.all()


class TestListOrganisationLibraryShares(SetUpMixin, AssertErrorMixin, APITestCase):
    def test_returns_organisations_a_library_is_shared_with(self):
        self.library.shared_with.add(self.other_org)

        self.client.force_authenticate(self.org_admin)
        response = self.client.get(
            f"/{VERSION}/api/organisations/{self.my_org.id}/libraries/{self.library.id}/shares/"
        )

        assert status.HTTP_200_OK == response.status_code
        expected = [
            OrderedDict([("id", f"{self.other_org.id}"), ("name", self.other_org.name)])
        ]

        assert expected == response.data

    def test_returns_404_if_organisation_id_doesnt_exist(self):
        self.client.force_authenticate(self.org_admin)
        response = self.client.get(
            f"/{VERSION}/api/organisations/999/libraries/{self.library.id}/shares/"
        )

        self._assert_error(
            response, status.HTTP_404_NOT_FOUND, f"Organisation not found"
        )

    def test_returns_404_if_library_id_doesnt_exist(self):
        self.client.force_authenticate(self.org_admin)
        response = self.client.get(
            f"/{VERSION}/api/organisations/{self.my_org.id}/libraries/999/shares/"
        )

        self._assert_error(
            response,
            status.HTTP_404_NOT_FOUND,
            f"organisation doesn't have a library with id=999",
        )
