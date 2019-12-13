# Generated by Django 2.2.4 on 2019-11-28 11:52

from django.db import migrations, models
import django.db.models.deletion
import mhep.dev.models.image
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("dev", "0006_organisation_admins"),
    ]

    operations = [
        migrations.CreateModel(
            name="Image",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "uuid",
                    models.UUIDField(db_index=True, default=uuid.uuid4, editable=False),
                ),
                (
                    "image",
                    models.ImageField(
                        height_field="height",
                        max_length=200,
                        upload_to=mhep.dev.models.image.Image._image_path,
                        width_field="width",
                    ),
                ),
                ("height", models.IntegerField()),
                ("width", models.IntegerField()),
                (
                    "thumbnail",
                    models.ImageField(
                        max_length=200,
                        upload_to=mhep.dev.models.image.Image._thumbnail_path,
                    ),
                ),
                ("thumbnail_height", models.IntegerField()),
                ("thumbnail_width", models.IntegerField()),
                ("note", models.TextField(blank=True, default="")),
                (
                    "assessment",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="images",
                        to="dev.Assessment",
                    ),
                ),
            ],
        ),
        migrations.AddField(
            model_name="assessment",
            name="featured_image",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="featured_on",
                to="dev.Image",
            ),
        ),
    ]
