import datetime
import pytz
import pytest

from collections import OrderedDict

from rest_framework.test import APITestCase
from rest_framework import status

from ... import VERSION
from ..factories import AssessmentFactory, OrganisationFactory

from mhep.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db  # enable DB and run each test in transaction


class TestListOrganisations(APITestCase):
    def test_shows_logged_in_users_organisations(self):
        me = UserFactory.create(
            last_login=datetime.datetime(2019, 6, 3, 16, 35, 0, 0, pytz.UTC)
        )
        my_org = OrganisationFactory.create()

        org_admin = UserFactory.create(
            last_login=datetime.datetime(2019, 6, 3, 13, 21, 0, 0, pytz.UTC)
        )
        my_org.members.add(org_admin)
        my_org.admins.add(org_admin)

        AssessmentFactory.create(owner=me, organisation=my_org)
        AssessmentFactory.create(owner=me, organisation=my_org)
        my_org.members.add(me)
        my_org.librarians.add(me)

        OrganisationFactory.create()  # make another organisation: it shouldn't show up

        self.client.force_authenticate(me)
        response = self.client.get(f"/{VERSION}/api/organisations/")
        assert response.status_code == status.HTTP_200_OK

        expected = [
            OrderedDict(
                [
                    ("id", f"{my_org.id}"),
                    ("name", my_org.name),
                    ("assessments", 2),
                    (
                        "members",
                        [
                            {
                                "id": f"{me.id}",
                                "name": me.username,
                                "is_admin": False,
                                "is_librarian": True,
                                "last_login": me.last_login.isoformat(),
                            },
                            {
                                "id": f"{org_admin.id}",
                                "name": org_admin.username,
                                "is_admin": True,
                                "is_librarian": False,
                                "last_login": org_admin.last_login.isoformat(),
                            },
                        ],
                    ),
                    (
                        "permissions",
                        {
                            "can_add_remove_members": False,
                            "can_promote_demote_librarians": False,
                        },
                    ),
                    ("report", {}),
                ]
            ),
        ]

        assert expected == response.data

    def test_returns_forbidden_if_not_logged_in(self):
        response = self.client.get(f"/{VERSION}/api/organisations/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_if_last_login_is_none_shows_never(self):
        me = UserFactory.create(last_login=None)
        my_org = OrganisationFactory.create()
        my_org.members.add(me)

        self.client.force_authenticate(me)
        response = self.client.get(f"/{VERSION}/api/organisations/")
        assert response.status_code == status.HTTP_200_OK

        assert "never" == response.data[0]["members"][0]["last_login"]


class TestListOrganisationsPermissions(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()

        cls.org = OrganisationFactory.create()

        cls.member_1 = UserFactory.create(
            last_login=datetime.datetime(2019, 6, 3, 16, 35, 0, 0, pytz.UTC)
        )
        cls.org.members.add(cls.member_1)

        cls.org_admin = UserFactory.create(
            last_login=datetime.datetime(2019, 6, 3, 13, 21, 0, 0, pytz.UTC)
        )
        cls.org.members.add(cls.org_admin)
        cls.org.admins.add(cls.org_admin)

    def test_shows_permissions_for_logged_in_member(self):
        self.client.force_authenticate(self.member_1)

        self._assert_permissions(
            self.client.get(f"/{VERSION}/api/organisations/"),
            {"can_add_remove_members": False, "can_promote_demote_librarians": False,},
        )

    def test_shows_permissions_for_logged_in_admin(self):
        self.client.force_authenticate(self.org_admin)

        self._assert_permissions(
            self.client.get(f"/{VERSION}/api/organisations/"),
            {"can_add_remove_members": True, "can_promote_demote_librarians": True,},
        )

    def _assert_permissions(self, response, expected_permissions):
        expected_members = [
            {
                "id": f"{self.member_1.id}",
                "name": self.member_1.username,
                "is_admin": False,
                "is_librarian": False,
                "last_login": self.member_1.last_login.isoformat(),
            },
            {
                "id": f"{self.org_admin.id}",
                "name": self.org_admin.username,
                "is_admin": True,
                "is_librarian": False,
                "last_login": self.org_admin.last_login.isoformat(),
            },
        ]

        assert response.data[0]["members"] == expected_members
        assert response.data[0]["permissions"] == expected_permissions
