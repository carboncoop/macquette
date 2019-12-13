from typing import Dict

from django.conf import settings as django_settings


def settings(request) -> Dict:
    return {"settings": {"sentry_url": django_settings.SENTRY_DSN}}
