from django.conf import settings
from django.contrib.postgres.fields import JSONField
from django.db import models
from django.db.models import Q

from ..validators import validate_dict
from .organisation import Organisation


class Library(models.Model):
    owner_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="%(app_label)s_libraries",
    )

    owner_organisation = models.ForeignKey(
        Organisation,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="libraries",
    )

    shared_with = models.ManyToManyField(
        Organisation,
        blank=True,
        related_name="libraries_shared_with",
        help_text=(
            "Sharing the library with another organisation gives members of that organisation "
            "read-only access: they can use the library but not update it."
        ),
    )

    name = models.TextField()
    type = models.TextField()
    data = JSONField(default=dict, validators=[validate_dict])

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"#{self.name} - {self.type}"

    class Meta:
        verbose_name_plural = "libraries"

        constraints = [
            models.CheckConstraint(
                check=(Q(owner_user__isnull=False) & Q(owner_organisation__isnull=True))
                | (Q(owner_user__isnull=True) & Q(owner_organisation__isnull=False))
                | (Q(owner_user__isnull=True) & Q(owner_organisation__isnull=True)),
                name="owner_cant_be_both_user_and_organisation",
            )
        ]
