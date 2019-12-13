import factory

from typing import Any, Sequence

from ..models import Assessment, Library, Organisation
from mhep.users.tests.factories import UserFactory


from faker.providers import BaseProvider


# create new provider class. Note that the class name _must_ be ``Provider``.
class Provider(BaseProvider):
    def dict(self):
        from faker import Faker

        fake = Faker()
        return {fake.word(): fake.sentence()}


factory.Faker.add_provider(Provider)


class AssessmentFactory(factory.DjangoModelFactory):
    name = factory.Faker("sentence")
    description = factory.Faker("paragraph")
    status = "In progress"
    data = factory.Faker("dict")
    owner = factory.SubFactory(UserFactory)

    class Meta:
        model = Assessment


class LibraryFactory(factory.DjangoModelFactory):
    name = "Standard Library - exampleuser"
    type = "generation_measures"
    data = {}
    owner = factory.SubFactory(UserFactory)

    class Meta:
        model = Library


class OrganisationFactory(factory.DjangoModelFactory):
    name = factory.Faker("company")

    class Meta:
        model = Organisation


class OrganisationWithExtrasFactory(OrganisationFactory):
    "Creates an Organisation with 1 member and 1 assessment"

    @factory.post_generation
    def assessments(self, create: bool, extracted: Sequence[Any], **kwargs):
        from mhep.users.tests.factories import UserFactory

        self._assessment_owner = UserFactory.create()
        self.assessments.add(AssessmentFactory.create(owner=self._assessment_owner))

    @factory.post_generation
    def members(self, create: bool, extracted: Sequence[Any], **kwargs):
        self.members.add(self._assessment_owner)
