from ...views.helpers import build_static_dictionary


def test_build_static_dictionary_returns_some_files():
    d = build_static_dictionary()

    assert len(d.keys()) > 10
