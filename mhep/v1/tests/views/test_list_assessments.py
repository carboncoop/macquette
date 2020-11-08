from django.contrib.auth import get_user_model
from freezegun import freeze_time
from rest_framework import status
from rest_framework.test import APITestCase

from ... import VERSION
from ..factories import AssessmentFactory
from ..factories import OrganisationFactory
from mhep.users.tests.factories import UserFactory

User = get_user_model()


class TestListAssessments(APITestCase):
    def test_returns_assessments_with_expected_result_structure(self):
        user = UserFactory.create()
        self.client.force_authenticate(user)

        with freeze_time("2019-06-01T16:35:34Z"):
            a1 = AssessmentFactory.create(
                name="test assessment 1",
                description="test description",
                data={"foo": "bar"},
                openbem_version="10.1.1",
                owner=user,
            )

        response = self.client.get(f"/{VERSION}/api/assessments/")

        expected_structure = {
            "id": "{}".format(a1.pk),
            "created_at": "2019-06-01T16:35:34Z",
            "updated_at": "2019-06-01T16:35:34Z",
            "mdate": "1559406934",
            "status": "In progress",
            "openbem_version": "10.1.1",
            "name": "test assessment 1",
            "description": "test description",
            "author": user.username,
            "userid": f"{user.id}",
        }

        assert expected_structure == response.data.pop()

    def test_doesnt_return_assessments_in_connected_organisation(self):
        user = UserFactory.create()
        organisation = OrganisationFactory.create()
        organisation.members.add(user)

        self.client.force_authenticate(user)

        AssessmentFactory.create(owner=user)
        AssessmentFactory.create(owner=user)

        AssessmentFactory.create(organisation=organisation)

        response = self.client.get(f"/{VERSION}/api/assessments/")
        assert response.status_code == status.HTTP_200_OK

        assert 2 == len(response.data)

    def test_only_returns_assessments_for_logged_in_user(self):
        me = UserFactory.create()
        someone_else = UserFactory.create()
        self.client.force_authenticate(me)

        AssessmentFactory.create(owner=me)
        AssessmentFactory.create(owner=me)
        AssessmentFactory.create(owner=someone_else)

        response = self.client.get(f"/{VERSION}/api/assessments/")
        assert response.status_code == status.HTTP_200_OK

        assert 2 == len(response.data)

    def test_returns_forbidden_if_not_logged_in(self):
        response = self.client.get(f"/{VERSION}/api/assessments/")
        assert response.status_code == status.HTTP_403_FORBIDDEN
