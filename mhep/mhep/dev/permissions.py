from rest_framework import exceptions
from rest_framework import permissions

from . import VERSION
from .models import Organisation


class IsAssessmentOwner(permissions.BasePermission):
    # https://www.django-rest-framework.org/api-guide/permissions/#custom-permissions
    message = "You are not the owner of the Assessment."

    def has_object_permission(self, request, view, assessment):
        return request.user == assessment.owner


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


class IsAdminOfOrganisation(permissions.BasePermission):
    message = "You are not an admin of the Organisation."

    def has_permission(self, request, view):
        try:
            organisation = Organisation.objects.get(pk=view.kwargs["pk"])
        except Organisation.DoesNotExist:
            raise exceptions.NotFound("Organisation not found")
        return request.user in organisation.admins.all()


class IsLibrarianOfOrganisation(permissions.BasePermission):
    message = "You are not a librarian of the Organisation."

    def has_permission(self, request, view):
        try:
            organisation = Organisation.objects.get(pk=view.kwargs["pk"])
        except Organisation.DoesNotExist:
            raise exceptions.NotFound("Organisation not found")
        return request.user in organisation.librarians.all()


class IsAdminOfAnyOrganisation(permissions.BasePermission):
    message = "You are not an admin of an organisation."

    def has_permission(self, request, view):
        orgs_where_admin = getattr(request.user, f"{VERSION}_organisations_where_admin")

        return orgs_where_admin.count() > 0


class IsReadRequest(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS

    def has_object_permission(self, request, view, library):
        return request.method in permissions.SAFE_METHODS


class IsWriteRequest(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.method not in permissions.SAFE_METHODS

    def has_object_permission(self, request, view, library):
        return request.method not in permissions.SAFE_METHODS


class CanReadLibrary(permissions.BasePermission):
    def has_object_permission(self, request, view, library):
        if library.owner_organisation is None and library.owner_user is None:
            # It's a global library
            return True

        if library.owner_user == request.user:
            return True

        if library.owner_organisation is not None:
            return request.user in library.owner_organisation.members.all()

        return False


class CanWriteLibrary(permissions.BasePermission):
    def has_object_permission(self, request, view, library):
        if library.owner_organisation is None and library.owner_user is None:
            # It's a global library
            return request.user.is_superuser

        if library.owner_user == request.user:
            return True

        if library.owner_organisation is not None:
            return request.user in library.owner_organisation.librarians.all()

        return False
