var mhep_helper = {
    'list_assessments': function () {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: urlHelper.api.assessments(),
                success: function (data) {
                    resolve(data);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    handleServerError('listing assessments')(jqXHR, textStatus, errorThrown);
                    reject(errorThrown);
                }
            });
        });
    },
    'get': function (id) {
        var result = {};
        $.ajax({
            url: urlHelper.api.assessment(id),
            async: false,
            error: handleServerError('loading assessment'),
            success: function (data) {
                result = data;
            },
        });
        return result;
    },
    'set': function (id, data, callback) {
        var result = {};
        $.ajax({
            type: 'PATCH',
            url: urlHelper.api.assessment(id),
            data: JSON.stringify({'data': data}),
            dataType: 'json',
            contentType: 'application/json;charset=utf-8',
            async: true,
            error: function (err) {
                callback(err, null);
                handleServerError('updating assessment');
            },
            success: function (data) {
                callback(null, data);
            },
        });
    },
    'create': function (name, description, orgid, callback) {
        var result = 0;
        const newAssessment = {
            'name': name,
            'description': description,
        };

        var endpoint;
        if (orgid > 0) {
            endpoint = urlHelper.api.organisationAssessments(orgid);
        } else {
            endpoint = urlHelper.api.assessments();
        }

        $.ajax({
            type: 'POST',
            url: endpoint,
            data: JSON.stringify(newAssessment),
            dataType: 'json',
            contentType: 'application/json;charset=utf-8',
            async: false,
            error: handleServerError('creating assessment'),
            success: function (data) {
                if (callback) {
                    callback(data);
                }
            },
        });
        return result;
    },
    'duplicate_assessment': function (id) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: urlHelper.api.duplicateAssessment(id),
                type: 'POST',
                error: function(jqXHR, textStatus, errorThrown) {
                    handleServerError('duplicating assessment')(jqXHR, textStatus, errorThrown);
                    reject(errorThrown);
                },
                success: function (data) {
                    resolve(data);
                },
            });
        });
    },
    'delete_assessment': function (id) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: urlHelper.api.assessment(id),
                type: 'DELETE',
                error: function(jqXHR, textStatus, errorThrown) {
                    handleServerError('deleting assessment')(jqXHR, textStatus, errorThrown);
                    reject(errorThrown);
                },
                success: function () {
                    resolve();
                },
            });
        });
    },
    'set_status': function (id, status) {
        return new Promise((resolve, reject) => {
            $.ajax({
                type: 'PATCH',
                url: urlHelper.api.assessment(id),
                dataType: 'json',
                contentType: 'application/json;charset=utf-8',
                data: JSON.stringify({'status': status}),
                success: function () {
                    resolve();
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    handleServerError('setting assessment status')(jqXHR, textStatus, errorThrown);
                    reject(errorThrown);
                }
            });
        });
    },
    'set_name_and_description': function (id, name, description) {
        $.ajax({type: 'PATCH',
            url: urlHelper.api.assessment(id),
            data: JSON.stringify({'name': name, 'description': description}),
            dataType: 'json',
            contentType: 'application/json;charset=utf-8',
            async: false,
            error: handleServerError('setting assessment name and description'),
            success: function (data) {
            },
        });
    },
    'list_organisations': function() {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: urlHelper.api.organisations(),
                success: function (data) {
                    resolve(data);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    handleServerError('listing organisations')(jqXHR, textStatus, errorThrown);
                    reject(errorThrown);
                }
            });
        });
    },
    'list_users': function() {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: urlHelper.api.users(),
                success: function (data) {
                    resolve(data);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    // This means we can't do this because we're not an admin in any
                    // groups.  Just resolve to the empty list.
                    if (jqXHR.status == 403) {
                        return resolve([]);
                    }

                    handleServerError('listing users')(jqXHR, textStatus, errorThrown);
                    reject(errorThrown);
                }
            });
        });
    },
    'add_member': function(orgid, userid) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: urlHelper.api.members(orgid, userid),
                type: 'POST',
                error: function(jqXHR, textStatus, errorThrown) {
                    handleServerError('adding member')(jqXHR, textStatus, errorThrown);
                    reject(errorThrown);
                },
                success: function (data) {
                    resolve(data);
                },
            });
        });
    },
    'remove_member': function(orgid, userid) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: urlHelper.api.members(orgid, userid),
                type: 'DELETE',
                error: function(jqXHR, textStatus, errorThrown) {
                    handleServerError('removing member')(jqXHR, textStatus, errorThrown);
                    reject(errorThrown);
                },
                success: function (data) {
                    resolve(data);
                },
            });
        });
    },
    'create_library': function(libraryData, organisationID) {
        var apiURL = '';
        if(organisationID == null) {
            apiURL = urlHelper.api.libraries();
        } else {
            apiURL = urlHelper.api.organisationLibraries(organisationID);
        }

        return new Promise((resolve, reject) => {
            $.ajax({
                url: apiURL,
                type: 'POST',
                data: JSON.stringify(libraryData),
                datatype: 'json',
                contentType: 'application/json;charset=utf-8',
                error: function(jqXHR, textStatus, errorThrown) {
                    handleServerError('creating library')(jqXHR, textStatus, errorThrown);
                    reject(errorThrown);
                },
                success: function (data) {
                    resolve(data);
                },
            });
        });
    },
    'share_library_with_organisation': function(fromOrgID, libraryID, toOrgID) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: urlHelper.api.shareUnshareOrganisationLibraries(fromOrgID, libraryID, toOrgID),
                type: 'POST',
                error: function(jqXHR, textStatus, errorThrown) {
                    handleServerError('sharing library with organisation')(jqXHR, textStatus, errorThrown);
                    reject(errorThrown);
                },
                success: function (data) {
                    resolve(data);
                },
            });
        });
    },
    'stop_sharing_library_with_organisation': function(fromOrgID, libraryID, toOrgID) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: urlHelper.api.shareUnshareOrganisationLibraries(fromOrgID, libraryID, toOrgID),
                type: 'DELETE',
                error: function(jqXHR, textStatus, errorThrown) {
                    handleServerError('stopping sharing library with organisation')(jqXHR, textStatus, errorThrown);
                    reject(errorThrown);
                },
                success: function (data) {
                    resolve(data);
                },
            });
        });
    },
    'list_organisations_library_shares': function(orgID, libraryID) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: urlHelper.api.libraryOrganisationLibraryShares(orgID, libraryID),
                success: function (data) {
                    resolve(data);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    handleServerError('listing organisations library is shared with')(jqXHR, textStatus, errorThrown);
                    reject(errorThrown);
                }
            });
        });
    },
    'promote_user_as_librarian': function(orgid, userid) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: urlHelper.api.librarians(orgid, userid),
                type: 'POST',
                error: function(jqXHR, textStatus, errorThrown) {
                    handleServerError('promoting user as librarian')(jqXHR, textStatus, errorThrown);
                    reject(errorThrown);
                },
                success: function (data) {
                    resolve(data);
                },
            });
        });
    },
    'demote_user_as_librarian': function(orgid, userid) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: urlHelper.api.librarians(orgid, userid),
                type: 'DELETE',
                error: function(jqXHR, textStatus, errorThrown) {
                    handleServerError('demoting user as librarian')(jqXHR, textStatus, errorThrown);
                    reject(errorThrown);
                },
                success: function (data) {
                    resolve(data);
                },
            });
        });
    },
    'upload_image': function (assessment_id, file) {
        return new Promise((resolve, reject) => {
            const form = new FormData();
            form.append('file', file);

            $.ajax({
                type: 'POST',
                url: urlHelper.api.uploadImage(assessment_id),
                data: form,
                processData: false,
                contentType: false,
                success: function (data) {
                    resolve(data);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    handleServerError('uploading image')(jqXHR, textStatus, errorThrown);
                    reject(errorThrown);
                }
            });
        });
    },
    'set_featured_image': function(assessment_id, image_id) {
        return new Promise((resolve, reject) => {
            $.ajax({
                type: 'POST',
                url: urlHelper.api.setFeaturedImage(assessment_id),
                dataType: 'json',
                contentType: 'application/json;charset=utf-8',
                data: JSON.stringify({ 'id': image_id }),
                success: function (data) {
                    resolve();
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    handleServerError('setting featured image')(jqXHR, textStatus, errorThrown);
                    reject(errorThrown);
                }
            });
        });
    },
    'set_image_note': function (id, note) {
        return new Promise((resolve, reject) => {
            $.ajax({
                type: 'PATCH',
                url: urlHelper.api.image(id),
                dataType: 'json',
                contentType: 'application/json;charset=utf-8',
                data: JSON.stringify({ 'note': note }),
                success: function (data) {
                    resolve(data);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    handleServerError('setting image note')(jqXHR, textStatus, errorThrown);
                    reject(errorThrown);
                }
            });
        });
    },
    'delete_image': function (id) {
        return new Promise((resolve, reject) => {
            $.ajax({
                type: 'DELETE',
                url: urlHelper.api.image(id),
                success: function (data) {
                    resolve();
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    handleServerError('deleting image')(jqXHR, textStatus, errorThrown);
                    reject(errorThrown);
                }
            });
        });
    },
};
