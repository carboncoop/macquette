import pathlib
import tempfile

from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from ... import models
from ... import VERSION
from ...serializers import ImageSerializer
from ..factories import AssessmentFactory
from mhep.users.tests.factories import UserFactory

IMG_WIDTH = 400
IMG_HEIGHT = 300


def make_image():
    image = Image.new("RGB", (IMG_WIDTH, IMG_HEIGHT))
    file = tempfile.NamedTemporaryFile(suffix=".jpg")
    image.save(file)
    file.seek(0)
    return file


class TestUploadImage(APITestCase):
    @classmethod
    def setUpClass(cls):
        cls.me = UserFactory.create()
        super().setUpClass()

    def test_no_file(self):
        a = AssessmentFactory.create()

        self.client.force_authenticate(self.me)
        response = self.client.post(f"/{VERSION}/api/assessments/{a.pk}/images/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "no file" in response.data["detail"]

    def test_upload_image(self):
        a = AssessmentFactory.create(owner=self.me)
        file = make_image()

        self.client.force_authenticate(self.me)
        response = self.client.post(
            f"/{VERSION}/api/assessments/{a.pk}/images/",
            {"file": file},
            format="multipart",
        )

        assert response.status_code == status.HTTP_200_OK

        pk = response.data["id"]
        record = models.Image.objects.get(pk=pk)
        assert response.data == ImageSerializer(record).data

        assert response.data["thumbnail_url"].endswith("_thumb.jpg")
        assert response.data["note"] == pathlib.PurePath(file.name).stem

        assert response.data["thumbnail_width"] == IMG_WIDTH
        assert response.data["thumbnail_height"] == IMG_HEIGHT

        assert response.data["thumbnail_width"] <= 600
        assert response.data["thumbnail_height"] <= 600
