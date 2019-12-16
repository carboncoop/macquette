from django.apps import apps
from django.conf import settings
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse
from django.views.generic.base import TemplateView


class ListVersionsView(LoginRequiredMixin, TemplateView):
    template_name = "versions/index.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        context = {"app_list": self._build_app_list()}

        return context

    def _build_app_list(self):
        def is_mhep_version(app_config):
            name = app_config.name
            if not name.startswith("mhep.") or name == "mhep.users":
                return False

            if settings.ENV == "production" and ("dev" in app_config.verbose_name):
                return False

            return True

        def build_dict(app_config):
            version = app_config.verbose_name
            if version.startswith("Assessments v"):
                name = f"MHEP {version.split('v')[1]}"
            elif version.startswith("Assessments "):
                name = "Development"

            return {
                "name": name,
                "index_url": reverse(f"{app_config.label}:index"),
                "release_date": app_config.release_date,
            }

        return [build_dict(a) for a in filter(is_mhep_version, apps.get_app_configs())]
