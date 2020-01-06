import json

from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import DetailView
from django.views.generic.base import TemplateView

from .. import VERSION
from ..models import Assessment
from .helpers import build_static_dictionary
from .mixins import AssessmentQuerySetMixin

STATIC_URLS = build_static_dictionary()


class CommonContextMixin:
    def get_context_data(self, object=None, **kwargs):
        context = super().get_context_data(**kwargs)
        context["VERSION"] = VERSION
        context["static_urls"] = json.dumps(STATIC_URLS, indent=4)
        return context


class AssessmentHTMLView(
    CommonContextMixin, AssessmentQuerySetMixin, LoginRequiredMixin, DetailView
):
    template_name = f"{VERSION}/view.html"
    context_object_name = "assessment"
    model = Assessment

    def get_context_data(self, object=None, **kwargs):
        context = super().get_context_data(**kwargs)

        locked = object.status == "Completed"

        context["locked_javascript"] = json.dumps(locked)
        context["reports_javascript"] = json.dumps([])
        return context


class ListAssessmentsHTMLView(CommonContextMixin, LoginRequiredMixin, TemplateView):
    template_name = f"{VERSION}/assessments.html"
