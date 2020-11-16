var view_html = {};

function load_view(eid, view) {
    if (view_html[view] != undefined) {
        $(eid).html(view_html[view]);
        return view_html[view];
    }

    const url = urlHelper.static('subviews/' + view + '.html');
    if (!url) {
        console.error(`Couldn't find URL for 'subviews/${view}.html'`);
        console.error(
            'If you are running the code locally, this could be because you have' +
            ' added a new page without running collectstatic.'
        );
        alert('Error loading page.');
        return;
    }

    var result_html = '';
    $.ajax({
        url: url,
        async: false,
        cache: false,
        error: handleServerError('loading HTML for subview "' + view + '"'),
        success: function (data) {
            result_html = data;
        },
    });

    $(eid).html(result_html);

    // Load js
    $.ajax({
        url: urlHelper.static('subviews/' + view + '.js'),
        dataType: 'script',
        async: false,
        error: handleServerError('loading Javascript for subview "' + view + '"'),
    });

    view_html[view] = result_html;

    return result_html;
}
function varset(key, value) {
    var lastval = '';
    var p = key.split('.');

    switch (p.length) {
        case 0:
            break;
        case 1:
            lastval = window[p[0]];
            window[p[0]] = value;
            break;
        case 2:
            lastval = window[p[0]][p[1]];
            window[p[0]][p[1]] = value;
            break;
        case 3:
            lastval = window[p[0]][p[1]][p[2]];
            window[p[0]][p[1]][p[2]] = value;
            break;
        case 4:
            lastval = window[p[0]][p[1]][p[2]][p[3]];
            window[p[0]][p[1]][p[2]][p[3]] = value;
            break;
        case 5:
            lastval = window[p[0]][p[1]][p[2]][p[3]][p[4]];
            window[p[0]][p[1]][p[2]][p[3]][p[4]] = value;
            break;
        case 6:
            lastval = window[p[0]][p[1]][p[2]][p[3]][p[4]][p[5]];
            window[p[0]][p[1]][p[2]][p[3]][p[4]][p[5]] = value;
            break;
    }
    return lastval;
}

function varget(key) {
    var p = key.split('.');
    var val = false;

    switch (p.length) {
        case 0:
            break;
        case 1:
            try {
                val = window[p[0]];
            } catch (err) {
            }
            break;
        case 2:
            try {
                val = window[p[0]][p[1]];
            } catch (err) {
            }
            break;
        case 3:
            try {
                val = window[p[0]][p[1]][p[2]];
            } catch (err) {
            }
            break;
        case 4:
            try {
                val = window[p[0]][p[1]][p[2]][p[3]];
            } catch (err) {
            }
            break;
        case 5:
            try {
                val = window[p[0]][p[1]][p[2]][p[3]][p[4]];
            } catch (err) {
            }
            break;
        case 6:
            try {
                val = window[p[0]][p[1]][p[2]][p[3]][p[4]][p[5]];
            } catch (err) {
            }
            break;
    }
    return val;
}

function InitUI() {
    // Call page specific updateui function
    var functionname = page + '_initUI';
    if (window[functionname] != undefined) {
        window[functionname]();
    }

    $('.monthly').each(function () {

        var name = $(this).attr('key');
        var dp = $(this).attr('dp');
        var title = $(this).attr('title');
        var units = $(this).attr('units');

        var out = '';
        var sum = 0;
        for (var m = 0; m < 12; m++) {
            out += "<td key='" + name + '.' + m + "' dp=" + dp + " units='" + units + "'></td>";
            sum += varget(name + '.' + m);
        }
        var mean = sum / 12.0;

        $(this).html('<tr><td>' + title + '</td><td>sum:' + sum.toFixed(dp) + '<br>mean:' + mean.toFixed(dp) + '</td>' + out + '</tr>');
    });

    if (page == 'householdquestionnaire') {
        $('.scenario-name').html('Household Questionnaire');
    } else if (page == 'commentary') {
        $('.scenario-name').html('Commentary');
    } else if (page == 'report') {
        $('.scenario-name').html('Generate Report');
    } else {
        $('.scenario-name').html(scenario.charAt(0).toUpperCase() + scenario.slice(1) + ' - ' + data.scenario_name);
    }
}

function UnloadUI() {
    // Call page specific updateui function
    var functionname = page + '_UnloadUI';
    if (window[functionname] != undefined) {
        window[functionname]();
    }
}

function UpdateUI(data) {
    // Call page specific updateui function
    var functionname = page + '_UpdateUI';
    if (window[functionname] != undefined) {
        window[functionname]();
    }

    getkeys('data', data);

    let elems = document.querySelectorAll('[key]');
    for (let elem of elems) {
        let key = elem.getAttribute('key');
        if (keys[key]) {
            let value = keys[key];
            let target = $(elem);
            let dp = 1 * target.attr('dp');
            let units = target.attr('units');

            if (!isNaN(dp)) {
                value = (1 * value).toFixed(dp);
            }

            if (units != undefined) {
                value += '' + units;
            }

            if (target.is('span')) {
                target.html(value);
            } else if (target.is('input[type=text]')) {
                target.val(value);
            } else if (target.is('input[type=number]')) {
                target.val(value);
            } else if (target.is('input[type=checkbox]')) {
                target.prop('checked', value);
            } else if (target.is('input[type=hidden]')) {
                target.val(value);
            } else if (target.is('input[type=radio]')) {
                // Purposeful loose equals, because e.value will always be a string
                // while 'value' might an integer... but "3" == 3 so who cares
                let found = target.filter((_, e) => e.value == value);
                if (found.length) {
                    found[0].checked = true;
                }
            } else if (target.is('textarea')) {
                target.html(value);
            } else if (target.is('select')) {
                target.val(value);
            } else if (target.is('td')) {
                target.html(value);
            } else if (target.is('th')) {
                target.html(value);
            } else if (target.is('div')) {
                target.html(value);
            }
        }
    }
}

function getkeys(key, val) {
    switch (typeof val) {
        case 'object':
            for (subkey in val) {
                getkeys(key + '.' + subkey, val[subkey]);
            }
            break;
        case 'string':
            keys[key] = val;
            break;
        case 'number':
            keys[key] = val;
            break;
        case 'boolean':
            keys[key] = val;
            break;
    }
}

function getuikeys() {
    var uikeys = [];
    $('[key]').each(function () {
        uikeys.push($(this).attr('key'));
    });
    return uikeys;
}

Object.size = function (obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            size++;
        }
    }
    return size;
};

function alertifnotlogged(data) {
    if (data === 'Not logged') {
        $('#modal-error-submitting-data').show();
    }
}
function alert_if_assessment_locked(data) {
    if (data === 'Assessment locked') {
        $('#modal-assessment-locked').modal('show');
    }
}

function get_fuels_for_select(category_to_show) {
    // Group fuels by category
    var fuels_by_category = {};
    for (var fuel in data.fuels) {
        var category = data.fuels[fuel].category;
        if (fuels_by_category[category] == undefined) {
            fuels_by_category[category] = [];
        }
        fuels_by_category[category].push(fuel);
    }

    // Generate output string according to the category passed to the function, if the category exist we return optionns for that category, if it doesn't exist we return all the fuel sorted by category
    var options = '';
    if (fuels_by_category[category_to_show] != undefined) {
        for (fuel in data.fuels) {
            if (data.fuels[fuel].category == category_to_show) {
                options += '<option value="' + fuel + '">' + fuel + '</option>';
            }
        }
    } else {
        for (category in fuels_by_category) {
            if (category != 'generation') {
                options += '<optgroup label="' + category + '">';
                for (index in fuels_by_category[category]) {
                    options += '<option value="' + fuels_by_category[category][index] + '">' + fuels_by_category[category][index] + '</option>';
                }
                options += '</optgroup>';
            }
        }
    }
    return options;
}

function get_a_fuel(type_of_fuel) { // Returns the first fuel for a specific type found in data.fuels for a specific type
    for (var fuel in data.fuels) {
        if (data.fuels[fuel].category == type_of_fuel) {
            return fuel;
        }
    }
}

function get_fuel_categories() {
    var categories = [];
    for (var fuel in project.master.fuels) {
        if (categories.indexOf(project.master.fuels[fuel].category) === -1) {
            categories.push(project.master.fuels[fuel].category);
        }
    }
    return categories;
}


/************************
 **  Hours off
 ************************/
function get_hours_off_weekday(data) {
    var hours_off = [];
    if (project.master.household['heating_weekday_off3_hours'] != undefined
            && project.master.household['heating_weekday_off3_mins'] != undefined
            && (project.master.household['heating_weekday_on3_hours'] != project.master.household['heating_weekday_off3_hours']
                    || project.master.household['heating_weekday_on3_mins'] != project.master.household['heating_weekday_off3_mins'])) {
        var time_on_1 = new Date(2000, 1, 1, project.master.household['heating_weekday_on1_hours'], project.master.household['heating_weekday_on1_mins'], 0, 0);
        var time_off_1 = new Date(2000, 1, 1, project.master.household['heating_weekday_off1_hours'], project.master.household['heating_weekday_off1_mins'], 0, 0);
        var time_on_2 = new Date(2000, 1, 1, project.master.household['heating_weekday_on2_hours'], project.master.household['heating_weekday_on2_mins'], 0, 0);
        var time_off_2 = new Date(2000, 1, 1, project.master.household['heating_weekday_off2_hours'], project.master.household['heating_weekday_off2_mins'], 0, 0);
        var time_on_3 = new Date(2000, 1, 1, project.master.household['heating_weekday_on3_hours'], project.master.household['heating_weekday_on3_mins'], 0, 0);
        var time_off_3 = new Date(2000, 1, 1, project.master.household['heating_weekday_off3_hours'], project.master.household['heating_weekday_off3_mins'], 0, 0);
        hours_off = (get_hours_three_periods(time_on_1, time_off_1, time_on_2, time_off_2, time_on_3, time_off_3));

    } else if (project.master.household['heating_weekday_off2_hours'] != undefined
            && project.master.household['heating_weekday_off2_mins'] != undefined
            && (project.master.household['heating_weekday_on2_hours'] != project.master.household['heating_weekday_off2_hours']
                    || project.master.household['heating_weekday_on2_mins'] != project.master.household['heating_weekday_off2_mins'])) {
        var time_on_1 = new Date(2000, 1, 1, project.master.household['heating_weekday_on1_hours'], project.master.household['heating_weekday_on1_mins'], 0, 0);
        var time_off_1 = new Date(2000, 1, 1, project.master.household['heating_weekday_off1_hours'], project.master.household['heating_weekday_off1_mins'], 0, 0);
        var time_on_2 = new Date(2000, 1, 1, project.master.household['heating_weekday_on2_hours'], project.master.household['heating_weekday_on2_mins'], 0, 0);
        var time_off_2 = new Date(2000, 1, 1, project.master.household['heating_weekday_off2_hours'], project.master.household['heating_weekday_off2_mins'], 0, 0);
        hours_off = (get_hours_two_periods(time_on_1, time_off_1, time_on_2, time_off_2));
    } else if (project.master.household['heating_weekday_off1_hours'] != project.master.household['heating_weekday_on1_hours'] || project.master.household['heating_weekday_off1_mins'] != project.master.household['heating_weekday_on1_mins']) {
        var time_off = new Date(2000, 1, 1, project.master.household['heating_weekday_off1_hours'], project.master.household['heating_weekday_off1_mins'], 0, 0);
        var time_on = new Date(2000, 1, 1, project.master.household['heating_weekday_on1_hours'], project.master.household['heating_weekday_on1_mins'], 0, 0);
        hours_off.push(get_hours_off_one_period(time_on, time_off));
    } else {
        hours_off.push(0);
    }
    return hours_off;
}
function get_hours_off_weekend(data) {
    var hours_off = [];
    if (project.master.household['heating_weekend_off3_hours'] != undefined
            && project.master.household['heating_weekend_off3_mins'] != undefined
            && (project.master.household['heating_weekend_on3_hours'] != project.master.household['heating_weekend_off3_hours']
                    || project.master.household['heating_weekend_on3_mins'] != project.master.household['heating_weekend_off3_mins'])) {
        var time_on_1 = new Date(2000, 1, 1, project.master.household['heating_weekend_on1_hours'], project.master.household['heating_weekend_on1_mins'], 0, 0);
        var time_off_1 = new Date(2000, 1, 1, project.master.household['heating_weekend_off1_hours'], project.master.household['heating_weekend_off1_mins'], 0, 0);
        var time_on_2 = new Date(2000, 1, 1, project.master.household['heating_weekend_on2_hours'], project.master.household['heating_weekend_on2_mins'], 0, 0);
        var time_off_2 = new Date(2000, 1, 1, project.master.household['heating_weekend_off2_hours'], project.master.household['heating_weekend_off2_mins'], 0, 0);
        var time_on_3 = new Date(2000, 1, 1, project.master.household['heating_weekend_on3_hours'], project.master.household['heating_weekend_on3_mins'], 0, 0);
        var time_off_3 = new Date(2000, 1, 1, project.master.household['heating_weekend_off3_hours'], project.master.household['heating_weekend_off3_mins'], 0, 0);
        hours_off = (get_hours_three_periods(time_on_1, time_off_1, time_on_2, time_off_2, time_on_3, time_off_3));

    } else if (project.master.household['heating_weekend_off2_hours'] != undefined
            && project.master.household['heating_weekend_off2_mins'] != undefined
            && (project.master.household['heating_weekend_on2_hours'] != project.master.household['heating_weekend_off2_hours']
                    || project.master.household['heating_weekend_on2_mins'] != project.master.household['heating_weekend_off2_mins'])) {
        var time_on_1 = new Date(2000, 1, 1, project.master.household['heating_weekend_on1_hours'], project.master.household['heating_weekend_on1_mins'], 0, 0);
        var time_off_1 = new Date(2000, 1, 1, project.master.household['heating_weekend_off1_hours'], project.master.household['heating_weekend_off1_mins'], 0, 0);
        var time_on_2 = new Date(2000, 1, 1, project.master.household['heating_weekend_on2_hours'], project.master.household['heating_weekend_on2_mins'], 0, 0);
        var time_off_2 = new Date(2000, 1, 1, project.master.household['heating_weekend_off2_hours'], project.master.household['heating_weekend_off2_mins'], 0, 0);
        hours_off = (get_hours_two_periods(time_on_1, time_off_1, time_on_2, time_off_2));
    } else if (project.master.household['heating_weekend_off1_hours'] != project.master.household['heating_weekend_on1_hours'] || project.master.household['heating_weekend_off1_mins'] != project.master.household['heating_weekend_on1_mins']) {
        var time_off = new Date(2000, 1, 1, project.master.household['heating_weekend_off1_hours'], project.master.household['heating_weekend_off1_mins'], 0, 0);
        var time_on = new Date(2000, 1, 1, project.master.household['heating_weekend_on1_hours'], project.master.household['heating_weekend_on1_mins'], 0, 0);
        hours_off.push(get_hours_off_one_period(time_on, time_off));
    } else {
        hours_off.push(0);
    }
    return hours_off;
}
function get_hours_off_one_period(time_on, time_off) {
    // heating is on before midnight and off after midnight
    if (time_on > time_off) {
        return(Math.abs(time_off - time_on) / 36e5);
    } else {
        time_on.setDate(time_on.getDate() + 1);
        return(Math.abs(time_on - time_off) / 36e5);
    }
}
function get_hours_two_periods(time_on_1, time_off_1, time_on_2, time_off_2) {
    var hours_off = [];
    hours_off.push((time_on_2 - time_off_1) / 36e5);
    hours_off.push(get_hours_off_one_period(time_on_1, time_off_2));
    return hours_off;
}
function get_hours_three_periods(time_on_1, time_off_1, time_on_2, time_off_2, time_on_3, time_off_3) {
    var hours_off = [];
    hours_off.push((time_on_2 - time_off_1) / 36e5);
    hours_off.push((time_on_3 - time_off_2) / 36e5);
    hours_off.push(get_hours_off_one_period(time_on_1, time_off_3));
    return hours_off;
}


/************************
 **  Cost of measures
 ************************/
function measures_costs(scenario) {
    var measures_total_cost = 0;
    if (project[scenario].fabric.measures != undefined) {
        measures_total_cost += cost_of_measures_by_id(project[scenario].fabric.measures);
    }
    if (project[scenario].measures.ventilation != undefined) {
        if (project[scenario].measures.ventilation.extract_ventilation_points != undefined) {
            measures_total_cost += cost_of_measures_by_id(project[scenario].measures.ventilation.extract_ventilation_points);
        }
        if (project[scenario].measures.ventilation.intentional_vents_and_flues != undefined) {
            measures_total_cost += cost_of_measures_by_id(project[scenario].measures.ventilation.intentional_vents_and_flues);
        }
        if (project[scenario].measures.ventilation.intentional_vents_and_flues_measures != undefined) {
            measures_total_cost += cost_of_measures_by_id(project[scenario].measures.ventilation.intentional_vents_and_flues_measures);
        }
        if (project[scenario].measures.ventilation.draught_proofing_measures != undefined) {
            measures_total_cost += project[scenario].measures.ventilation.draught_proofing_measures.measure.cost_total;
        }
        if (project[scenario].measures.ventilation.ventilation_systems_measures != undefined) {
            measures_total_cost += project[scenario].measures.ventilation.ventilation_systems_measures.measure.cost_total;
        }
        if (project[scenario].measures.ventilation.clothes_drying_facilities != undefined) {
            measures_total_cost += cost_of_measures_by_id(project[scenario].measures.ventilation.clothes_drying_facilities);
        }
    }
    if (project[scenario].measures.water_heating != undefined) {
        if (project[scenario].measures.water_heating.water_usage != undefined) {
            measures_total_cost += cost_of_measures_by_id(project[scenario].measures.water_heating.water_usage);
        }
        if (project[scenario].measures.water_heating.storage_type != undefined) {
            measures_total_cost += project[scenario].measures.water_heating.storage_type.measure.cost_total;
        }
        if (project[scenario].measures.water_heating.pipework_insulation != undefined) {
            measures_total_cost += project[scenario].measures.water_heating.pipework_insulation.measure.cost_total;
        }
        if (project[scenario].measures.water_heating.hot_water_control_type != undefined) {
            measures_total_cost += project[scenario].measures.water_heating.hot_water_control_type.measure.cost_total;
        }
    }
    if (project[scenario].measures.space_heating_control_type != undefined) {
        measures_total_cost += cost_of_measures_by_id(project[scenario].measures.space_heating_control_type);
    }
    if (project[scenario].measures.heating_systems != undefined) {
        measures_total_cost += cost_of_measures_by_id(project[scenario].measures.heating_systems);
    }
    if (project[scenario].use_generation == 1 && project[scenario].measures.PV_generation != undefined) {
        measures_total_cost += project[scenario].measures.PV_generation.measure.cost_total;
    }
    if (project[scenario].measures.LAC != undefined) {
        if (project[scenario].measures.LAC.lighting != undefined) {
            measures_total_cost += project[scenario].measures.LAC.lighting.measure.cost_total;
        }
    }
    return measures_total_cost;
}
function cost_of_measures_by_id(list_of_measures_by_id) {
    var cost = 0;
    for (var id in list_of_measures_by_id) {
        cost += list_of_measures_by_id[id].measure.cost_total;
    }
    return cost;
}
// Add extra properties to measure
function add_quantity_and_cost_to_measure(measure) {
    // ares of EWI is bigger than the actual area of the wall
    if (measure.cost_units == 'sqm') {
        if (measure.EWI != undefined && measure.EWI == true) {
            measure.area != undefined ? measure.quantity = 1.15 * measure.area : measure.quantity = 0;
        } else {
            // We use measure.area not measure.netarea (See issue 382: https://github.com/emoncms/MyHomeEnergyPlanner/issues/382#event-1681266801)
            measure.area != undefined ? measure.quantity = 1.0 * measure.area : measure.quantity = 0;
        }
    } else if (measure.cost_units == 'ln m') {
        measure.perimeter != undefined ? measure.quantity = 1.0 * measure.perimeter : measure.quantity = 0;
    } else if (measure.cost_units == 'unit') {
        measure.quantity = 1;
    } else {
        measure.quantity = 1;
        measure.cost_units = 'unit';
    }
    if (measure.min_cost != undefined) {
        measure.cost_total = 1.0 * measure.min_cost + 1.0 * measure.quantity * measure.cost;
    } else {
        measure.cost_total = 1.0 * measure.quantity * measure.cost;
    }

    measure.cost_total = 1.0 * measure.cost_total.toFixed(2);
}


/************************
 **  Revert to original
 ************************/
function init_revert_to_original_by_id(selector, item_id, type_of_item) {
    selector = selector + ' .revert-to-original[item-id="' + item_id + '"]';
    if (scenario != 'master') {
        if (measure_applied_to_item_by_id(type_of_item, item_id) != false && data.created_from != undefined) {
            if (data.created_from == 'master') {
                $(selector + ' .text').html('Revert to master');
            } else {
                var html = 'Revert to Scenario ' + data.created_from.split('scenario')[1];
                $(selector + ' .text').html(html);
            }
            $(selector).show();
            // Check original element still exists, it may have been deleted
            if (item_exists_in_original(data.created_from, item_id, type_of_item) == false) {
                $(selector).removeClass('revert-to-original').css('cursor', 'default').html("Original element doesn't<br />exist, cannot revert");
                return;
            }
            $('#openbem').on('click', selector, function () {
                revert_to_original(item_id, type_of_item);
            });
        } else {
            $(selector).hide();
        }
    } else {
        $(selector).hide();
    }
}
function measure_applied_to_item_by_id(type_of_item, item_id) {
    var measures_by_id = {};
    switch (type_of_item) {
        case'fabric-elements':
            measures_by_id = data.fabric.measures;
            break;
        case'ventilation-EVP':
            measures_by_id = data.measures.ventilation.extract_ventilation_points;
            break;
        default:
            console.error('Type of item not valid');
    }
    for (var measure_id in measures_by_id) {
        if (measure_id == item_id) {
            return true;
        }
        /*else if (measure_applied_in_bulk(element_id) != false) {
         return true;
         }*/
    }
    return false;
}
function item_exists_in_original(original_scenario, item_id, type_of_item) {
    var items_array = [];
    switch (type_of_item) {
        case'fabric-elements':
            items_array = project[original_scenario].fabric.elements;
            break;
        case'ventilation-EVP':
            items_array = project[original_scenario].ventilation.EVP;
            break;
        default:
            console.error('Type of item not valid');
    }
    for (var e in items_array) {
        if (items_array[e].id == item_id) {
            return true;
        }
    }
    return false;
}
function revert_to_original(item_id, type_of_item) {
    if (item_exists_in_original(data.created_from, item_id, type_of_item) == true) {
        var original_items_array = [];
        var current_items_array = [];
        var measures_by_id = {};
        switch (type_of_item) {
            case'fabric-elements':
                original_items_array = project[data.created_from].fabric.elements;
                current_items_array = data.fabric.elements;
                measures_by_id = data.fabric.measures;
                break;
            case'ventilation-EVP':
                original_items_array = project[data.created_from].ventilation.EVP;
                current_items_array = data.ventilation.EVP;
                measures_by_id = data.measures.ventilation.extract_ventilation_points;
                break;
            default:
                console.error('Type of item not valid');
        }
        // copy the original element
        for (var e in original_items_array) {
            if (original_items_array[e].id == item_id) {
                current_items_array[get_item_index_by_id(item_id, current_items_array)] = JSON.parse(JSON.stringify(original_items_array[e]));
                break;
            }
        }
        // delete measure
        delete(measures_by_id[item_id]);
        /*var applied_in_bulk = measure_applied_in_bulk(item_id);
         if (applied_in_bulk == false)
         delete(measures_by_id[item_id]);
         else
         delete(measures_by_id[applied_in_bulk].original_elements[item_id]);*/

    }
    /*elements_initUI();*/
    update();
}
function get_item_index_by_id(id, array) {
    for (var index in array) {
        if (array[index].id == id) {
            return index;
        }
    }
}

/**
 * Given a project data, return a new object with only the model inputs
 * in it.
 */
function extract_assessment_inputs(project) {
    var result = {};
    for (let z in project) {
        result[z] = _extract_scenario_inputs(project[z]);
    }
    return result;
}

function _extract_scenario_inputs(data) {
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

    inputdata.LAC = data.LAC;
    inputdata.LAC_calculation_type = data.LAC_calculation_type;
    inputdata.use_generation = 1;
    inputdata.generation = data.generation;
    inputdata.currentenergy = {
        use_by_fuel: data.currentenergy.use_by_fuel,
        onsite_generation: data.currentenergy.onsite_generation,
        generation: data.currentenergy.generation
    };

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

    inputdata.temperature = {
        responsiveness: data.temperature.responsiveness,
        target: data.temperature.target,
        living_area: data.temperature.living_area,
        temperature_adjustment: data.temperature.temperature_adjustment,
        hours_off: data.temperature.hours_off
    };
    inputdata.space_heating = {
        use_utilfactor_forgains: data.space_heating.use_utilfactor_forgains,
        heating_off_summer: data.space_heating.heating_off_summer
    };

    inputdata.heating_systems = data.heating_systems;

    inputdata.fuels = data.fuels;
    inputdata.imagegallery = data.imagegallery;
    inputdata.imagegallery_notes = data.imagegallery_notes;
    inputdata.featuredimage = data.featuredimage;
    inputdata.measures = data.measures;

    return inputdata;
}
