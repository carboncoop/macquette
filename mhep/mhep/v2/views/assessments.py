import io
import os

import PIL
from django.core.files.base import ContentFile
from rest_framework import generics
from rest_framework import parsers
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import Assessment
from ..models import Image
from ..permissions import IsAssessmentOwner
from ..permissions import IsMemberOfConnectedOrganisation
from ..serializers import AssessmentFullSerializer
from ..serializers import AssessmentMetadataSerializer
from ..serializers import FeaturedImageSerializer
from ..serializers import ImageSerializer
from .mixins import AssessmentQuerySetMixin


class ListCreateAssessments(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AssessmentMetadataSerializer

    def get_queryset(self, *args, **kwargs):
        return Assessment.objects.all().filter(owner=self.request.user)


class RetrieveUpdateDestroyAssessment(
    AssessmentQuerySetMixin, generics.RetrieveUpdateDestroyAPIView
):
    serializer_class = AssessmentFullSerializer
    permission_classes = [
        IsAuthenticated,
        IsAssessmentOwner | IsMemberOfConnectedOrganisation,
    ]

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if "data" in request.data and obj.status == "Complete":
            return Response(
                {"detail": "can't update data when status is 'complete'"},
                status.HTTP_400_BAD_REQUEST,
            )

        response = super().update(request, *args, **kwargs)

        if response.status_code == status.HTTP_200_OK:
            return Response(None, status.HTTP_204_NO_CONTENT)
        else:
            return response


class DuplicateAssessment(AssessmentQuerySetMixin, generics.GenericAPIView):
    permission_classes = [
        IsAuthenticated,
        IsAssessmentOwner | IsMemberOfConnectedOrganisation,
    ]

    def post(self, request, pk):
        assessment = self.get_object()

        assessment.pk = None
        assessment.name = f"Copy of {assessment.name}"
        assessment.save()

        response = AssessmentMetadataSerializer(assessment).data

        return Response(response, status.HTTP_200_OK)


class SetFeaturedImage(AssessmentQuerySetMixin, generics.GenericAPIView):
    permission_classes = [
        IsAuthenticated,
        IsAssessmentOwner | IsMemberOfConnectedOrganisation,
    ]

    def post(self, request, pk):
        assessment = self.get_object()

        serializer = FeaturedImageSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"detail": "invalid id"}, status.HTTP_400_BAD_REQUEST)

        try:
            image = Image.objects.get(pk=serializer.validated_data["id"])
        except Image.DoesNotExist:
            return Response(
                {"detail": "image ID doesn't exist"}, status.HTTP_400_BAD_REQUEST
            )

        if image not in assessment.images.all():
            return Response(
                {"detail": "image ID provided doesn't belong to this assessment"},
                status.HTTP_400_BAD_REQUEST,
            )

        assessment.featured_image = image
        assessment.save()

        return Response(None, status.HTTP_204_NO_CONTENT)


class UploadAssessmentImage(AssessmentQuerySetMixin, generics.GenericAPIView):
    parser_class = [parsers.FileUploadParser]
    permission_classes = [
        IsAuthenticated,
        IsAssessmentOwner | IsMemberOfConnectedOrganisation,
    ]

    @staticmethod
    def _make_thumbnail(record: Image):
        image = PIL.Image.open(record.image)

        record.width = image.width
        record.height = image.height

        # We paste transparent images onto a new image with a white background,
        # and then use that as our image.  This is because we're saving as JPEG, which
        # famously does not support transparency.
        if image.mode in ["RGBA", "LA"]:
            background = PIL.Image.new(image.mode[:-1], image.size, "white")
            background.paste(image, image.split()[-1])
            image = background

        # 600x600 is a substantial size saving on bigger images while still not looking
        # super-lossy on a high DPI screen
        image.thumbnail((600, 600), PIL.Image.ANTIALIAS)

        # Save thumbnail to in-memory file
        temp_thumb = io.BytesIO()
        image.save(temp_thumb, "JPEG")
        temp_thumb.seek(0)

        # save=False is because otherwise it will run in an infinite loop
        record.thumbnail.save("thumb.jpg", ContentFile(temp_thumb.read()), save=False)
        temp_thumb.close()

        record.thumbnail_width = image.width
        record.thumbnail_height = image.height

    @staticmethod
    def _set_note(record: Image):
        leaf, ext = os.path.splitext(os.path.basename(record.image.name))
        record.note = leaf

    def post(self, request, pk):
        if "file" not in request.FILES:
            return Response({"detail": "no file provided"}, status.HTTP_400_BAD_REQUEST)

        assessment = self.get_object()
        file = request.FILES["file"]
        record = Image(assessment=assessment, image=file)
        self._make_thumbnail(record)
        self._set_note(record)
        record.save()
        response = ImageSerializer(record).data

        return Response(response, status.HTTP_200_OK)
