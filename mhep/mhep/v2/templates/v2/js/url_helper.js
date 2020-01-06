'{% load static %}';

const urlHelper = function() {
    // eslint-disable-next-line quotes
    const appStaticURLs = JSON.parse(`{{ static_urls | safe }}`);

    // urlHelper constructions API & HTML urls from object IDs, e.g.
    //
    // urlHelper.api.assessment(3) -> returns `/v1/api/assessments/3/`
    return {
        api: {
            assessments: function() {
                return '{% url VERSION|add:":list-create-assessments" %}';
            },

            assessment: function(assessmentID) {
                const dummyURL = '{% url VERSION|add:":retrieve-update-destroy-assessment" "12345" %}';
                return dummyURL.replace(/12345/, parseInt(assessmentID));
            },

            duplicateAssessment: function(assessmentID) {
                const dummyURL = '{% url VERSION|add:":duplicate-assessment" "12345" %}';
                return dummyURL.replace(/12345/, parseInt(assessmentID));
            },

            uploadImage: function(assessmentID) {
                const dummyURL = '{% url VERSION|add:":upload-image-to-assessment" "12345" %}';
                return dummyURL.replace(/12345/, parseInt(assessmentID));
            },

            setFeaturedImage: function(assessmentID) {
                const dummyURL = '{% url VERSION|add:":set-featured-image" "12345" %}';
                return dummyURL.replace(/12345/, parseInt(assessmentID));
            },

            image: function(imageID) {
                const dummyURL = '{% url VERSION|add:":image" "12345" %}';
                return dummyURL.replace(/12345/, parseInt(imageID));
            },

            organisationAssessments: function(organisationID) {
                const dummyURL = '{% url VERSION|add:":list-create-organisation-assessments" "12345" %}';
                return dummyURL.replace(/12345/, parseInt(organisationID));
            },

            organisations: function() {
                return '{% url VERSION|add:":list-organisations" %}';
            },

            users: function() {
                return '{% url VERSION|add:":list-users" %}';
            },

            members: function(userID, organisationID) {
                const dummyURL = '{% url VERSION|add:":create-delete-organisation-members" "12345" "67890" %}';
                return dummyURL.replace(/12345/, parseInt(userID)).replace(/67890/, parseInt(organisationID));
            },

            libraries: function() {
                return '{% url VERSION|add:":list-create-libraries" %}';
            },

            organisationLibraries: function(organisationID) {
                return '{% url VERSION|add:":create-organisation-libraries" "12345" %}'.replace(/12345/, parseInt(organisationID));
            },

            shareUnshareOrganisationLibraries: function(fromOrgID, libraryID, toOrgID) {
                const dummyURL = '{% url VERSION|add:":share-unshare-organisation-libraries" "123" "456" "789" %}';
                return dummyURL.replace(
                    /123/, parseInt(fromOrgID)).replace(
                    /456/, parseInt(libraryID)).replace(
                    /789/, parseInt(toOrgID));
            },

            libraryOrganisationLibraryShares: function(organisationID, libraryID) {
                const dummyURL = '{% url VERSION|add:":list-organisation-library-shares" "12345" "67890" %}';
                return dummyURL.replace(
                    /12345/, parseInt(organisationID)).replace(
                    /67890/, parseInt(libraryID));
            },

            library: function(libraryID) {
                return '{% url VERSION|add:":update-destroy-library" "12345" %}'.replace(/12345/, parseInt(libraryID));
            },

            libraryItems: function(libraryID) {
                const dummyURL = '{% url VERSION|add:":create-update-delete-library-item" "12345" %}';
                return dummyURL.replace(/12345/, parseInt(libraryID));
            },

            libraryItem: function(libraryID, tag) {
                const dummyURL = '{% url VERSION|add:":create-update-delete-library-item" "12345" "abcde" %}';
                return dummyURL.replace(/12345/, parseInt(libraryID)).replace(/abcde/, tag);
            },

            librarians: function(userID, organisationID) {
                const dummyURL = '{% url VERSION|add:":create-delete-organisation-librarians" "12345" "67890" %}';
                return dummyURL.replace(/12345/, parseInt(userID)).replace(/67890/, parseInt(organisationID));
            },
        },

        html: {
            assessment: function(assessmentID) {
                return '{% url VERSION|add:":view-assessment" "12345" %}'.replace(/12345/, assessmentID.toString());
            },
        },

        static: function (resourcePath) {
        // returns the full URL for the given static file e.g. 'img/graphic.png'
            if (!appStaticURLs.hasOwnProperty(resourcePath)) {
                console.error("no app static URL for '" + resourcePath + "'");
                return null;
            }

            return appStaticURLs[resourcePath];
        },

        admin: {
            organisation: function(organisationID) {
                const dummyURL = '{% url "admin:"|add:VERSION|add:"_organisation_change" 12345 %}';
                return dummyURL.replace(/12345/, orgid.toString());
            }
        },
    };
}();
