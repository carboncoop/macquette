from rest_framework.test import APITestCase
from rest_framework import status

from ... import VERSION
from ..factories import OrganisationFactory

from mhep.users.tests.factories import UserFactory

from .mixins import AssertErrorMixin


class SetUpMixin:
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.org_admin = UserFactory.create()
        cls.non_member = UserFactory.create()
        cls.member = UserFactory.create()

        cls.org = OrganisationFactory.create()

        cls.org.members.add(cls.org_admin)
        cls.org.members.add(cls.member)

        cls.org.admins.add(cls.org_admin)


class TestCreateOrganisationMembers(SetUpMixin, AssertErrorMixin, APITestCase):
    def test_can_add_member_to_organisation(self):
        self.client.force_authenticate(self.org_admin)

        response = self.client.post(
            f"/{VERSION}/api/organisations/{self.org.id}/members/{self.non_member.id}/",
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert self.member in self.org.members.all()

    def test_returns_204_if_adding_user_who_is_already_a_member(self):
        self.client.force_authenticate(self.org_admin)

        response = self.client.post(
            f"/{VERSION}/api/organisations/{self.org.id}/members/{self.member.id}/",
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert self.member in self.org.members.all()


class TestDeleteOrganisationMembers(SetUpMixin, AssertErrorMixin, APITestCase):
    def test_can_remove_member_successfully(self):
        self.client.force_authenticate(self.org_admin)

        response = self.client.delete(
            f"/{VERSION}/api/organisations/{self.org.id}/members/{self.member.id}/",
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert self.member not in self.org.members.all()

    def test_removing_member_demotes_admin_role(self):
        self.org.admins.add(self.member)

        self.client.force_authenticate(self.org_admin)

        response = self.client.delete(
            f"/{VERSION}/api/organisations/{self.org.id}/members/{self.member.id}/",
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert self.member not in self.org.admins.all()

    def test_removing_member_demotes_librarian_role(self):
        self.org.librarians.add(self.member)

        self.client.force_authenticate(self.org_admin)

        response = self.client.delete(
            f"/{VERSION}/api/organisations/{self.org.id}/members/{self.member.id}/",
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert self.member not in self.org.librarians.all()

    def test_returns_204_if_removing_user_who_is_already_not_a_member(self):
        self.client.force_authenticate(self.org_admin)

        response = self.client.delete(
            f"/{VERSION}/api/organisations/{self.org.id}/members/{self.member.id}/",
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert self.member not in self.org.members.all()
