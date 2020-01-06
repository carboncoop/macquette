import pytest
from rest_framework import status
from rest_framework.test import APITestCase

from ... import VERSION
from ..factories import OrganisationFactory
from .mixins import AssertErrorMixin
from mhep.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db  # enable DB and run each test in transaction


class TestListUsersPermissions(AssertErrorMixin, APITestCase):
    def test_an_organisation_admin_can_list_all_users(self):
        me = UserFactory.create()
        org = OrganisationFactory.create()
        org.members.add(me)
        org.admins.add(me)

        self.client.force_authenticate(me)
        response = self.client.get(f"/{VERSION}/api/users/")
        assert response.status_code == status.HTTP_200_OK

    def test_returns_forbidden_if_not_logged_in(self):
        response = self.client.get(f"/{VERSION}/api/users/")
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "Authentication credentials were not provided.",
        )

    def test_user_who_isnt_an_organisation_admin_cannot_list_users(self):
        self.client.force_authenticate(UserFactory.create())

        response = self.client.get(f"/{VERSION}/api/users/")
        self._assert_error(
            response,
            status.HTTP_403_FORBIDDEN,
            "You are not an admin of an organisation.",
        )
