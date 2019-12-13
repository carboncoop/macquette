from django.contrib.auth import get_user_model

from freezegun import freeze_time

from rest_framework.test import APITestCase
from rest_framework import exceptions, status

from mhep.users.tests.factories import UserFactory

from ... import VERSION
from ...models import Assessment
from ..factories import AssessmentFactory, ImageFactory, OrganisationFactory

from .mixins import CreateAssessmentTestsMixin

User = get_user_model()


class TestCreateAssessment(CreateAssessmentTestsMixin, APITestCase):
    """
    note that the actual tests are provided by the CreateAssessmentTestsMixin, since they are
    common with the tests for TestCreateAssessmentForOrganisation
    """

    def post_to_create_endpoint(self, assessment):
        return self.client.post(
            f"/{VERSION}/api/assessments/", assessment, format="json"
        )


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


class TestGetAssessment(APITestCase):
    @classmethod
    def setUpClass(cls):
        cls.me = UserFactory.create()
        super().setUpClass()

    def test_returns_result_structured_as_expected(self):
        with freeze_time("2019-06-01T16:35:34Z"):
            a = AssessmentFactory.create(
                owner=self.me,
                name="test name",
                description="test description",
                data={"foo": "bar"},
                status="In progress",
                openbem_version="10.1.1",
            )

        i = ImageFactory.create(assessment=a)

        self.client.force_authenticate(self.me)
        response = self.client.get(f"/{VERSION}/api/assessments/{a.pk}/")
        assert response.status_code == status.HTTP_200_OK

        expected = {
            "id": f"{a.pk}",
            "created_at": "2019-06-01T16:35:34Z",
            "updated_at": "2019-06-01T16:35:34Z",
            "mdate": "1559406934",
            "status": "In progress",
            "openbem_version": "10.1.1",
            "name": "test name",
            "description": "test description",
            "author": self.me.username,
            "userid": f"{self.me.id}",
            "images": [
                {
                    "id": i.id,
                    "url": i.image.url,
                    "width": i.width,
                    "height": i.height,
                    "thumbnail_url": i.thumbnail.url,
                    "thumbnail_width": i.thumbnail_width,
                    "thumbnail_height": i.thumbnail_height,
                    "note": i.note,
                    "is_featured": False,
                }
            ],
            "data": {"foo": "bar"},
        }
        assert expected == response.data

    def test_assessment_without_data_returns_sensible_default(self):
        with freeze_time("2019-06-01T16:35:34Z"):
            a = AssessmentFactory.create(
                owner=self.me,
                name="test name",
                openbem_version="10.1.1",
                description="",
                data={},
            )

        self.client.force_authenticate(self.me)
        response = self.client.get(f"/{VERSION}/api/assessments/{a.pk}/")
        assert response.status_code == status.HTTP_200_OK

        expected = {
            "id": f"{a.pk}",
            "created_at": "2019-06-01T16:35:34Z",
            "updated_at": "2019-06-01T16:35:34Z",
            "mdate": "1559406934",
            "openbem_version": "10.1.1",
            "name": "test name",
            # defaults:
            "description": "",
            "author": self.me.username,
            "userid": f"{self.me.id}",
            "status": "In progress",
            "images": [],
            "data": {},
        }
        assert expected == response.data

    def test_returns_404_for_bad_id(self):
        response = self.client.get(f"/{VERSION}/api/assessments/bad-id/")
        assert status.HTTP_404_NOT_FOUND == response.status_code

    def test_structure_of_featured_and_normal_image(self):
        a = AssessmentFactory.create(
            owner=self.me,
            name="test name",
            description="test description",
            data={"foo": "bar"},
            status="In progress",
            openbem_version="10.1.1",
        )

        i1 = ImageFactory.create(assessment=a)
        i2 = ImageFactory.create(assessment=a)

        a.featured_image = i1
        a.save()

        self.client.force_authenticate(self.me)
        response = self.client.get(f"/{VERSION}/api/assessments/{a.pk}/")
        assert response.status_code == status.HTTP_200_OK

        expected = [
            {
                "id": i2.id,
                "url": i2.image.url,
                "width": i2.width,
                "height": i2.height,
                "thumbnail_url": i2.thumbnail.url,
                "thumbnail_width": i2.thumbnail_width,
                "thumbnail_height": i2.thumbnail_height,
                "note": i2.note,
                "is_featured": False,
            },
            {
                "id": i1.id,
                "url": i1.image.url,
                "width": i1.width,
                "height": i1.height,
                "thumbnail_url": i1.thumbnail.url,
                "thumbnail_width": i1.thumbnail_width,
                "thumbnail_height": i1.thumbnail_height,
                "note": i1.note,
                "is_featured": True,
            },
        ]
        assert expected == response.data["images"]


class TestUpdateAssessment(APITestCase):
    @classmethod
    def setUpClass(cls):
        cls.me = UserFactory.create()
        with freeze_time("2019-06-01T16:35:34Z"):
            cls.assessment = AssessmentFactory.create(
                owner=cls.me,
                name="test name",
                description="test description",
                data={"foo": "bar"},
                status="In progress",
                openbem_version="10.1.1",
            )

        super().setUpClass()

    def test_updates_and_returns_as_expected(self):
        with freeze_time("2019-07-13T12:10:12Z"):
            updateFields = {
                "data": {"new": "data"},
                "status": "Complete",
            }

            self.client.force_authenticate(self.me)
            response = self.client.patch(
                f"/{VERSION}/api/assessments/{self.assessment.pk}/",
                updateFields,
                format="json",
            )

        assert status.HTTP_204_NO_CONTENT == response.status_code
        assert b"" == response.content

        updated_assessment = Assessment.objects.get(pk=self.assessment.pk)

        assert {"new": "data"} == updated_assessment.data
        assert "Complete" == updated_assessment.status

        assert "2019-07-13T12:10:12+00:00" == updated_assessment.updated_at.isoformat()

    def test_fails_if_data_field_is_a_string(self):
        with freeze_time("2019-07-13T12:10:12Z"):
            updateFields = {
                "data": {"foo string"},
            }
            self.client.force_authenticate(self.me)
            response = self.client.patch(
                f"/{VERSION}/api/assessments/{self.assessment.pk}/",
                updateFields,
                format="json",
            )

        assert status.HTTP_400_BAD_REQUEST == response.status_code
        assert response.data == {
            "data": [
                exceptions.ErrorDetail(
                    string="This field is not a dict.", code="invalid"
                )
            ]
        }

    def test_update_assessment_data_fails_if_assessment_is_complete(self):
        self.assessment.status = "Complete"
        self.assessment.save()

        with freeze_time("2019-07-13T12:10:12Z"):
            updateFields = {
                "data": {"new": "data"},
            }

            self.client.force_authenticate(self.me)
            response = self.client.patch(
                f"/{VERSION}/api/assessments/{self.assessment.pk}/",
                updateFields,
                format="json",
            )

        assert status.HTTP_400_BAD_REQUEST == response.status_code
        assert response.data == {
            "detail": "can't update data when status is 'complete'"
        }

    def test_assessment_status_can_change_from_complete_to_in_progress(self):
        self.assessment.status = "Complete"
        self.assessment.save()

        with freeze_time("2019-07-13T12:10:12Z"):
            updateFields = {"status": "In progress"}

            self.client.force_authenticate(self.me)
            response = self.client.patch(
                f"/{VERSION}/api/assessments/{self.assessment.pk}/",
                updateFields,
                format="json",
            )

        assert status.HTTP_204_NO_CONTENT == response.status_code


class TestDestroyAssessment(APITestCase):
    @classmethod
    def setUpClass(cls):
        cls.me = UserFactory.create()
        with freeze_time("2019-06-01T16:35:34Z"):
            cls.assessment = AssessmentFactory.create(
                owner=cls.me,
                name="test name",
                description="test description",
                data={"foo": "bar"},
                status="In progress",
                openbem_version="10.1.1",
            )

        super().setUpClass()

    def test_returns_204_if_user_is_owner(self):
        a = AssessmentFactory.create(
            owner=self.me,
            name="test name",
            description="test description",
            data={"foo": "bar"},
            status="In progress",
            openbem_version="10.1.1",
        )

        assessment_count = Assessment.objects.count()

        self.client.force_authenticate(self.me)
        response = self.client.delete(f"/{VERSION}/api/assessments/{a.pk}/")

        assert status.HTTP_204_NO_CONTENT == response.status_code
        assert b"" == response.content

        assert (assessment_count - 1) == Assessment.objects.count()
