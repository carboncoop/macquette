import datetime

from rest_framework import serializers

from .models import Assessment
from .models import Library
from .models import Organisation


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
            "openbem_version",
            "status",
            "created_at",
            "updated_at",
            "author",
            "userid",
            "mdate",
        ]


class AssessmentFullSerializer(AssessmentMetadataSerializer):
    """
    Identical to AssessmentMetadataSerializer except that it includes the `data` field"
    """

    class Meta:
        model = Assessment
        fields = [
            "id",
            "name",
            "description",
            "openbem_version",
            "status",
            "created_at",
            "updated_at",
            "author",
            "userid",
            "mdate",
            "data",
        ]


class LibrarySerializer(StringIDMixin, serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    writeable = serializers.SerializerMethodField()

    class Meta:
        model = Library
        fields = ["id", "name", "type", "data", "created_at", "updated_at", "writeable"]

    def get_writeable(self, obj):
        return True

    def create(self, validated_data):
        validated_data["owner"] = self.context["request"].user
        return super().create(validated_data)


class LibraryItemSerializer(serializers.Serializer):
    tag = serializers.CharField(max_length=100)
    item = serializers.DictField(allow_empty=False)


class OrganisationSerializer(StringIDMixin, serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    assessments = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()

    class Meta:
        model = Organisation
        fields = ["id", "name", "assessments", "members"]

    def get_assessments(self, obj):
        return obj.assessments.count()

    def get_members(self, obj):
        def userinfo(user):
            return {
                "userid": f"{user.id}",
                "name": user.username,
                "last_login": user.last_login.isoformat()
                if user.last_login
                else "never",
            }

        return [userinfo(u) for u in obj.members.all()]
