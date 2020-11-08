import pytest

from ..serializers import LibrarySerializer
from ..tests.factories import LibraryFactory
from ..tests.factories import OrganisationFactory
from mhep.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db


class TestLibrarySerializer:
    def test_get_owner_for_personal_library(self):
        person = UserFactory.create()
        library = LibraryFactory.create(owner_user=person, owner_organisation=None)

        got = LibrarySerializer().get_owner(library)

        expected = {
            "type": "personal",
            "id": f"{person.id}",
            "name": f"{person.username}",
        }

        assert expected == got

    def test_get_owner_for_organisation_library(self):
        org = OrganisationFactory.create()
        library = LibraryFactory.create(owner_user=None, owner_organisation=org)

        got = LibrarySerializer().get_owner(library)

        expected = {"type": "organisation", "id": f"{org.id}", "name": f"{org.name}"}

        assert expected == got

    def test_get_owner_for_global_library(self):
        library = LibraryFactory.create(owner_user=None, owner_organisation=None)

        got = LibrarySerializer().get_owner(library)

        expected = {"type": "global", "id": None, "name": "Global"}

        assert expected == got
