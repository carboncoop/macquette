from django.contrib.auth import get_user_model

from freezegun import freeze_time

from rest_framework.test import APITestCase
from rest_framework import exceptions, status

from mhep.users.tests.factories import UserFactory

from ... import VERSION
from ...models import Assessment
from ..factories import OrganisationFactory

User = get_user_model()


class CreateAssessmentTestsMixin:
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.user = UserFactory.create()

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        Assessment.objects.all().delete()

    def test_create_assessment_returns_expected_result_structure(self):
        self.client.force_authenticate(self.user)

        new_assessment = {
            "name": "test assessment 1",
            "description": "test description 1",
            "openbem_version": "10.1.1",
            "data": {"foo": "baz"},  # data is specifically *not* returned
        }

        with freeze_time("2019-06-01T16:35:34Z"):
            response = self.post_to_create_endpoint(new_assessment)

        assert response.status_code == status.HTTP_201_CREATED

        expected_result = {
            "created_at": "2019-06-01T16:35:34Z",
            "updated_at": "2019-06-01T16:35:34Z",
            "mdate": "1559406934",
            "status": "In progress",
            "openbem_version": "10.1.1",
            "name": "test assessment 1",
            "description": "test description 1",
            "author": self.user.username,
            "userid": f"{self.user.id}",
        }

        assert "id" in response.data
        response.data.pop("id")

        assert expected_result == response.data

    def test_accepts_no_data(self):
        self.client.force_authenticate(self.user)

        new_assessment = {
            "name": "test assessment 1",
            "openbem_version": "10.1.1",
            "description": "test description 1",
        }

        response = self.post_to_create_endpoint(new_assessment)

        assert response.status_code == status.HTTP_201_CREATED
        created_assessment = Assessment.objects.get(pk=response.data["id"])
        assert {} == created_assessment.data

    def test_sets_owner_to_logged_in_user(self):
        self.client.force_authenticate(self.user)

        new_assessment = {
            "name": "test assessment 1",
            "openbem_version": "10.1.1",
            "description": "test description 1",
        }

        response = self.post_to_create_endpoint(new_assessment)

        assert response.status_code == status.HTTP_201_CREATED
        created_assessment = Assessment.objects.get(pk=response.data["id"])
        assert self.user == created_assessment.owner

    def test_accepts_no_description(self):
        self.client.force_authenticate(self.user)

        new_assessment = {
            "name": "test assessment 1",
            "openbem_version": "10.1.1",
            "data": {"foo": "baz"},
        }

        response = self.post_to_create_endpoint(new_assessment)

        assert response.status_code == status.HTTP_201_CREATED
        assert "" == response.data["description"]

    def test_returns_forbidden_if_not_logged_in(self):
        new_assessment = {
            "name": "test assessment 1",
            "openbem_version": "10.1.1",
        }

        response = self.post_to_create_endpoint(new_assessment)

        assert status.HTTP_403_FORBIDDEN == response.status_code

    def test_create_assessment_fails_if_name_missing(self):
        self.client.force_authenticate(self.user)

        self.assert_create_fails(
            {"openbem_version": "10.1.1", "description": "test description 2",},
            status.HTTP_400_BAD_REQUEST,
            {
                "name": [
                    exceptions.ErrorDetail(
                        string="This field is required.", code="required"
                    )
                ]
            },
        )

    def test_create_assessment_fails_if_openbem_version_missing(self):
        self.client.force_authenticate(self.user)

        self.assert_create_fails(
            {"name": "test assessment 1", "description": "test description 2",},
            status.HTTP_400_BAD_REQUEST,
            {
                "openbem_version": [
                    exceptions.ErrorDetail(
                        string="This field is required.", code="required"
                    )
                ]
            },
        )

    def test_create_assessment_fails_if_openbem_version_is_not_valid_choice(self):
        self.client.force_authenticate(self.user)

        self.assert_create_fails(
            {"name": "test assessment 1", "openbem_version": "foo",},
            status.HTTP_400_BAD_REQUEST,
            {
                "openbem_version": [
                    exceptions.ErrorDetail(
                        string='"foo" is not a valid choice.', code="invalid_choice",
                    )
                ]
            },
        )

    def test_create_assessment_fails_if_status_is_not_valid_choice(self):
        self.client.force_authenticate(self.user)

        self.assert_create_fails(
            {"name": "test assessment 1", "openbem_version": "10.1.1", "status": "bar"},
            status.HTTP_400_BAD_REQUEST,
            {
                "status": [
                    exceptions.ErrorDetail(
                        string='"bar" is not a valid choice.', code="invalid_choice",
                    )
                ]
            },
        )

    def assert_create_fails(self, new_assessment, expected_status, expected_response):
        self.client.force_authenticate(self.user)

        response = self.post_to_create_endpoint(new_assessment)

        assert response.status_code == expected_status
        assert response.data == expected_response


class TestCreateAssessment(CreateAssessmentTestsMixin, APITestCase):
    def post_to_create_endpoint(self, assessment):
        return self.client.post(
            f"/{VERSION}/api/assessments/", assessment, format="json"
        )


class TestCreateAssessmentForOrganisation(CreateAssessmentTestsMixin, APITestCase):
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
            "openbem_version": "10.1.1",
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
            "openbem_version": "10.1.1",
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
