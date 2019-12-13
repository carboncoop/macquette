import json
import logging

from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import DetailView
from django.views.generic.base import TemplateView

from rest_framework import generics, exceptions
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Assessment, Organisation
from .permissions import (
    IsMemberOfConnectedOrganisation,
    IsMemberOfOrganisation,
    IsAssessmentOwner,
    IsLibraryOwner,
)
from .serializers import (
    AssessmentFullSerializer,
    AssessmentMetadataSerializer,
    LibraryItemSerializer,
    LibrarySerializer,
    OrganisationSerializer,
)

from . import VERSION
from .helpers import build_static_dictionary

STATIC_URLS = build_static_dictionary()


class AssessmentQuerySetMixin:
    def get_queryset(self, *args, **kwargs):
        my_assessments = Assessment.objects.filter(owner=self.request.user)
        assessments_in_my_organisations = Assessment.objects.filter(
            organisation__in=getattr(
                self.request.user, f"{VERSION}_organisations"
            ).all()
        )
        return my_assessments | assessments_in_my_organisations


class BadRequest(exceptions.APIException):
    status_code = status.HTTP_400_BAD_REQUEST


class CommonContextMixin:
    def get_context_data(self, object=None, **kwargs):
        context = super().get_context_data(**kwargs)
        context["VERSION"] = VERSION
        context["static_urls"] = json.dumps(STATIC_URLS, indent=4)
        return context


class AssessmentHTMLView(
    CommonContextMixin, AssessmentQuerySetMixin, LoginRequiredMixin, DetailView
):
    template_name = f"{VERSION}/view.html"
    context_object_name = "assessment"
    model = Assessment

    def get_context_data(self, object=None, **kwargs):
        context = super().get_context_data(**kwargs)

        locked = object.status == "Completed"

        context["locked_javascript"] = json.dumps(locked)
        context["reports_javascript"] = json.dumps([])
        context["use_image_gallery"] = False
        return context


class ListAssessmentsHTMLView(CommonContextMixin, LoginRequiredMixin, TemplateView):
    template_name = f"{VERSION}/assessments.html"


class ListCreateAssessments(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AssessmentMetadataSerializer

    def get_queryset(self, *args, **kwargs):
        return Assessment.objects.all().filter(owner=self.request.user)


class RetrieveUpdateDestroyAssessment(
    AssessmentQuerySetMixin, generics.RetrieveUpdateDestroyAPIView,
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


class ListCreateLibraries(generics.ListCreateAPIView):
    serializer_class = LibrarySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self, *args, **kwargs):
        return getattr(self.request.user, f"{VERSION}_libraries").all()


class UpdateDestroyLibrary(
    generics.UpdateAPIView, generics.DestroyAPIView,
):
    serializer_class = LibrarySerializer
    permission_classes = [
        # IsAuthenticated will ensure we can filter (using get_queryset) based on User.libraries
        # (which is the reverse of Library.owner)
        IsAuthenticated,
        IsLibraryOwner,
    ]

    def get_queryset(self, *args, **kwargs):
        return getattr(self.request.user, f"{VERSION}_libraries").all()

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)

        if response.status_code == status.HTTP_200_OK:
            return Response(None, status.HTTP_204_NO_CONTENT)
        else:
            return response


class ListOrganisations(generics.ListAPIView):
    serializer_class = OrganisationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self, *args, **kwargs):
        return getattr(self.request.user, f"{VERSION}_organisations").all()


class CreateUpdateDeleteLibraryItem(generics.GenericAPIView,):
    serializer_class = LibraryItemSerializer
    permission_classes = [
        IsAuthenticated,
        IsLibraryOwner,
    ]

    def get_queryset(self, *args, **kwargs):
        return getattr(self.request.user, f"{VERSION}_libraries").all()

    def post(self, request, pk):
        serializer = self.get_serializer_class()(data=request.data)
        if not serializer.is_valid():
            print(serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        tag = serializer.validated_data["tag"]
        item = serializer.validated_data["item"]

        library = self.get_object()

        if isinstance(library.data, str):
            d = json.loads(library.data)
        else:
            d = library.data

        if tag in d:
            logging.warning(f"tag {tag} already exists in library {library.id}")
            raise BadRequest(f"tag `{tag}` already exists in library {library.id}",)

        d[tag] = item
        library.data = d
        library.save()
        return Response("", status=status.HTTP_204_NO_CONTENT)

    def delete(self, request, pk, tag):
        library = self.get_object()

        if isinstance(library.data, str):
            d = json.loads(library.data)
        else:
            d = library.data

        if tag not in d:
            raise exceptions.NotFound(f"tag `{tag}` not found in library {library.id}")

        del d[tag]
        library.data = d
        library.save()
        return Response("", status=status.HTTP_204_NO_CONTENT)

    def put(self, request, pk, tag):
        library = self.get_object()

        if isinstance(library.data, str):
            d = json.loads(library.data)
        else:
            d = library.data

        if tag not in d:
            raise exceptions.NotFound(f"tag `{tag}` not found in library {library.id}")

        d[tag] = request.data
        library.data = d
        library.save()
        return Response("", status=status.HTTP_204_NO_CONTENT)


class ListCreateOrganisationAssessments(generics.ListCreateAPIView):
    permission_classes = [
        IsAuthenticated,
        IsMemberOfOrganisation,
    ]
    serializer_class = AssessmentMetadataSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        try:
            context["organisation"] = Organisation.objects.get(id=self.kwargs["pk"])
        except Organisation.DoesNotExist:
            raise exceptions.NotFound("Organisation not found")

        return context

    def get_queryset(self, **kwargs):
        try:
            return Assessment.objects.all().filter(
                organisation=Organisation.objects.get(id=self.kwargs["pk"])
            )
        except Organisation.DoesNotExist:
            raise exceptions.NotFound("Organisation not found")
