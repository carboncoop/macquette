from rest_framework import exceptions
from rest_framework import status


class BadRequest(exceptions.APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Bad request"
    default_code = "bad_request"
