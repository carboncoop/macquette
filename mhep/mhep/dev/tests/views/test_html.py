from django.conf import settings
from django.test import TestCase
from django.urls import reverse
from django import http

from rest_framework import status

from ... import VERSION
from ..factories import AssessmentFactory, OrganisationFactory

from mhep.users.tests.factories import UserFactory


class TestListAssessmentsHTMLView(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.me = UserFactory()
        cls.me.set_password("foo")
        cls.me.save()
        cls.my_assessment = AssessmentFactory.create(owner=cls.me)

    def test_logged_out_users_get_redirected_to_log_in(self):
        login_url = settings.LOGIN_URL
        my_assessments_url = reverse(f"{VERSION}:list-assessments")

        response = self.client.get(my_assessments_url)

        assert type(response) == http.response.HttpResponseRedirect
        assert response.url == f"{login_url}?next={my_assessments_url}"

    def test_returns_200_for_logged_in_user_viewing_own_assessment(self):
        self.client.login(username=self.me.username, password="foo")
        my_assessments_url = reverse(f"{VERSION}:list-assessments")
        response = self.client.get(my_assessments_url)
        assert status.HTTP_200_OK == response.status_code


class TestAssessmentHTMLView(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.me = UserFactory()
        cls.me.set_password("foo")
        cls.me.save()
        cls.my_assessment = AssessmentFactory.create(owner=cls.me)

    def test_logged_out_users_get_redirected_to_log_in(self):
        login_url = settings.LOGIN_URL
        my_assessment_url = f"/{VERSION}/assessments/{self.my_assessment.pk}/"

        response = self.client.get(my_assessment_url)

        assert type(response) == http.response.HttpResponseRedirect
        assert response.url == f"{login_url}?next={my_assessment_url}"

    def test_returns_200_for_logged_in_user_viewing_own_assessment(self):
        self.client.login(username=self.me.username, password="foo")
        my_assessment_url = f"/{VERSION}/assessments/{self.my_assessment.pk}/"
        response = self.client.get(my_assessment_url)
        assert status.HTTP_200_OK == response.status_code

    def test_returns_200_for_organisation_member_viewing_assessment_in_organisation(
        self,
    ):
        organisation = OrganisationFactory.create()
        organisation_assessment = AssessmentFactory.create(organisation=organisation)
        organisation.members.add(self.me)

        self.client.login(username=self.me.username, password="foo")
        not_my_assessment_url = f"/{VERSION}/assessments/{organisation_assessment.pk}/"
        response = self.client.get(not_my_assessment_url)
        assert status.HTTP_200_OK == response.status_code

    def test_returns_not_found_if_not_owner(self):
        someone_else = UserFactory.create()
        someone_else.set_password("foo")
        someone_else.save()
        someone_elses_assessment = AssessmentFactory.create(owner=someone_else)

        self.client.login(username=self.me.username, password="foo")
        not_my_assessment_url = f"/{VERSION}/assessments/{someone_elses_assessment.pk}/"
        response = self.client.get(not_my_assessment_url)
        assert status.HTTP_404_NOT_FOUND == response.status_code
