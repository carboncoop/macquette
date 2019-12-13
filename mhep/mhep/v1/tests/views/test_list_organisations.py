import datetime
import pytz

from collections import OrderedDict

from rest_framework.test import APITestCase
from rest_framework import status

from ... import VERSION
from ..factories import AssessmentFactory, OrganisationFactory

from mhep.users.tests.factories import UserFactory


class TestListOrganisations(APITestCase):
    def test_shows_logged_in_users_organisations(self):
        me = UserFactory.create(
            last_login=datetime.datetime(2019, 6, 3, 16, 35, 0, 0, pytz.UTC)
        )
        my_org = OrganisationFactory.create()
        AssessmentFactory.create(owner=me, organisation=my_org)
        AssessmentFactory.create(owner=me, organisation=my_org)
        my_org.members.add(me)

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
                                "userid": f"{me.id}",
                                "name": me.username,
                                "last_login": me.last_login.isoformat(),
                            }
                        ],
                    ),
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
