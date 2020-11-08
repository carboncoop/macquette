import pytest

from mhep.v1.models import Assessment
from mhep.v1.models import Library
from mhep.v1.models import Organisation
from mhep.v1.tests.factories import AssessmentFactory
from mhep.v1.tests.factories import LibraryFactory
from mhep.v1.tests.factories import OrganisationFactory
from mhep.v1.tests.factories import OrganisationWithExtrasFactory


@pytest.fixture
def assessment() -> Assessment:
    return AssessmentFactory()


@pytest.fixture
def library() -> Library:
    return LibraryFactory()


@pytest.fixture
def organisation() -> Organisation:
    return OrganisationFactory()


@pytest.fixture
def organisation_with_extras() -> Organisation:
    return OrganisationWithExtrasFactory()
