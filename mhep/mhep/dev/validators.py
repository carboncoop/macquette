from django.core.exceptions import ValidationError


def validate_dict(value):
    if type(value) is not dict:
        raise ValidationError("This field is not a dict.")
