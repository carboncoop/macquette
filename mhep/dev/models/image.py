import pathlib
import uuid as uuid_lib

from django.db import models

from .assessment import Assessment


class Image(models.Model):
    """
    An image, that belongs to an assessment.
    """

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    uuid = models.UUIDField(db_index=True, default=uuid_lib.uuid4, editable=False)

    assessment = models.ForeignKey(
        Assessment,
        null=False,
        blank=False,
        on_delete=models.CASCADE,
        related_name="images",
    )

    def _image_path(self, filename):
        extension = pathlib.PurePath(filename).suffix
        return f"images/{self.uuid}{extension}"

    def _thumbnail_path(self, filename):
        extension = pathlib.PurePath(filename).suffix
        return f"images/{self.uuid}_thumb{extension}"

    image = models.ImageField(upload_to=_image_path, max_length=200)
    height = models.IntegerField()
    width = models.IntegerField()

    thumbnail = models.ImageField(upload_to=_thumbnail_path, max_length=200)
    thumbnail_height = models.IntegerField()
    thumbnail_width = models.IntegerField()

    note = models.TextField(blank=True, default="")

    def __str__(self):
        return f"#{self.id}: {self.note}"
