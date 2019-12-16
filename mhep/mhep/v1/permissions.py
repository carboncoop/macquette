from rest_framework import exceptions
from rest_framework import permissions

from .models import Organisation


class IsAssessmentOwner(permissions.BasePermission):
    # https://www.django-rest-framework.org/api-guide/permissions/#custom-permissions
    message = "You are not the owner of the Assessment."

    def has_object_permission(self, request, view, assessment):
        return request.user == assessment.owner


class IsLibraryOwner(permissions.BasePermission):
    message = "You are not the owner of the Library."

    def has_object_permission(self, request, view, library):
        return request.user == library.owner


class IsMemberOfConnectedOrganisation(permissions.BasePermission):
    message = "You are not a member of the Assessment's Organisation."

    def has_object_permission(self, request, view, assessment):
        if assessment.organisation is None:
            return False

        return request.user in assessment.organisation.members.all()


class IsMemberOfOrganisation(permissions.BasePermission):
    message = "You are not a member of the Organisation."

    def has_permission(self, request, view):
        try:
            organisation = Organisation.objects.get(pk=view.kwargs["pk"])
        except Organisation.DoesNotExist:
            raise exceptions.NotFound("Organisation not found")
        return request.user in organisation.members.all()
