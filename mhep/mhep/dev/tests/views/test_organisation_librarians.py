from rest_framework import status
from rest_framework.test import APITestCase

from ... import VERSION
from ..factories import OrganisationFactory
from .mixins import AssertErrorMixin
from mhep.users.tests.factories import UserFactory


class SetUpMixin:
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.org_admin = UserFactory.create()
        cls.normal_member = UserFactory.create()
        cls.non_member = UserFactory.create()
        cls.librarian = UserFactory.create()

        cls.org = OrganisationFactory.create()

        cls.org.members.add(cls.org_admin)
        cls.org.members.add(cls.normal_member)
        cls.org.members.add(cls.librarian)

        cls.org.admins.add(cls.org_admin)

        cls.org.librarians.add(cls.librarian)


class TestCreateOrganisationLibrarians(SetUpMixin, AssertErrorMixin, APITestCase):
    def test_can_promote_organisation_member_as_librarian(self):
        self.org.librarians.clear()

        self.client.force_authenticate(self.org_admin)

        response = self.client.post(
            f"/{VERSION}/api/organisations/{self.org.id}/librarians/{self.normal_member.id}/"
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert self.normal_member in self.org.librarians.all()

    def test_returns_204_if_promoting_user_who_is_already_a_librarian(self):
        self.org.librarians.clear()

        self.client.force_authenticate(self.org_admin)

        response = self.client.post(
            f"/{VERSION}/api/organisations/{self.org.id}/librarians/{self.librarian.id}/"
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert self.librarian in self.org.librarians.all()

    def test_cannot_promote_user_who_isnt_member_of_org_as_librarian(self):
        self.client.force_authenticate(self.org_admin)

        response = self.client.post(
            f"/{VERSION}/api/organisations/{self.org.id}/librarians/{self.non_member.id}/"
        )

        self._assert_error(
            response,
            status.HTTP_400_BAD_REQUEST,
            f"{self.non_member} is not a member of {self.org}",
        )
        assert self.non_member not in self.org.librarians.all()


class TestDeleteOrganisationLibrarians(SetUpMixin, AssertErrorMixin, APITestCase):
    def test_can_demote_librarian_successfully(self):
        self.client.force_authenticate(self.org_admin)

        response = self.client.delete(
            f"/{VERSION}/api/organisations/{self.org.id}/librarians/{self.librarian.id}/"
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert self.librarian not in self.org.librarians.all()

    def test_returns_204_if_demoting_user_who_is_already_not_a_librarian(self):
        self.org.librarians.clear()

        self.client.force_authenticate(self.org_admin)

        response = self.client.delete(
            f"/{VERSION}/api/organisations/{self.org.id}/librarians/{self.normal_member.id}/"
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert self.normal_member not in self.org.librarians.all()
