from rest_framework import generics
from rest_framework import permissions
from rest_framework import status
from rest_framework.response import Response

from . import helpers
from .. import models
from .. import serializers


class UpdateDestroyImage(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    queryset = models.Image.objects

    def delete(self, request, pk):
        image = self.get_object()

        allowed_assessments = helpers.get_assessments_for_user(request.user)
        if image.assessment not in allowed_assessments:
            return Response(None, status.HTTP_403_FORBIDDEN)

        image.delete()

        return Response(None, status.HTTP_204_NO_CONTENT)

    def patch(self, request, pk):
        image = self.get_object()

        allowed_assessments = helpers.get_assessments_for_user(request.user)
        if image.assessment not in allowed_assessments:
            return Response(None, status.HTTP_403_FORBIDDEN)

        serializer = serializers.ImageUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"detail": serializer.errors}, status.HTTP_400_BAD_REQUEST)

        image.note = serializer.validated_data["note"]
        image.save()

        response = serializers.ImageSerializer(image).data
        return Response(response, status.HTTP_200_OK)
