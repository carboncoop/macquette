from django.conf import settings
from django.contrib.postgres.fields import JSONField
from django.db import models

from ..validators import validate_dict


class Library(models.Model):
    class Meta:
        verbose_name_plural = "libraries"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=False,
        blank=False,
        on_delete=models.PROTECT,
        related_name="%(app_label)s_libraries",
    )

    name = models.TextField()
    type = models.TextField()
    data = JSONField(default=dict, validators=[validate_dict])

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"#{self.name} - {self.type}"
