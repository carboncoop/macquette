from freezegun import freeze_time
from rest_framework import status
from rest_framework.test import APITestCase

from ... import VERSION
from ...models import Assessment
from ..factories import AssessmentFactory
from ..factories import OrganisationFactory
from .mixins import CreateAssessmentTestsMixin
from mhep.users.tests.factories import UserFactory


class TestListAssessmentsForOrganisation(APITestCase):
    @classmethod
    def setUpClass(cls):
        cls.organisation = OrganisationFactory.create()
        cls.org_member = UserFactory.create()
        cls.organisation.members.add(cls.org_member)
        super().setUpClass()

    def test_returns_all_assessments_connected_to_organisation(self):
        AssessmentFactory.create(organisation=self.organisation)
        AssessmentFactory.create(organisation=self.organisation)

        AssessmentFactory.create()
        AssessmentFactory.create(organisation=OrganisationFactory.create())

        self.call_and_assert_number_of_returns_assessments(2)

    def test_returns_only_assessments_connected_to_the_organisation(self):
        second_org = OrganisationFactory.create()
        second_org.members.add(self.org_member)

        AssessmentFactory.create(organisation=self.organisation)
        AssessmentFactory.create(organisation=self.organisation)

        AssessmentFactory.create(organisation=second_org)

        self.call_and_assert_number_of_returns_assessments(2)

    def test_returns_structure_as_expected(self):
        with freeze_time("2019-06-01T16:35:34Z"):
            assessment = AssessmentFactory.create(
                name="test assessment 1",
                description="test description",
                data={"foo": "bar"},
                owner=self.org_member,
                organisation=self.organisation,
            )

        self.client.force_authenticate(self.org_member)
        response = self.client.get(
            f"/{VERSION}/api/organisations/{self.organisation.pk}/assessments/"
        )

        expected_result = {
            "id": "{}".format(assessment.pk),
            "created_at": "2019-06-01T16:35:34Z",
            "updated_at": "2019-06-01T16:35:34Z",
            "mdate": "1559406934",
            "status": "In progress",
            "name": "test assessment 1",
            "description": "test description",
            "author": self.org_member.username,
            "userid": f"{self.org_member.id}",
        }

        assert expected_result == response.data.pop()

    def test_returns_404_for_bad_organisation_id(self):
        self.client.force_authenticate(self.org_member)
        response = self.client.get(f"/{VERSION}/api/organisations/2/assessments/")

        assert status.HTTP_404_NOT_FOUND == response.status_code
        assert {"detail": "Organisation not found"} == response.json()

    def test_doesnt_return_assessments_that_arent_connected_to_organisation(self):
        AssessmentFactory.create()

        self.call_and_assert_number_of_returns_assessments(0)

    def test_doesnt_return_own_assessments_that_arent_connected_to_organisation(self):
        AssessmentFactory.create(owner=self.org_member)

        self.call_and_assert_number_of_returns_assessments(0)

    def test_returns_forbidden_if_not_logged_in(self):
        AssessmentFactory.create(organisation=self.organisation)
        response = self.client.get(
            f"/{VERSION}/api/organisations/{self.organisation.pk}/assessments/"
        )

        assert status.HTTP_403_FORBIDDEN == response.status_code
        assert {
            "detail": "Authentication credentials were not provided."
        } == response.json()

    def test_returns_forbidden_if_listing_for_organisation_not_a_member_of(self):
        someone_else = UserFactory.create()
        self.client.force_authenticate(someone_else)

        response = self.client.get(
            f"/{VERSION}/api/organisations/{self.organisation.pk}/assessments/"
        )

        assert status.HTTP_403_FORBIDDEN == response.status_code
        assert {
            "detail": "You are not a member of the Organisation."
        } == response.json()

    def call_and_assert_number_of_returns_assessments(self, expectedAssessmentCount):
        self.client.force_authenticate(self.org_member)
        response = self.client.get(
            f"/{VERSION}/api/organisations/{self.organisation.pk}/assessments/"
        )

        assert response.status_code == status.HTTP_200_OK
        assert expectedAssessmentCount == len(response.data)


class TestCreateAssessmentForOrganisation(CreateAssessmentTestsMixin, APITestCase):
    """
    note that more tests are provided by the CreateAssessmentTestsMixin, since they are
    common with the tests for TestCreateAssessment (for an individual)
    """

    def post_to_create_endpoint(self, assessment):
        organisation = OrganisationFactory.create()
        organisation.members.add(self.user)

        return self.client.post(
            f"/{VERSION}/api/organisations/{organisation.pk}/assessments/",
            assessment,
            format="json",
        )

    def test_sets_organisation(self):
        organisation = OrganisationFactory.create()
        organisation.members.add(self.user)

        self.client.force_authenticate(self.user)

        new_assessment = {
            "name": "test assessment 1",
            "description": "test description 1",
        }

        response = self.client.post(
            f"/{VERSION}/api/organisations/{organisation.pk}/assessments/",
            new_assessment,
            format="json",
        )

        assert status.HTTP_201_CREATED == response.status_code

        assessment = Assessment.objects.get(pk=response.data["id"])
        assert organisation == assessment.organisation

    def test_fails_if_not_a_member_of_organisation(self):
        organisation = OrganisationFactory.create()

        self.client.force_authenticate(self.user)

        new_assessment = {
            "name": "test assessment 1",
            "description": "test description 1",
        }

        response = self.client.post(
            f"/{VERSION}/api/organisations/{organisation.pk}/assessments/",
            new_assessment,
            format="json",
        )

        assert status.HTTP_403_FORBIDDEN == response.status_code
        assert {
            "detail": "You are not a member of the Organisation."
        } == response.json()
