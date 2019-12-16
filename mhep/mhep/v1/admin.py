from django.contrib import admin
from django.db import models
from django.forms import CheckboxSelectMultiple

from .models import Assessment
from .models import Library
from .models import Organisation


@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = ["name", "status", "owner", "organisation"]
    search_fields = ["name", "description"]


@admin.register(Library)
class LibraryAdmin(admin.ModelAdmin):
    list_display = ["name", "type", "owner", "number_of_items"]
    search_fields = ["name", "type"]

    def number_of_items(self, obj):
        return len(obj.data)


@admin.register(Organisation)
class OrganisationAdmin(admin.ModelAdmin):
    list_display = ["name", "number_of_assessments"]
    search_fields = ["name"]
    formfield_overrides = {models.ManyToManyField: {"widget": CheckboxSelectMultiple}}

    def number_of_assessments(self, obj):
        return obj.assessments.count()
