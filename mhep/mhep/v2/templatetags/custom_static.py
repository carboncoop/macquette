from django import template
from django.templatetags.static import StaticNode

register = template.Library()


@register.tag()
def custom_static(parser, token):
    return StaticNode.handle_token(parser, token)
