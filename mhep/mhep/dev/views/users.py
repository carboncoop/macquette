from django.contrib.auth import get_user_model
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from ..permissions import IsAdminOfAnyOrganisation
from ..serializers import UserSerializer

User = get_user_model()


class ListUsers(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminOfAnyOrganisation]

    def get_queryset(self, *args, **kwargs):
        return User.objects.all()
