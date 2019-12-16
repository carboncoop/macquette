import os
from os.path import abspath
from os.path import dirname
from os.path import join

from django.templatetags.static import static

from . import VERSION


def build_static_dictionary():
    """
    calls find_app_static_files() and returns a dictionary for example:
    {
        "js/foo.js": "/static/v1/js/foo.js"
    }

    or even like:
    {
        "js/foo.js": "https://some-cdn.com/static/v1/js/foo.js"
    }

    note that the dictionary value is created by calling the `static` helper, so depends
    on the specific static backend.
    """
    return {fn: static(os.path.join(VERSION, fn)) for fn in find_app_static_files()}


def find_app_static_files():
    """
    traverses the directory tree inside {app}/static/{VERSION}, yielding filenames like
    "js/example.js"  (not "v1/js/example.js")
    "css/foo.css",

    note that the version static subdirectory is stripped
    """

    static_dir = join(abspath(dirname(__file__)), "static", VERSION)

    for root, dirs, files in os.walk(static_dir):
        for fn in files:
            full_filename = join(root, fn)
            start = len(static_dir) + 1
            relative_filename = full_filename[start:]
            # print("relative: {}".format(relative_filename))
            yield relative_filename
