import pytest
from rest_framework import status
from rest_framework.test import APITestCase

from ... import VERSION
from ..factories import OrganisationFactory
from mhep.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db  # enable DB and run each test in transaction


class TestListUsers(APITestCase):
    def test_shows_logged_in_user_all_users(self):
        me = UserFactory.create()
        user_1 = UserFactory.create()
        user_2 = UserFactory.create()

        org = OrganisationFactory.create()
        org.members.add(me)
        org.admins.add(me)

        self.client.force_authenticate(me)
        response = self.client.get(f"/{VERSION}/api/users/")
        assert response.status_code == status.HTTP_200_OK

        expected = [
            {"id": f"{me.id}", "name": me.username},
            {"id": f"{user_1.id}", "name": user_1.username},
            {"id": f"{user_2.id}", "name": user_2.username},
        ]

        assert expected == response.json()
