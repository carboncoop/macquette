from rest_framework import status
from rest_framework.test import APITestCase

from .. import factories
from ... import models
from ... import serializers
from ... import VERSION
from mhep.users.tests.factories import UserFactory


class TestEditImageNote(APITestCase):
    @classmethod
    def setUpClass(cls):
        cls.me = UserFactory.create()
        super().setUpClass()

    def test_valid_note(self):
        a = factories.AssessmentFactory.create(owner=self.me)
        i1 = factories.ImageFactory.create(assessment=a)

        self.client.force_authenticate(self.me)
        response = self.client.patch(
            f"/{VERSION}/api/images/{i1.pk}/",
            {"note": "Althusser's front door"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        i1.refresh_from_db()
        assert response.data == serializers.ImageSerializer(i1).data

    def test_not_my_assessment(self):
        someone_else = UserFactory.create()

        a = factories.AssessmentFactory.create(owner=someone_else)
        i1 = factories.ImageFactory.create(assessment=a)

        self.client.force_authenticate(self.me)
        response = self.client.patch(
            f"/{VERSION}/api/images/{i1.pk}/",
            {"note": "Judith Butler's porch"},
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_null_note_not_allowed(self):
        a = factories.AssessmentFactory.create(owner=self.me)
        i1 = factories.ImageFactory.create(assessment=a)

        self.client.force_authenticate(self.me)
        response = self.client.patch(
            f"/{VERSION}/api/images/{i1.pk}/", {"note": None}, format="json"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestDeleteImage(APITestCase):
    @classmethod
    def setUpClass(cls):
        cls.me = UserFactory.create()
        super().setUpClass()

    def test_valid_image(self):
        a = factories.AssessmentFactory.create(owner=self.me)
        i1 = factories.ImageFactory.create(assessment=a)

        self.client.force_authenticate(self.me)
        response = self.client.delete(f"/{VERSION}/api/images/{i1.pk}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert models.Image.objects.filter(pk=i1.id).count() == 0

    def test_not_my_assessment(self):
        someone_else = UserFactory.create()

        a = factories.AssessmentFactory.create(owner=someone_else)
        i1 = factories.ImageFactory.create(assessment=a)

        self.client.force_authenticate(self.me)
        response = self.client.delete(f"/{VERSION}/api/images/{i1.pk}/")

        assert response.status_code == status.HTTP_403_FORBIDDEN
