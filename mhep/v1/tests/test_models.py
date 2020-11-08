import pytest

from .. import VERSION
from ..models import Organisation
from ..tests.factories import OrganisationFactory
from ..tests.factories import UserFactory

pytestmark = pytest.mark.django_db


def test_organisation_assessments(organisation_with_extras: Organisation):
    assert organisation_with_extras.assessments.all().count() == 1


def test_organisations_related_name_on_user_model():
    user = UserFactory.create()
    org = OrganisationFactory.create()

    org.members.add(user)
    # Organisation.members is the forward relationship
    # and User.{version}_organisations is the reverse

    assert getattr(user, f"{VERSION}_organisations").all().count() == 1
