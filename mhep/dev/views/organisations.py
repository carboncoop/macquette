from django.contrib.auth import get_user_model
from rest_framework import exceptions
from rest_framework import generics
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .. import VERSION
from ..models import Assessment
from ..models import Library
from ..models import Organisation
from ..permissions import IsAdminOfOrganisation
from ..permissions import IsLibrarianOfOrganisation
from ..permissions import IsMemberOfOrganisation
from ..serializers import AssessmentMetadataSerializer
from ..serializers import LibrarySerializer
from ..serializers import OrganisationLibrarianSerializer
from ..serializers import OrganisationMemberSerializer
from ..serializers import OrganisationMetadataSerializer
from ..serializers import OrganisationSerializer
from .exceptions import BadRequest

User = get_user_model()


class AddURLOrganisationToSerializerContextMixin:
    def get_serializer_context(self):
        context = super().get_serializer_context()
        try:
            context["organisation"] = Organisation.objects.get(id=self.kwargs["pk"])
        except Organisation.DoesNotExist:
            raise exceptions.NotFound("Organisation not found")

        return context


class ListOrganisations(generics.ListAPIView):
    serializer_class = OrganisationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self, *args, **kwargs):
        return getattr(self.request.user, f"{VERSION}_organisations").all()


class ListCreateOrganisationAssessments(
    AddURLOrganisationToSerializerContextMixin, generics.ListCreateAPIView
):

    permission_classes = [IsAuthenticated, IsMemberOfOrganisation]
    serializer_class = AssessmentMetadataSerializer

    def get_queryset(self, **kwargs):
        try:
            return Assessment.objects.all().filter(
                organisation=Organisation.objects.get(id=self.kwargs["pk"])
            )
        except Organisation.DoesNotExist:
            raise exceptions.NotFound("Organisation not found")


class CreateOrganisationLibraries(
    AddURLOrganisationToSerializerContextMixin, generics.CreateAPIView
):

    serializer_class = LibrarySerializer
    permission_classes = [IsAuthenticated, IsLibrarianOfOrganisation]

    def get_queryset(self, *args, **kwargs):
        org = self.get_object()

        return getattr(org, f"{VERSION}_libraries").all()


class CreateDeleteOrganisationLibrarians(generics.UpdateAPIView):
    serializer_class = OrganisationLibrarianSerializer
    permission_classes = [IsAuthenticated, IsAdminOfOrganisation]

    def get_queryset(self, *args, **kwargs):
        return getattr(self.request.user, f"{VERSION}_organisations")

    def _get_user(self, userid):
        try:
            return User.objects.get(id=userid)
        except User.DoesNotExist:
            raise exceptions.NotFound(detail=f"No such user: id={userid}")

    def post(self, request, pk, userid):
        org = self.get_object()
        user = self._get_user(userid)

        if user not in org.members.all():
            raise BadRequest(detail=f"{user} is not a member of {org}")

        org.librarians.add(user)
        return Response("", status=status.HTTP_204_NO_CONTENT)

    def delete(self, request, pk, userid):
        org = self.get_object()
        user = self._get_user(userid)

        org.librarians.remove(user)
        return Response("", status=status.HTTP_204_NO_CONTENT)


class CreateDeleteOrganisationMembers(generics.UpdateAPIView):
    serializer_class = OrganisationMemberSerializer
    permission_classes = [IsAuthenticated, IsAdminOfOrganisation]

    def get_queryset(self, *args, **kwargs):
        return getattr(self.request.user, f"{VERSION}_organisations")

    def _get_user(self, userid):
        try:
            return User.objects.get(id=userid)
        except User.DoesNotExist:
            raise exceptions.NotFound(detail=f"No such user: id={userid}")

    def post(self, request, pk, userid):
        org = self.get_object()
        user = self._get_user(userid)

        org.members.add(user)
        return Response("", status=status.HTTP_204_NO_CONTENT)

    def delete(self, request, pk, userid):
        org = self.get_object()
        user = self._get_user(userid)

        org.admins.remove(user)
        org.librarians.remove(user)

        org.members.remove(user)
        return Response("", status=status.HTTP_204_NO_CONTENT)


class GetOrganisationLibraryMixin:
    def _get_organisation_library(self, organisation, library_id):
        """
        returns a library matching `library_id` that is also owned by `organisation`
        """
        try:
            return organisation.libraries.get(id=library_id)
        except Library.DoesNotExist:
            raise exceptions.NotFound(
                detail=f"organisation doesn't have a library with id={library_id}"
            )


class ShareUnshareOrganisationLibraries(
    GetOrganisationLibraryMixin,
    generics.UpdateAPIView,  # UpdateAPIView acts on the Organisation model
):
    serializer_class = OrganisationLibrarianSerializer
    permission_classes = [IsAuthenticated, IsAdminOfOrganisation]

    def get_queryset(self, *args, **kwargs):
        return getattr(self.request.user, f"{VERSION}_organisations")

    def _get_other_organisation(self, other_org_id):
        try:
            return Organisation.objects.get(id=other_org_id)
        except Organisation.DoesNotExist:
            raise exceptions.NotFound(
                detail="can't share library with non-existent organisation: id=9999"
            )

    def post(self, request, pk, otherorgid, libraryid):
        share_from_org = (
            self.get_object()
        )  # performs permission checks for organisation
        share_to_org = self._get_other_organisation(otherorgid)
        library = self._get_organisation_library(share_from_org, libraryid)

        library.shared_with.add(share_to_org)
        return Response("", status=status.HTTP_204_NO_CONTENT)

    def delete(self, request, pk, otherorgid, libraryid):
        share_from_org = (
            self.get_object()
        )  # performs permission checks for organisation
        share_to_org = self._get_other_organisation(otherorgid)
        library = self._get_organisation_library(share_from_org, libraryid)

        library.shared_with.remove(share_to_org)
        return Response("", status=status.HTTP_204_NO_CONTENT)


class ListOrganisationLibraryShares(GetOrganisationLibraryMixin, generics.ListAPIView):
    """
    for a given organisation library, this list the other organisations that this library is
    shared with
    """

    serializer_class = OrganisationMetadataSerializer
    permission_classes = [IsAuthenticated, IsAdminOfOrganisation]

    def get_queryset(self, *args, **kwargs):
        """
        look up the organisation library, and return the organisations that it's shared with
        """
        try:
            shared_from_org = Organisation.objects.get(id=self.kwargs["pk"])
        except Organisation.DoesNotExist:
            raise exceptions.NotFound(
                detail="can't list shares for non-existent organisation: id=9999"
            )

        library = self._get_organisation_library(
            shared_from_org, self.kwargs["libraryid"]
        )
        return library.shared_with.all()
