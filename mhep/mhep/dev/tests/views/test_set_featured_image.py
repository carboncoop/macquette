from rest_framework import status
from rest_framework.test import APITestCase

from .. import factories
from ... import VERSION
from mhep.users.tests.factories import UserFactory


class TestSetFeaturedImage(APITestCase):
    @classmethod
    def setUpClass(cls):
        cls.me = UserFactory.create()
        super().setUpClass()

    def test_invalid_id_format(self):
        a = factories.AssessmentFactory.create(owner=self.me)

        self.client.force_authenticate(self.me)
        response = self.client.post(
            f"/{VERSION}/api/assessments/{a.pk}/images/featured/",
            {"id": "Fred Moten"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["detail"] == "invalid id"

    def test_id_doesnt_exist(self):
        a = factories.AssessmentFactory.create(owner=self.me)

        self.client.force_authenticate(self.me)
        response = self.client.post(
            f"/{VERSION}/api/assessments/{a.pk}/images/featured/",
            {"id": 11},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "doesn't exist" in response.data["detail"]

    def test_valid_image(self):
        a = factories.AssessmentFactory.create(owner=self.me)
        i1 = factories.ImageFactory.create(assessment=a)

        self.client.force_authenticate(self.me)
        response = self.client.post(
            f"/{VERSION}/api/assessments/{a.pk}/images/featured/",
            {"id": i1.pk},
            format="json",
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT
        a.refresh_from_db()
        assert a.featured_image == i1

    def test_image_belongs_to_other_assessment(self):
        a = factories.AssessmentFactory.create(owner=self.me)
        factories.ImageFactory.create(assessment=a)

        b = factories.AssessmentFactory.create(owner=self.me)
        i2 = factories.ImageFactory.create(assessment=b)

        self.client.force_authenticate(self.me)
        response = self.client.post(
            f"/{VERSION}/api/assessments/{a.pk}/images/featured/",
            {"id": i2.pk},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "doesn't belong" in response.data["detail"]
