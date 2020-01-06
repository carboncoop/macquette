from django.apps import AppConfig

from . import VERSION


class AssessmentsConfig(AppConfig):
    name = f"mhep.{VERSION}"
    verbose_name = f"Assessments {VERSION}"
    release_date = "January 2020"
