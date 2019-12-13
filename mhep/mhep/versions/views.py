from django.apps import apps

# from django.conf import settings
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse
from django.views.generic.base import TemplateView


class ListVersionsView(LoginRequiredMixin, TemplateView):
    template_name = "versions/index.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        context = {
            "app_list": self._build_app_list(),
        }

        return context

    def _build_app_list(self):
        def is_mhep_version(app_config):
            name = app_config.name
            return name.startswith("mhep.") and name != "mhep.users"

        def build_dict(app_config):
            return {
                "name": app_config.name,
                "label": app_config.label,
                "verbose_name": app_config.verbose_name,
                "index_url": reverse(f"{app_config.label}:index"),
            }

        return [build_dict(a) for a in filter(is_mhep_version, apps.get_app_configs())]
