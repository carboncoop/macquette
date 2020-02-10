import datetime

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Assessment
from .models import Image
from .models import Library
from .models import Organisation

User = get_user_model()


class AuthorUserIDMixin:
    def get_author(self, obj):
        return obj.owner.username

    def get_userid(self, obj):
        return "{:d}".format(obj.owner.id)


class StringIDMixin:
    def get_id(self, obj):
        return "{:d}".format(obj.id)


class MdateMixin:
    def get_mdate(self, obj):
        return "{:d}".format(int(datetime.datetime.timestamp(obj.updated_at)))


class ImagesMixin:
    def get_images(self, obj):
        if obj.featured_image is not None:
            featured_id = obj.featured_image.id
        else:
            featured_id = None

        s = ImageSerializer(obj.images, context={"featured_id": featured_id}, many=True)
        return s.data


class IsFeaturedMixin:
    def get_is_featured(self, obj):
        if "featured_id" in self.context:
            return self.context["featured_id"] == obj.id
        else:
            return False


class ImageSerializer(IsFeaturedMixin, serializers.ModelSerializer):
    url = serializers.URLField(source="image.url")
    thumbnail_url = serializers.URLField(source="thumbnail.url")
    is_featured = serializers.SerializerMethodField()

    class Meta:
        model = Image
        fields = [
            "id",
            "url",
            "width",
            "height",
            "thumbnail_url",
            "thumbnail_width",
            "thumbnail_height",
            "note",
            "is_featured",
        ]


class FeaturedImageSerializer(serializers.Serializer):
    id = serializers.IntegerField()


class ImageUpdateSerializer(serializers.Serializer):
    note = serializers.CharField(max_length=200)


class AssessmentMetadataSerializer(
    MdateMixin, StringIDMixin, AuthorUserIDMixin, serializers.ModelSerializer
):

    author = serializers.SerializerMethodField()
    userid = serializers.SerializerMethodField()
    id = serializers.SerializerMethodField()
    mdate = serializers.SerializerMethodField()

    def create(self, validated_data):
        validated_data["owner"] = self.context["request"].user
        validated_data["organisation"] = self.context.get("organisation", None)
        return super().create(validated_data)

    class Meta:
        model = Assessment
        fields = [
            "id",
            "name",
            "description",
            "status",
            "created_at",
            "updated_at",
            "author",
            "userid",
            "mdate",
        ]


class AssessmentFullSerializer(ImagesMixin, AssessmentMetadataSerializer):
    """
    Identical to AssessmentMetadataSerializer except that it includes the `data` and
    `images` fields
    """

    images = serializers.SerializerMethodField()

    class Meta:
        model = Assessment
        fields = [
            "id",
            "name",
            "description",
            "status",
            "created_at",
            "updated_at",
            "author",
            "userid",
            "mdate",
            "images",
            "data",
        ]


class LibrarySerializer(StringIDMixin, serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    owner = serializers.SerializerMethodField()

    class Meta:
        model = Library
        fields = [
            "id",
            "name",
            "type",
            "data",
            "created_at",
            "updated_at",
            "permissions",
            "owner",
        ]

    def get_permissions(self, library):
        from .views.helpers import (
            check_library_write_permissions,
            check_library_share_permissions,
        )

        return {
            "can_write": check_library_write_permissions(
                library, self.context["request"]
            ),
            "can_share": check_library_share_permissions(
                library, self.context["request"]
            ),
        }

    def get_owner(self, obj):
        owner_organisation = obj.owner_organisation
        owner_user = obj.owner_user
        if owner_organisation is not None:
            return {
                "type": "organisation",
                "id": f"{owner_organisation.id}",
                "name": owner_organisation.name,
            }
        elif owner_user is not None:
            return {
                "type": "personal",
                "id": f"{owner_user.id}",
                "name": owner_user.username,
            }
        else:
            return {"type": "global", "id": None, "name": "Global"}

    def create(self, validated_data):
        organisation = self.context.get("organisation", None)
        if organisation is not None:
            validated_data["owner_organisation"] = organisation
        else:
            validated_data["owner_user"] = self.context["request"].user
        return super().create(validated_data)


class LibraryItemSerializer(serializers.Serializer):
    tag = serializers.CharField(max_length=100)
    item = serializers.DictField(allow_empty=False)


class OrganisationSerializer(StringIDMixin, serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    assessments = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()

    class Meta:
        model = Organisation
        fields = [
            "id",
            "name",
            "assessments",
            "members",
            "permissions",
            "report_template",
        ]

    def get_assessments(self, obj):
        return obj.assessments.count()

    def get_members(self, org):
        def userinfo(user):
            return {
                "id": f"{user.id}",
                "name": user.username,
                "last_login": user.last_login.isoformat()
                if user.last_login
                else "never",
                "is_admin": user in org.admins.all(),
                "is_librarian": user in org.librarians.all(),
            }

        return [userinfo(u) for u in org.members.all()]

    def get_permissions(self, org):
        user = self.context["request"].user
        return {
            "can_add_remove_members": user in org.admins.all(),
            "can_promote_demote_librarians": user in org.admins.all(),
        }


class OrganisationMetadataSerializer(OrganisationSerializer):
    """
    OrganisationMetadataSerializer serializes the id and name of an organisation.
    """

    class Meta:
        model = Organisation
        fields = ["id", "name"]


class UserSerializer(StringIDMixin, serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "name"]

    def get_name(self, user):
        return user.username


class OrganisationLibrarianSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organisation
        fields = []


class OrganisationMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organisation
        fields = []
