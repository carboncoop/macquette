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
    'set': function (id, project, callback) {
        var inputdata = {};
        for (z in project) {
            inputdata[z] = mhep_helper.extract_inputdata(project[z]);
        }
        var result = {};
        $.ajax({
            type: 'PATCH',
            url: urlHelper.api.assessment(id),
            data: JSON.stringify({'data': inputdata}),
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
        //console.log(JSON.stringify(inputdata));
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
    extract_inputdata: function (data) {
        var inputdata = {};
        inputdata.scenario_name = data.scenario_name;
        inputdata.scenario_description = data.scenario_description;
        inputdata.household = data.household;
        inputdata.region = data.region;
        inputdata.altitude = data.altitude;
        inputdata.use_custom_occupancy = data.use_custom_occupancy;
        inputdata.custom_occupancy = data.custom_occupancy;
        inputdata.floors = [];
        inputdata.locked = data.locked;
        inputdata.created_from = data.created_from;
        inputdata.creation_hash = data.creation_hash;
        for (z in data.floors) {
            inputdata.floors[z] = {name: data.floors[z].name, area: data.floors[z].area, height: data.floors[z].height};
        }

        inputdata.fabric = {
            thermal_bridging_yvalue: data.fabric.thermal_bridging_yvalue,
            global_TMP: data.fabric.global_TMP,
            global_TMP_value: data.fabric.global_TMP_value,
            elements: [],
            measures: data.fabric.measures
        };
        for (z in data.fabric.elements) {
            inputdata.fabric.elements[z] = {
                type: data.fabric.elements[z].type,
                name: data.fabric.elements[z].name,
                lib: data.fabric.elements[z].lib,
                subtractfrom: data.fabric.elements[z].subtractfrom,
                l: data.fabric.elements[z].l,
                h: data.fabric.elements[z].h,
                perimeter: data.fabric.elements[z].perimeter,
                area: data.fabric.elements[z].area,
                uvalue: 1.0 * data.fabric.elements[z].uvalue,
                id: 1.0 * data.fabric.elements[z].id,
                location: data.fabric.elements[z].location || '',
                description: data.fabric.elements[z].description || '',
                kvalue: data.fabric.elements[z].kvalue || '',
                orientation: data.fabric.elements[z].orientation,
                overshading: data.fabric.elements[z].overshading,
                g: data.fabric.elements[z].g || '',
                gL: data.fabric.elements[z].gL || '',
                ff: data.fabric.elements[z].ff || '',
                performance: data.fabric.elements[z].performance || '',
                benefits: data.fabric.elements[z].benefits || '',
                cost: data.fabric.elements[z].cost || '',
                who_by: data.fabric.elements[z].who_by || '',
                disruption: data.fabric.elements[z].disruption || '',
                associated_work: data.fabric.elements[z].associated_work || '',
                notes: data.fabric.elements[z].notes || '',
                maintenance: data.fabric.elements[z].maintenance || ''
            };
            if (data.fabric.elements[z].EWI != undefined) {
                inputdata.fabric.elements[z].EWI = data.fabric.elements[z].EWI;
            }
            if (data.fabric.elements[z].cost_total != undefined) {
                inputdata.fabric.elements[z].cost_total = data.fabric.elements[z].cost_total;
            }
        }

        // Ventilation
        inputdata.ventilation = {
            air_permeability_test: data.ventilation.air_permeability_test,
            air_permeability_value: data.ventilation.air_permeability_value,
            dwelling_construction: data.ventilation.dwelling_construction,
            suspended_wooden_floor: data.ventilation.suspended_wooden_floor,
            draught_lobby: data.ventilation.draught_lobby,
            percentage_draught_proofed: data.ventilation.percentage_draught_proofed,
            number_of_sides_sheltered: data.ventilation.number_of_sides_sheltered,
            ventilation_type: data.ventilation.ventilation_type,
            ventilation_tag: data.ventilation.ventilation_tag,
            ventilation_name: data.ventilation.ventilation_name,
            system_air_change_rate: data.ventilation.system_air_change_rate,
            balanced_heat_recovery_efficiency: data.ventilation.balanced_heat_recovery_efficiency,
            system_specific_fan_power: data.ventilation.system_specific_fan_power,
            IVF: data.ventilation.IVF,
            EVP: data.ventilation.EVP,
            CDF: data.ventilation.CDF
        };
        // LAC
        inputdata.LAC = data.LAC;
        inputdata.LAC_calculation_type = data.LAC_calculation_type;
        inputdata.use_generation = 1;
        inputdata.generation = data.generation;
        inputdata.currentenergy = {
            //energyitems: data.currentenergy.energyitems,
            //greenenergy: data.currentenergy.greenenergy,
            use_by_fuel: data.currentenergy.use_by_fuel,
            onsite_generation: data.currentenergy.onsite_generation,
            generation: data.currentenergy.generation
        };
        // Waterheating
        //inputdata.use_water_heating = data.use_water_heating;
        inputdata.water_heating = {
            low_water_use_design: data.water_heating.low_water_use_design,
            solar_water_heating: data.water_heating.solar_water_heating,
            pipework_insulated_fraction: data.water_heating.pipework_insulated_fraction,
            pipework_insulation: data.water_heating.pipework_insulation,
            storage_type: data.water_heating.storage_type,
            community_heating: data.water_heating.community_heating,
            hot_water_store_in_dwelling: data.water_heating.hot_water_store_in_dwelling,
            contains_dedicated_solar_storage_or_WWHRS: data.water_heating.contains_dedicated_solar_storage_or_WWHRS,
            hot_water_control_type: data.water_heating.hot_water_control_type,
            override_annual_energy_content: data.water_heating.override_annual_energy_content,
            annual_energy_content: data.water_heating.annual_energy_content,
            Vc: data.water_heating.Vc,
            water_usage: data.water_heating.water_usage
        };
        inputdata.fans_and_pumps = data.fans_and_pumps;
        inputdata.use_SHW = data.use_SHW;
        inputdata.SHW = {
            A: data.SHW.A,
            n0: data.SHW.n0,
            a1: data.SHW.a1,
            a2: data.SHW.a2,
            inclination: data.SHW.inclination,
            orientation: data.SHW.orientation,
            overshading: data.SHW.overshading,
            Vs: data.SHW.Vs,
            combined_cylinder_volume: data.SHW.combined_cylinder_volume,
            pump: data.SHW.pump
        };
        // Detailed Appliaces List
        inputdata.appliancelist = {list: []};
        for (z in data.appliancelist.list) {
            inputdata.appliancelist.list[z] = {
                name: data.appliancelist.list[z].name,
                category: data.appliancelist.list[z].category,
                power: data.appliancelist.list[z].power,
                fuel: data.appliancelist.list[z].fuel,
                efficiency: data.appliancelist.list[z].efficiency,
                hours: data.appliancelist.list[z].hours
            };
        }

        // Apliances CarbonCoop
        inputdata.applianceCarbonCoop = {list: []};
        for (z in data.applianceCarbonCoop.list) {
            inputdata.applianceCarbonCoop.list[z] = {
                category: data.applianceCarbonCoop.list[z].category,
                name: data.applianceCarbonCoop.list[z].name,
                number_used: data.applianceCarbonCoop.list[z].number_used,
                a_plus_rated: data.applianceCarbonCoop.list[z].a_plus_rated,
                'norm_demand': data.applianceCarbonCoop.list[z]['norm_demand'],
                units: data.applianceCarbonCoop.list[z].units,
                'utilisation_factor': data.applianceCarbonCoop.list[z]['utilisation_factor'],
                frequency: data.applianceCarbonCoop.list[z].frequency,
                'reference_quantity': data.applianceCarbonCoop.list[z]['reference_quantity'],
                'type_of_fuel': data.applianceCarbonCoop.list[z]['type_of_fuel'],
                efficiency: data.applianceCarbonCoop.list[z].efficiency,
                fuel: data.applianceCarbonCoop.list[z].fuel
            };
        }

        // Temperature
        inputdata.temperature = {
            responsiveness: data.temperature.responsiveness,
            target: data.temperature.target,
            living_area: data.temperature.living_area,
            temperature_adjustment: data.temperature.temperature_adjustment,
            hours_off: data.temperature.hours_off
        };
        // Space heating
        inputdata.space_heating = {
            use_utilfactor_forgains: data.space_heating.use_utilfactor_forgains,
            heating_off_summer: data.space_heating.heating_off_summer
        };

        inputdata.heating_systems = data.heating_systems;


        // Fuels
        inputdata.fuels = data.fuels;
        //Images
        inputdata.imagegallery = data.imagegallery;
        inputdata.imagegallery_notes = data.imagegallery_notes;
        inputdata.featuredimage = data.featuredimage;
        //Measures
        inputdata.measures = data.measures;
        return inputdata;
    }
};
