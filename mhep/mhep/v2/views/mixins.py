from . import helpers


class AssessmentQuerySetMixin:
    def get_queryset(self, *args, **kwargs):
        return helpers.get_assessments_for_user(self.request.user)
