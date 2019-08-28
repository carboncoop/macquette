from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from mhep.assessments.models import Assessment, Library
from mhep.assessments.serializers import (
    AssessmentFullSerializer,
    AssessmentMetadataSerializer,
    LibrarySerializer
)


class ListCreateAssessments(
  generics.ListCreateAPIView
  ):
    queryset = Assessment.objects.all()
    serializer_class = AssessmentMetadataSerializer


class RetrieveUpdateDestroyAssessment(
  generics.RetrieveUpdateDestroyAPIView,
  ):
    queryset = Assessment.objects.all()
    serializer_class = AssessmentFullSerializer

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)

        if response.status_code == status.HTTP_200_OK:
            return Response(None, status.HTTP_204_NO_CONTENT)
        else:
            return response


class ListCreateLibraries(generics.ListCreateAPIView):
    queryset = Library.objects.all()
    serializer_class = LibrarySerializer


class UpdateLibrary(
  generics.UpdateAPIView,
  ):
    queryset = Library.objects.all()
    serializer_class = LibrarySerializer

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)

        if response.status_code == status.HTTP_200_OK:
            return Response(None, status.HTTP_204_NO_CONTENT)
        else:
            return response


class ListOrganisations(APIView):
    def get(self, request, *args, **kwargs):
        return Response([
            {
                "id": "1",
                "name": "Carbon Coop",
                "assessments": 0,
                "members": [
                    {
                        "userid": "1",
                        "name": "localadmin",
                        "lastactive": "?"
                    }
                ]
            }
        ], status.HTTP_200_OK)


class ListOrganisationAssessments(APIView):
    def get(self, request, *args, **kwargs):
        return Response([], status.HTTP_200_OK)
