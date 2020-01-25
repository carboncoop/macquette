from django.contrib.auth import get_user_model
from django.contrib.postgres.fields import JSONField
from django.db import models

User = get_user_model()


class Organisation(models.Model):
    name = models.TextField()
    members = models.ManyToManyField(
        User, blank=True, related_name="%(app_label)s_organisations"
    )
    librarians = models.ManyToManyField(
        User, blank=True, related_name="%(app_label)s_organisations_where_librarian"
    )

    admins = models.ManyToManyField(
        User, blank=True, related_name="%(app_label)s_organisations_where_admin"
    )

    report = JSONField(default=dict, blank=True)
    report_template = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
