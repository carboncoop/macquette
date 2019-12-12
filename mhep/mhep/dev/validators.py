from django.core.exceptions import ValidationError


def validate_dict(value):
    if type(value) is not dict:
        raise ValidationError("This field is not a dict.")


def validate_report(d):
    REQUIRED_FIELDS = ["logo", "colour"]

    for field in REQUIRED_FIELDS:
        if field not in d:
            raise ValidationError(f"Report must have field named {field}.")
