from django.conf import settings
from django.contrib.postgres.fields import JSONField
from django.db import models

from ..validators import validate_dict

STATUS_CHOICES = [
    ("Complete", "Complete"),
    ("In progress", "In progress"),
    ("Test", "Test"),
]


class Assessment(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=False,
        blank=False,
        on_delete=models.PROTECT,
        related_name="%(app_label)s_assessments",
    )

    organisation = models.ForeignKey(
        "Organisation",
        null=True,
        blank=True,
        default=None,
        on_delete=models.SET_NULL,
        related_name="assessments",
    )

    name = models.TextField()
    description = models.TextField(blank=True)

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="In progress"
    )

    featured_image = models.ForeignKey(
        "Image",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="featured_on",
    )

    data = JSONField(default=dict, validators=[validate_dict])

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"#{self.id}: {self.name}"
