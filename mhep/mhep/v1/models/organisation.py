from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Organisation(models.Model):
    name = models.TextField()
    members = models.ManyToManyField(
        User, blank=True, related_name="%(app_label)s_organisations",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
