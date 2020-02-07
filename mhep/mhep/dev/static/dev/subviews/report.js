/*
 * Report generation
 *
 * There are two main units of code here:
 * - the Report class which handles the UI logic, and
 * - the rest of the file, which contains the logic for generating the actual report
 *   (this isn't in a class yet but should be)
 *
 * The basic concept of a report is that it's a Nunjucks template stored on the
 * organisation.  We then collect a load of the data from the asessment into a set of
 * context vars, which are passed through to the report.  This gives us a lot of
 * flexibility in the report contents between organisations without needing to hack in
 * lots of special cases.
 *
 * The report is rendered in an iframe to give it the maximum freedom of style, and to
 * avoid clashing with MHEP's own styling.
 */

console.log('debug report.js');

function report_initUI() {
    if (!window.questionnaire) {
        $.ajax({
            url: urlHelper.static('subviews/householdquestionnaire.js'),
            dataType: 'script',
            async: false,
            error: handleServerError('loading householdquestionnaire.js'),
        });
    }

    if (!view_html['compare']) {
        $.ajax({
            url: urlHelper.static('subviews/compare.js'),
            async: false,
            cache: false,
            error: handleServerError('loading subview compare.js'),
        });
    }

    let __report = new Report();
}

class Report {
    constructor() {
        this.element = {
            generateReport: document.querySelector('#generate-report'),
            printReport: document.querySelector('#print-report'),
            reportPreview: document.querySelector('#report-preview'),
            reportPreviewFrame: document.querySelector('iframe'),
        };

        this.organsations = [];
        mhep_helper.list_organisations()
            .then(orgs => this.organisations = orgs)
            .then(() => this.draw_organisations());

        this.draw_scenarios();

        this.element.generateReport.addEventListener('click', () => {
            this.render_report();
        });

        this.element.printReport.addEventListener('click', () => {
            this.element.reportPreviewFrame.contentWindow.focus();
            this.element.reportPreviewFrame.contentWindow.print();
        });
    }

    draw_organisations() {
        this.organisations[0].checked = true;

        let html = this.organisations
            .map(org =>`
                <li>
                    <input type="radio"
                           name="report-organisation"
                           value="${org.id}"
                           class="big-checkbox"
                           id="org-choice-${org.id}"
                           ${org.checked ? 'checked': ''}>
                    <label class="d-i" for="org-choice-${org.id}">${org.name}</label>
                </li>`)
            .join('');

        document.querySelector('#organisation-choices').innerHTML = html;
    }

    draw_scenarios() {
        let scenarioOpts = '<li><input type="checkbox" checked disabled class="big-checkbox" value="master"> Master</li>';

        for (let scenario_id in project) {
            if (scenario_id == 'master') {
                continue;
            }

            const idx = scenario_id.split('scenario')[1];
            const name = project[scenario_id].scenario_name;
            const is_checked = (
                scenario_id == 'scenario1'
                || scenario_id == 'scenario2'
                || scenario_id == 'scenario3'
            );

            scenarioOpts += `
                <li>
                    <input type="checkbox"
                           ${is_checked ? 'checked' : ''}
                           value="${scenario_id}"
                           class="big-checkbox"
                           id="check-${scenario_id}">
                    <label class="d-i" for="check-${scenario_id}">Scenario ${idx}: ${name}</label>
                </li>`;
        }

        document.querySelector('#scenario-choices').innerHTML = scenarioOpts;
    }

    render_report() {
        const selected = document.querySelector('input[name=report-organisation]:checked');
        if (!selected) {
            return;
        }

        const selected_id = selected.value;
        const org = this.organisations.find(e => e.id === selected_id);
        if (!org) {
            this.element.reportPreview.style.display = 'none';
        } else {
            this.element.reportPreview.style.display = 'block';
            report_show(
                this.element.reportPreviewFrame.contentDocument.querySelector('body'),
                org.report_template
            );
        }
    }
}


/**** REPORT GENERATION ****/

function report_show(root, template) {
    let t0 = performance.now();

    let scenarios = [];
    $('#scenario-choices input:checked').each(function () {
        scenarios.push(this.value);
    });

    nunjucks.configure({ autoescape: true });
    env = new nunjucks.Environment();
    env.addFilter('likert', filter_comfort_table);
    root.innerHTML = env.renderString(template, get_context_data(scenarios));

    const graphs = [
        [ add_heat_loss_summary,         '#heat-loss-summary' ],
        [ add_heat_balance,              '#heat-balance' ],
        [ add_space_heating_demand,      '#space-heating-demand' ],
        [ add_energy_demand,             '#fuel-use' ],
        [ add_primary_energy_usage,      '#energy-use-intensity' ],
        [ add_carbon_dioxide_per_m2,     '#carbon-dioxide-emissions' ],
        [ add_carbon_dioxide_per_person, '#carbon-dioxide-emissions-per-person' ],
        [ add_energy_costs,              '#estimated-energy-cost-comparison' ],
        [ add_peak_heating_load,         '#peak-heat-load' ],
    ];

    for (let [ draw, selector ] of graphs) {
        const elem = root.querySelector(selector);
        if (elem) {
            draw(elem, scenarios);
        }
    }

    let scenarios_comparison = {};
    let scenarios_measures_summary = {};
    let scenarios_measures_complete = {};

    for (let s of scenarios) {
        if (s != 'master') {
            scenarios_comparison[s] = compareCarbonCoop(s);
            scenarios_measures_summary[s] = getMeasuresSummaryTable(s);
            scenarios_measures_complete[s] = getMeasuresCompleteTables(s);
        }
    }

    add_measures_summary_tables(
        root.querySelector('#ccop-report-measures-summary-tables'),
        scenarios,
        scenarios_measures_summary
    );
    add_measures_complete_tables(
        root.querySelector('#report-measures-complete-tables'),
        scenarios,
        scenarios_measures_complete
    );
    add_comparison_tables(
        root.querySelector('#comparison-tables'),
        scenarios,
        scenarios_comparison
    );

    let t1 = performance.now();
    console.log('report_show took ' + (t1 - t0) + ' milliseconds.');
}

function filter_comfort_table(selected, left, right) {
    return new nunjucks.runtime.SafeString(`
        <div style="width: 7em; text-align: right; margin-right: 0.5em;">${left}</div>
        <svg viewBox="0 0 92 32" class="comfort-table">
            <rect y="1" x="1"  width="30" height="30" stroke-width="1" stroke="#777" fill="${selected === 'LOW' ? 'red' : 'white'}"></rect>
            <rect y="1" x="31" width="30" height="30" stroke-width="1" stroke="#777" fill="${selected === 'MID' ? 'green' : 'white'}"></rect>
            <rect y="1" x="61" width="30" height="30" stroke-width="1" stroke="#777" fill="${selected === 'HIGH' ? 'red' : 'white'}"></rect>
        </svg>
        <div style="width: 7em; margin-left: 0.5em;">${right}</div>`);
}

function get_featured_image() {
    let featuredImage = p.images.find(e => e.is_featured);
    if (featuredImage) {
        return featuredImage.url;
    } else {
        return '';
    }
}

function get_front_address() {
    let address = [
        project.master.household['address_1'] || '',
        project.master.household['address_2'] || '',
        project.master.household['address_3'] || '',
        project.master.household['address_town'] || '',
        project.master.household['address_postcode'] || '',
    ];

    return address.filter(e => e != '').join('\n');
}

function get_priorities() {
    let household = project.master.household;
    let priorities = [
        {
            title: 'Save carbon',
            order: parseInt(household['priority_carbon'], 10)
        },
        {
            title: 'Save money',
            order: parseInt(household['priority_money'], 10),
        },
        {
            title: 'Improve comfort',
            order: parseInt(household['priority_comfort'], 10),
        },
        {
            title: 'Improve indoor air quality',
            order: parseInt(household['priority_airquality'], 10)
        },
        {
            title: 'General modernisation',
            order: parseInt(household['priority_modernisation'], 10),
        },
        {
            title: 'Improve health',
            order: parseInt(household['priority_health'], 10),
        }
    ];

    return priorities
        .filter(elem => !isNaN(elem.order))
        .sort(function (a, b) {
            if (a.order < b.order) {
                return -1;
            } else if (a.order > b.order) {
                return 1;
            } else {
                return 0;
            }
        })
        .map(elem => elem.title)
        .slice(0, 3);
}

function get_improvements() {
    const options = [
        { key: '5_improv_loftconversion',     text: 'a loft conversion' },
        { key: '5_improv_extension',          text: 'an extension' },
        { key: '5_improv_insulation',         text: 'insulation' },
        { key: '5_improv_windows',            text: 'windows' },
        { key: '5_improv_heatinghotwater',    text: 'heating and hot water system' },
    ];

    return options.filter(opt => project.master.household[opt.key] ? true : false).map(opt => opt.text);
}

function get_average_temperature() {
    temps = [ project.master.household.reading_temp1, project.master.household.reading_temp2 ].filter(e => e ? true : false);
    if (temps.length === 0) {
        return null;
    } else if (temps.length === 1) {
        return temps[0];
    } else {
        return (temps[0] + temps[1]) / 2;
    }
}

function get_average_humidity() {
    temps = [ project.master.household.reading_humidity1, project.master.household.reading_humidity2 ].filter(e => e ? true : false);
    if (temps.length === 0) {
        return null;
    } else if (temps.length === 1) {
        return temps[0];
    } else {
        return (temps[0] + temps[1]) / 2;
    }
}

function get_pv() {
    if (typeof project.master.generation.solar_annual_kwh !== 'number' ||
            project.master.generation.solar_annual_kwh === 0) {
        return false;
    }

    return {
        generation: project.master.generation.solar_annual_kwh, // kWh
        used_onsite: project.master.generation.solar_fraction_used_onsite * 100,  // %
    };
}

function get_used_fuels(scenarios) {
    let all_fuel_names = new Set();

    for (let scenario_id of scenarios) {
        let scenario = project[scenario_id];
        for (let fuel of Object.values(scenario.fuel_totals)) {
            all_fuel_names.add(fuel.name);
        }
    }

    return [...all_fuel_names].map(name => ({
        name: name,
        co2factor: project.master.fuels[name].co2factor,
        standingcharge: project.master.fuels[name].standingcharge / 100,
        fuelcost: project.master.fuels[name].fuelcost / 100,
    }));
}

function get_scenario_list(scenarios) {
    return scenarios
        .filter(id => id !== 'master')
        .map(scenario_id => ({
            id: scenario_id,
            num: parseInt(scenario_id.match(/(\d+)/g)[0], 10),
            name: project[scenario_id].scenario_name,
            description: project[scenario_id].scenario_description,
        }));
}

function get_lookup(table, key) {
    return table[project.master.household[key]];
}

function get_context_data(scenarios) {
    const hh = project.master.household;

    return {
        front: {
            image_url: get_featured_image(),
            name: hh['householder_name'],
            address: get_front_address(),
            local_authority: hh['address_la'],
            survey_date: hh['assessment_date'],
            report_date: hh['report_date'],
            report_version: hh['report_version'],
            mhep_version: VERSION,
            assessor_name: hh['assessor_name'],
        },
        aims: {
            future: {
                occupancy_actual: get_lookup(questionnaire.OCCUPANCY_ACTUAL, 'occupancy_actual'),
                occupancy_planned: get_lookup(questionnaire.OCCUPANCY_EXPECTED, 'occupancy_expected'),
                occupancy_notes: hh['occupancy_expected_note'],
                lifestyle_change: hh['expected_lifestyle_change'] === 'YES',
                lifestyle_change_notes: hh['expected_lifestyle_change_note'],
                other_works: hh['expected_other_works'] === 'YES',
                other_works_notes: hh['expected_other_works_note'],
                works_start: get_lookup(questionnaire.WORKS_START, 'expected_start'),
                works_start_notes: hh['expected_start_note'],
            },
            priorities: get_priorities(),
            qual_criteria: hh['priority_qualitative_note'],
            aesthetics: {
                internal: hh['aesthetics_external'] === 'YES',
                external: hh['aesthetics_internal'] === 'YES',
                note: hh['aesthetics_note'],
            },
            logistics: {
                packaging: get_lookup(questionnaire.LOGISTICS_PACKAGING, 'logistics_packaging'),
                can_diy: hh['logistics_diy'] === 'YES',
                diy_note: hh['logistics_diy_note'],
                disruption: get_lookup(questionnaire.LOGISTICS_DISRUPTION, 'logistics_disruption'),
                disruption_comment: hh['logistics_disruption_note'],
                has_budget: hh['logistics_budget'] === 'YES',
                budget_comment: hh['logistics_budget_note'],
                brief: hh['commentary_brief'],
            }
        },
        now: {
            home_type: get_lookup(questionnaire.HOUSE_TYPE, 'house_type'),
            num_bedrooms: hh['house_nr_bedrooms'],
            floor_area: project.master.TFA,
            construction: {
                floors: hh['construct_note_floors'],
                walls: hh['construct_note_walls'],
                roof: hh['construct_note_roof'],
                openings: hh['construct_note_openings'],
                drainage: hh['construct_note_drainage'],
                ventiliation: hh['construct_note_ventiliation'],
                ingress: hh['construct_note_ingress'],
            },
            previous_works: hh['previous_works'],
            structural: {
                you_said: hh['structural_issues'],
                we_noted: hh['structural_issues_note'],
            },
            damp: {
                you_said: hh['damp'],
                we_noted: hh['damp_note'],
            },
            space_heating: hh['space_heating_provided'],
            space_heating_controls: hh['space_heating_controls'],
            hot_water: hh['hot_water_provided'],
            utility: {
                electricity: hh['mains_electricity'],
                gas: hh['mains_gas'],
                water: hh['mains_water'],
                sewer: hh['mains_sewer'],
            },
            ventilation: {
                system_name: project.master.ventilation.ventilation_name,
                ventilation_suggestion: get_lookup(questionnaire.VENTILATION_SUGGESTION, 'ventilation_suggestion'),
                avg_humidity: get_average_humidity(),
                adequate_paths: hh['ventilation_adequate_paths'] === 'YES',
                purge_vents: hh['ventilation_purge_vents'] === 'YES',
                gaps: hh['ventilation_gaps'] === 'YES',
                note: hh['ventilation_note'],
                fuel_burner: hh['fuel_burner'],
                fuel_burner_note: hh['fuel_burner_note'],
            },
            laundry_habits: hh['laundry'],
            radon_chance: get_lookup(questionnaire.RADON_RISK, 'radon_risk'),
            experience: {
                thermal: {
                    temperature_winter: hh['comfort_temperature_winter'],
                    temperature_summer: hh['comfort_temperature_summer'],
                    airquality_winter: hh['comfort_airquality_winter'],
                    airquality_summer: hh['comfort_airquality_summer'],
                    draughts_winter: hh['comfort_draughts_winter'],
                    draughts_summer: hh['comfort_draughts_summer'],
                    avg_temp: get_average_temperature(),
                    problems: hh['thermal_comfort_problems'],
                    note: hh['thermal_comfort_note'],
                },
                daylight: {
                    amount: hh['daylight'],
                    problems: hh['daylight_problems'] === 'YES',
                    note: hh['daylight_note'],
                },
                noise: {
                    problems: hh['noise_problems'] === 'YES',
                    note: hh['noise_note'],
                },
                rooms: {
                    favourite: hh['rooms_favourite'],
                    unloved: hh['rooms_unloved'],
                }
            },
            historic: {
                when_built: hh['historic_age_precise']
                    ? hh['historic_age_precise']
                    : get_lookup(questionnaire.HISTORIC_AGE_BAND, 'historic_age_band'),
                conservation: hh['historic_conserved'] === 'YES',
                listed: hh['historic_listed'] === 'NO'
                    ? false
                    : get_lookup(questionnaire.HISTORIC_LISTED, 'historic_listed'),
                comments: hh['historic_note'],
            },
            theworldisburning: {
                flooding_history: hh['flooding_history'] === 'YES',
                flooding_rivers_sea: get_lookup(questionnaire.FLOODING_RISK, 'flooding_rivers_sea'),
                flooding_surface_water: get_lookup(questionnaire.FLOODING_RISK, 'flooding_surface_water'),
                flooding_comments: hh['flooding_note'],
                overheating_comments: hh['overheating_note'],
            },
            context_and_other_points: hh['context_and_other_points'],
            pv: get_pv(),
        },
        used_fuels: get_used_fuels(scenarios),
        commentary: {
            context: hh['commentary_context'],
            decisions: hh['commentary_decisions'],
        },
        scenarios: {
            list: get_scenario_list(scenarios),
        }
    };
}

function add_heat_loss_summary(root, scenarios) {
    $(root).html('');

    for (let scenario of scenarios) {
        let house_markup = generateHouseMarkup(heatlossData(scenario));
        let name = scenario == 'master' ? 'Your home now' : 'Scenario ' + scenario.split('scenario')[1];
        let html = `
            <div class="report-house">
                <span class="report-house-name">${name}</span>
                ${house_markup}
            </div>`;

        $(root).append(html);
    }
}

function add_heat_balance(root, scenarios) {
    // Heat transfer per year by element. The gains and losses here need to balance.
    var dataFig4 = [];
    var max_value = 250; // used to set the height of the chart

    scenarios.forEach(function (scenario) {
        if (scenario == 'master') {
            var label = 'Your home now';
        } else {
            var label = 'Scenario ' + scenario.split('scenario')[1];
        }
        if (project[scenario] !== undefined && project[scenario].annual_useful_gains_kWh_m2 !== undefined) {
            dataFig4.push({
                label: label,
                value: [
                    {value: project[scenario].annual_useful_gains_kWh_m2['Internal'], label: 'Internal Gains'},
                    {value: project[scenario].annual_useful_gains_kWh_m2['Solar'], label: 'Solar Gains'},
                    {value: project[scenario].space_heating.annual_heating_demand_m2, label: 'Space Heating Requirement'},
                    {value: -project[scenario].annual_losses_kWh_m2['fabric'], label: 'Fabric Losses'},
                    {value: -(project[scenario].annual_losses_kWh_m2['ventilation'] + project[scenario].annual_losses_kWh_m2['infiltration']), label: 'Ventilation and Infiltration Losses'},
                ]
            });
            if (max_value < (project[scenario].annual_losses_kWh_m2['fabric'] + project[scenario].annual_losses_kWh_m2['ventilation'] + project[scenario].annual_losses_kWh_m2['infiltration'])) {
                max_value = 50 + project[scenario].annual_losses_kWh_m2['fabric'] + project[scenario].annual_losses_kWh_m2['ventilation'] + project[scenario].annual_losses_kWh_m2['infiltration'];
            }
        }
    });

    var HeatBalance = new BarChart({
        chartTitleColor: 'rgb(87, 77, 86)',
        yAxisLabelColor: 'rgb(87, 77, 86)',
        barLabelsColor: 'rgb(87, 77, 86)',
        yAxisLabel: 'kWh/m².year',
        fontSize: 33,
        width: 1200.35,
        chartHeight: 600,
        division: 50,
        barWidth: 440 / dataFig4.length,
        barGutter: 480 / dataFig4.length,
        chartHigh: max_value,
        chartLow: -max_value,
        font: 'Work Sans',
        defaultBarColor: 'rgb(231,37,57)',
        barColors: {
            'Internal Gains': 'rgb(24,86,62)',
            'Solar Gains': 'rgb(240,212,156)',
            'Space Heating Requirement': 'rgb(236,102,79)',
            'Fabric Losses': 'rgb(246,167,7)',
            'Ventilation and Infiltration Losses': 'rgb(157, 213, 203)',
        },
        data: dataFig4,
    });
    HeatBalance.draw(root);
}
function add_space_heating_demand(root, scenarios) {
    var dataFig = [];
    var max_value = 250; // used to set the height of the chart
    var label = '';
    var value = 0;
    for (var i = 0; i < scenarios.length; i++) {
        if (project[scenarios[i]].space_heating_demand_m2 !== undefined) {
            value = Math.round(project[scenarios[i]].space_heating_demand_m2);
            if (scenarios[i] == 'master') {
                label = 'Your home now';
            } else {
                label = 'Scenario ' + scenarios[i].split('scenario')[1];
            }
            dataFig.push({label: label, value: value});
            if (max_value < value) {
                max_value = value + 50;
            }
        } else {
            dataFig.push({label: label, value: 0});
        }
    }

    var SpaceHeatingDemand = new BarChart({
        chartTitleColor: 'rgb(87, 77, 86)',
        yAxisLabelColor: 'rgb(87, 77, 86)',
        barLabelsColor: 'rgb(87, 77, 86)',
        yAxisLabel: 'kWh/m²·year',
        fontSize: 33,
        font: 'Work Sans',
        division: 50,
        chartHigh: max_value,
        width: 1200,
        chartHeight: 600,
        barWidth: 440 / dataFig.length,
        barGutter: 380 / dataFig.length,
        defaultBarColor: 'rgb(157,213,203)',
        // barColors: {
        // 	'Space heating': 'rgb(157,213,203)',
        // 	'Pumps, fans, etc.': 'rgb(24,86,62)',
        // 	'Cooking': 'rgb(40,153,139)',
        // },
        targets: [
            {
                label: 'Min. target',
                target: datasets.target_values.space_heating_demand_lower,
                color: 'rgb(231,37,57)'
            },
            {
                label: 'Max. target',
                target: datasets.target_values.space_heating_demand_upper,
                color: 'rgb(231,37,57)'
            },
            {
                label: 'UK Average',
                target: datasets.uk_average_values.space_heating_demand,
                color: 'rgb(231,37,57)'
            },
        ],
        targetRange: [
            {
                label: '(kWh/m2.a)',
                target: 20,
                color: 'rgb(231,37,57)'
            },
            {
                label: '(kWh/m2.a)',
                target: 70,
                color: 'rgb(231,37,57)'
            },
        ],
        data: dataFig
    });
    SpaceHeatingDemand.draw(root);
}
function add_energy_demand(root, scenarios) {
    let energyDemandData = getEnergyDemandData(scenarios);
    var dataFig = prepare_data_for_graph(energyDemandData);

    const max = getGraphCeil({
        min: 5000,
        max: getGraphValuesMax(dataFig),
        incr: 5000
    });

    var EnergyDemand = new BarChart({
        chartTitleColor: 'rgb(87, 77, 86)',
        yAxisLabelColor: 'rgb(87, 77, 86)',
        barLabelsColor: 'rgb(87, 77, 86)',
        yAxisLabel: 'kWh/year',
        fontSize: 33,
        font: 'Work Sans',
        width: 1200,
        chartHeight: 600,
        division: 5000,
        chartHigh: max,
        barWidth: 550 / dataFig.length,
        barGutter: 400 / dataFig.length,
        defaultBarColor: 'rgb(231,37,57)',
        defaultVarianceColor: 'rgb(2,37,57)',
        barColors: {
            'Gas': 'rgb(236,102,79)',
            'Electric': 'rgb(240,212,156)',
            'Other': 'rgb(24,86,62)',
        },
        data: dataFig
    });
    EnergyDemand.draw(root);
}
function add_primary_energy_usage(root, scenarios) {
    let [ primaryEnergyUseData, min, max ] = getPrimaryEnergyUseData(scenarios);
    min -= 50;

    var dataGraph = prepare_data_for_graph(primaryEnergyUseData);
    var primaryEneryUse = new BarChart({
        chartTitleColor: 'rgb(87, 77, 86)',
        yAxisLabelColor: 'rgb(87, 77, 86)',
        barLabelsColor: 'rgb(87, 77, 86)',
        yAxisLabel: 'kWh/m².year',
        fontSize: 33,
        font: 'Work Sans',
        width: 1200,
        chartHeight: 600,
        division: 50,
        barWidth: 550 / dataGraph.length,
        barGutter: 400 / dataGraph.length,
        chartHigh: max,
        chartLow: min,
        defaultBarColor: 'rgb(157,213,203)',
        barColors: {
            'Water Heating': 'rgb(157,213,203)',
            'Space Heating': 'rgb(66, 134, 244)',
            'Cooking': 'rgb(24,86,62)',
            'Appliances': 'rgb(240,212,156)',
            'Lighting': 'rgb(236,102,79)',
            'Fans and Pumps': 'rgb(246, 167, 7)',
            'Non categorized': 'rgb(131, 51, 47)',
            // 'Generation': 'rgb(200,213,203)'
        },
        data: dataGraph,
        targets: [
            {
                label: 'UK Average 360 kWh/m².a',
                target: 360,
                color: 'rgb(231,37,57)'
            }, {
                label: 'Carbon Coop Target 120 kWh/m².a',
                target: 120,
                color: 'rgb(231,37,57)'
            }
        ],
    });
    primaryEneryUse.draw(root);
}
function add_carbon_dioxide_per_m2(root, scenarios) {
    var carbonDioxideEmissionsData = [];
    var max = 100;
    if (project['master'] !== undefined && project['master'].kgco2perm2 !== undefined) {
        var array = [{value: project['master'].kgco2perm2}];
        // project[scenario].kgco2perm2 has deducted the savings due to renewables, to make the graph clearer we add the savings as negative to give the impression of offset
        if (project['master'].use_generation == 1 && project['master'].fuel_totals['generation'].annualco2 < 0) {
            array.push({value: project['master'].fuel_totals['generation'].annualco2 / data.TFA});
        }
        carbonDioxideEmissionsData.push({label: 'Your home now', value: array});
    }

    var array = [{value: project['master'].currentenergy.total_co2m2}, {value: -data.currentenergy.generation.annual_CO2 / data.TFA}];
    carbonDioxideEmissionsData.push({label: 'Bills data', value: array});

    scenarios.forEach(function (scenario) {
        if (scenario != 'master') {
            var array = [{value: project[scenario].kgco2perm2}];
            // project[scenario].kgco2perm2 has deducted the savings due to renewables, to make the graph clearer we add the savings as negative to give the impression of offset
            if (project[scenario].use_generation == 1 && project[scenario].fuel_totals['generation'].annualco2 < 0) {
                array.push({value: project[scenario].fuel_totals['generation'].annualco2 / data.TFA});
            }
            carbonDioxideEmissionsData.push({label: 'Scenario ' + scenario.split('scenario')[1], value: array});
        }
    });

    carbonDioxideEmissionsData.forEach(function (scenario) {
        if (scenario.value > max) {
            max = scenario.value + 10;
        }
    });
    var CarbonDioxideEmissions = new BarChart({
        chartTitleColor: 'rgb(87, 77, 86)',
        yAxisLabelColor: 'rgb(87, 77, 86)', barLabelsColor: 'rgb(87, 77, 86)',
        yAxisLabel: 'kgCO₂/m².year', fontSize: 33,
        font: 'Work Sans',
        division: 10,
        width: 1200,
        chartHeight: 600,
        chartHigh: max,
        barWidth: 550 / carbonDioxideEmissionsData.length,
        barGutter: 400 / carbonDioxideEmissionsData.length,
        defaultBarColor: 'rgb(157,213,203)',
        data: carbonDioxideEmissionsData,
        targets: [
            {
                label: 'Carbon Coop Target - ' + datasets.target_values.co2_emission_rate + 'kgCO₂/m².year', target: datasets.target_values.co2_emission_rate,
                color: 'rgb(231,37,57)'
            },
            {
                label: 'UK Average - ' + datasets.uk_average_values.co2_emission_rate + 'kgCO₂/m².year',
                target: datasets.uk_average_values.co2_emission_rate,
                color: 'rgb(231,37,57)'
            },
        ], });
    CarbonDioxideEmissions.draw(root);
}
function add_carbon_dioxide_per_person(root, scenarios) {
    var graphData = [];
    if (project['master'] !== undefined && project['master'].annualco2 !== undefined && project['master'].occupancy !== undefined) {
        var array = [{value: project['master'].annualco2 / project['master'].occupancy}];
        // project[scenario].kgco2perm2 has deducted the savings due to renewables, to make the graph clearer we add the savings as negative to give the impression of offset
        if (project['master'].use_generation == 1 && project['master'].fuel_totals['generation'].annualco2 < 0) {
            array.push({value: project['master'].fuel_totals['generation'].annualco2 / project['master'].occupancy});
        }
        graphData.push({label: 'Your home now', value: array});
    }

    var array = [{value: project['master'].TFA * project['master'].currentenergy.total_co2m2 / project['master'].occupancy}, {value: -data.currentenergy.generation.annual_CO2 / project['master'].occupancy}];
    graphData.push({label: 'Bills data', value: array});

    scenarios.forEach(function (scenario) {
        if (scenario != 'master') {
            var array = [{value: project[scenario].annualco2 / project['master'].occupancy}];
            // project[scenario].kgco2perm2 has deducted the savings due to renewables, to make the graph clearer we add the savings as negative to give the impression of offset
            if (project[scenario].use_generation == 1 && project[scenario].fuel_totals['generation'].annualco2 < 0) {
                array.push({value: project[scenario].fuel_totals['generation'].annualco2 / project['master'].occupancy});
            }
            graphData.push({label: 'Scenario ' + scenario.split('scenario')[1], value: array});
        }
    });

    const max = getGraphCeil({
        min: 8000,
        max: getGraphValuesMax(graphData),
        incr: 1000
    });

    var CarbonDioxideEmissionsPerPerson = new BarChart({
        chartTitleColor: 'rgb(87, 77, 86)',
        yAxisLabelColor: 'rgb(87, 77, 86)',
        barLabelsColor: 'rgb(87, 77, 86)',
        yAxisLabel: 'kgCO₂/person/year',
        fontSize: 33,
        font: 'Work Sans',
        division: max < 28000 ? 1000 : 2000,
        chartHigh: max,
        width: 1200,
        chartHeight: 600,
        barWidth: 550 / graphData.length,
        barGutter: 400 / graphData.length,
        defaultBarColor: 'rgb(157,213,203)', defaultVarianceColor: 'rgb(231,37,57)',
        // barColors: {
        // 	'Space heating': 'rgb(157,213,203)',
        // 	'Pumps, fans, etc.': 'rgb(24,86,62)',
        // 	'Cooking': 'rgb(40,153,139)',         // },
        data: graphData
    });
    CarbonDioxideEmissionsPerPerson.draw(root);
}
function add_energy_costs(root, scenarios) {
    var estimatedEnergyCostsData = [];
    if (project['master'] !== undefined && project['master'].total_cost !== undefined) {
        var array = [{value: project['master'].total_cost}];
        // project[scenario].total_cost has deducted the savings due to renewables, to make the graph clearer we add the savings as negative to give the impression of offset
        if (project['master'].use_generation == 1 && project['master'].fuel_totals['generation'].annualcost < 0) {
            array.push({value: project['master'].fuel_totals['generation'].annualcost});
        }
        estimatedEnergyCostsData.push({label: 'Your home now', value: array});
    }

    var array = [{value: project['master'].currentenergy.total_cost}];
    // project[scenario].total_cost has deducted the savings due to renewables, to make the graph clearer we add the savings as negative to give the impression of offset
    if (project['master'].currentenergy.generation.annual_savings > 0) {
        array.push({value: -project['master'].currentenergy.generation.annual_savings});
    }
    estimatedEnergyCostsData.push({label: 'Bills data', value: array});

    scenarios.forEach(function (scenario) {
        if (scenario != 'master') {
            var array = [{value: project[scenario].total_cost}];
            // project[scenario].total_cost has deducted the savings due to renewables, to make the graph clearer we add the savings as negative to give the impression of offset
            if (project[scenario].use_generation == 1 && project[scenario].fuel_totals['generation'].annualcost < 0) {
                array.push({value: project[scenario].fuel_totals['generation'].annualcost});
            }
            estimatedEnergyCostsData.push({label: 'Scenario ' + scenario.split('scenario')[1], value: array});
        }
    });

    const max = getGraphCeil({
        min: 500,
        max: getGraphValuesMax(estimatedEnergyCostsData),
        incr: 500
    });

    var EstimatedEnergyCosts = new BarChart({
        chartTitleColor: 'rgb(87, 77, 86)',
        yAxisLabelColor: 'rgb(87, 77, 86)',
        barLabelsColor: 'rgb(87, 77, 86)',
        yAxisLabel: '£/year',
        fontSize: 33,
        font: 'Work Sans',
        division: 500,
        chartHigh: max,
        width: 1200,
        chartHeight: 600,
        barWidth: 550 / estimatedEnergyCostsData.length,
        barGutter: 400 / estimatedEnergyCostsData.length,
        defaultBarColor: 'rgb(157,213,203)',
        data: estimatedEnergyCostsData
    });
    EstimatedEnergyCosts.draw(root);
}

function add_measures_summary_tables(root, scenarios, scenarios_measures_summary) {
    $(root).html('');
    var abc = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r'];
    scenarios.forEach(function (scenario, index) {
        if (scenario != 'master') {
            if (index == 1) {
                var html = '<div>';
            } else {
                var html = '<div class="break-before-always">';
            }
            html += '<h4 class="top-border-title title-margin-bottom">Figure 13' + abc[index - 1] + ' - Scenario ' + scenario.split('scenario')[1] + ': ' + project[scenario].scenario_name + '</h4>';
            if (project[scenario].created_from !== undefined && project[scenario].created_from != 'master') {
                html += '<p>This scenario assumes the measures in Scenario ' + project[scenario].created_from.split('scenario')[1] + ' have already been carried out and adds to them</p>';
            }
            html += '<p>Total cost of the scenario £' + Math.round(measures_costs(scenario) / 10) * 10 + ' </p>';
            html += '<div class="measures-table-wrapper">' + scenarios_measures_summary[scenario] + '</div>';
            html += '</div>';
            //html = html.replace('measures-summary-table', 'measures-summary-table no-break');
            $(root).append(html);
        }
    });
}
function add_measures_complete_tables(root, scenarios, scenarios_measures_complete) {
    $(root).html('');

    scenarios.forEach(function (scenario, index) {
        if (scenario == 'master') {
            return;
        }

        let scenarioName = scenario.split('scenario')[1] + ': ' + project[scenario].scenario_name;
        let className = index == 1 ? '' : 'break-before-always';
        let totalCost = Math.round(measures_costs(scenario) / 10) * 10;
        let createdFrom = '';

        if (project[scenario].created_from !== undefined && project[scenario].created_from != 'master') {
            createdFrom = '<p>This scenario assumes the measures in Scenario ' + project[scenario].created_from.split('scenario')[1] + ' have already been carried out and adds to them</p>';
        }

        html = `
            <section class="minor ${className}">
                <h4>Scenario ${scenarioName}</h4>
                ${createdFrom}
                <p>Total cost of the scenario £${totalCost}</p>
                <div class="five-col-table-wrapper">
                    ${scenarios_measures_complete[scenario]}
                </div>
            </div>
        `;

        $(root).append(html);
    });
}
function add_comparison_tables(root, scenarios, scenarios_comparison) {
    $(root).html('');
    var abc = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r'];
    scenarios.forEach(function (scenario, index) {
        if (scenario != 'master') {
            var html = '<section class="minor">';
            html += ' <h3>Figure 15' + abc[index - 1] + ' Master/Scenario ' + scenario.split('scenario')[1] + 'Comparison Table</h3>';
            html += '<div class="js-scenario-comparison">' + scenarios_comparison[scenario] + '</div>';
            html += '</section>';
            $(root).append(html);
        }
    });
}

/*****************************************************************/

function heatlossData(scenario) {
    if (project[scenario] !== undefined && project[scenario].fabric !== undefined) {
        return {
            floorwk: Math.round(project[scenario].fabric.total_floor_WK),
            ventilationwk: Math.round(project[scenario].ventilation.average_ventilation_WK),
            infiltrationwk: Math.round(project[scenario].ventilation.average_infiltration_WK),
            windowswk: Math.round(project[scenario].fabric.total_window_WK),
            wallswk: Math.round(project[scenario].fabric.total_wall_WK),
            roofwk: Math.round(project[scenario].fabric.total_roof_WK),
            thermalbridgewk: Math.round(project[scenario].fabric.thermal_bridging_heat_loss),
            totalwk: Math.round(project[scenario].fabric.total_floor_WK + project[scenario].ventilation.average_WK + project[scenario].fabric.total_window_WK + project[scenario].fabric.total_wall_WK + project[scenario].fabric.total_roof_WK + project[scenario].fabric.thermal_bridging_heat_loss)
        };
    } else {
        return {
            floorwk: 0,
            ventilationwk: 0,
            infiltrationwk: 0,
            windowswk: 0,
            wallswk: 0,
            roofwk: 0,
            thermalbridgewk: 0,
            totalwk: 0
        };
    }
}
function calculateRedShade(value, calibrateMax) {
    var calibrateMax = 292;
    return 'rgba(255,0,0, ' + (value / calibrateMax) + ')';
}
function generateHouseMarkup(heatlossData) {

    var uscale = 30;
    var sFloor = Math.sqrt(heatlossData.floorwk / uscale);
    var sVentilation = Math.sqrt(heatlossData.ventilationwk / uscale);
    var sInfiltration = Math.sqrt(heatlossData.infiltrationwk / uscale);
    var sWindows = Math.sqrt(heatlossData.windowswk / uscale);
    var sWalls = Math.sqrt(heatlossData.wallswk / uscale);
    var sRoof = Math.sqrt(heatlossData.roofwk / uscale);
    var sThermal = Math.sqrt(heatlossData.thermalbridgewk / uscale);
    var html = '<svg x="0px" y="0px" viewBox="0 -20 444 370" enable-background="new 0 0 444 330.5">\
     <path fill="none" stroke="#F0533C" stroke-width="6" stroke-miterlimit="10" d="M106.8,108.1"/>\
     <polyline fill="none" stroke="#F0533C" stroke-width="8" stroke-miterlimit="10" points="316.6,108.1 316.6,263.4 106.8,263.4 \
     106.8,230.9 "/>\
     <polyline fill="none" stroke="#F0533C" stroke-width="11" stroke-miterlimit="10" points="95.7,119.5 211.7,33.5 327.6,119.5 "/>\
     <path fill="none" stroke="#F0533C" stroke-width="6" stroke-miterlimit="10" d="M57.8,240.6"/>\
     <line fill="none" stroke="#F0533C" stroke-width="8" stroke-miterlimit="10" x1="106.5" y1="195.6" x2="106.5" y2="160.7"/>\
     <line opacity="0.4" fill="none" stroke="#F0533C" stroke-width="8" stroke-miterlimit="10" x1="106.5" y1="160.7" x2="106.5" y2="125.8"/>\
     <line fill="none" stroke="#F0533C" stroke-width="8" stroke-miterlimit="10" x1="106.8" y1="125.8" x2="106.8" y2="107.8"/>\
     <polygon id="roof" fill="#F0533C" transform="translate(270,60) scale(' + sRoof + ')" points="6.9,-23.6 -6.9,-5.4 7.7,5.6 21.5,-12.7 28.5,-7.4 24.9,-32.3 -0.1,-28.9 "/>\
     <polygon id="windows" transform="translate(92,144) scale(-' + sWindows + ')" fill="#F0533C" points="22.9,-9.1 0,-9.1 0,9.1 22.9,9.1 22.9,17.9 40.6,0 22.9,-17.9 "/>\
     <polygon id="ventilation" transform="translate(92,235) scale(-' + sVentilation + ')" fill="#F0533C" points="22.9,-9.1 0,-9.1 0,9.1 22.9,9.1 22.9,17.9 40.6,0 22.9,-17.9 "/>\
     <polygon id="infiltration" transform="translate(140,65) scale(-' + sInfiltration + ') rotate(52)" fill="#F0533C" points="22.9,-9.1 0,-9.1 0,9.1 22.9,9.1 22.9,17.9 40.6,0 22.9,-17.9 "/>\
     <polygon id="wall" transform="translate(330,242) scale(' + sWalls + ')" fill="#F0533C" points="22.9,-9.1 0,-9.1 0,9.1 22.9,9.1 22.9,17.9 40.6,0 22.9,-17.9 "/>\
     <polygon id="thermal-bridging" transform="translate(330,144) scale(' + sThermal + ')" fill="#F0533C" points="22.9,-9.1 0,-9.1 0,9.1 22.9,9.1 22.9,17.9 40.6,0 22.9,-17.9 "/>\
     <polygon id="floor" transform="translate(213,278) scale(' + sFloor + ')" fill="#F0533C" points="9.1,22.9 9.1,0 -9.1,0 -9.1,22.9 -17.9,22.9 0,40.6 17.9,22.9 "/>\
     <text transform="matrix(1 0 0 1 191.0084 172.7823)"><tspan x="0" y="0" fill="#F0533C" font-family="Work Sans" font-size="14">TOTAL </tspan><tspan x="-5.4" y="16.8" fill="#F0533C" font-size="14">' + heatlossData.totalwk + ' W/K</tspan></text>\
     <text transform="matrix(1 0 0 1 328.5163 95)"><tspan x="0" y="0" fill="#F0533C" font-family="Work Sans" font-size="11">Thermal Bridging</tspan><tspan x="0" y="12" fill="#F0533C" font-size="11">' + heatlossData.thermalbridgewk + ' W/K</tspan></text>\
     <text transform="matrix(1 0 0 1 230.624 21.1785)"><tspan x="0" y="0" fill="#F0533C" font-family="Work Sans" font-size="11">Roof</tspan><tspan x="0" y="12" fill="#F0533C" font-size="11">' + heatlossData.roofwk + ' W/K</tspan></text>\
     <text transform="matrix(1 0 0 1 330.5875 283.9302)"><tspan x="0" y="0" fill="#F0533C" font-family="Work Sans" font-size="11">Walls</tspan><tspan x="0" y="12" fill="#F0533C" font-size="11">' + heatlossData.wallswk + ' W/K</tspan></text>\
     <text transform="matrix(1 0 0 1 53.3572 283.9302)"><tspan x="0" y="0" fill="#F0533C" font-family="Work Sans" font-size="11">Planned ventilation</tspan><tspan x="0" y="12" fill="#F0533C" font-size="11">' + heatlossData.ventilationwk + ' W/K</tspan></text>\
     <text transform="matrix(1 0 0 1 150.0000 21)"><tspan x="0" y="0" fill="#F0533C" font-family="Work Sans" font-size="11">Draughts</tspan><tspan x="0" y="12" fill="#F0533C" font-size="11">' + heatlossData.infiltrationwk + ' W/K</tspan></text>\
     <text transform="matrix(1 0 0 1 35.0902 90.1215)"><tspan x="-5" y="0" fill="#F0533C" font-family="Work Sans" font-size="11">Windows &amp; doors</tspan><tspan x="11.2" y="12" fill="#F0533C" font-size="11">' + heatlossData.windowswk + ' W/K</tspan></text>\
     <text transform="matrix(1 0 0 1 248.466 283.9302)"><tspan x="0" y="0" fill="#F0533C" font-family="Work Sans" font-size="11">Floor</tspan><tspan x="0" y="12" fill="#F0533C" font-size="11">' + heatlossData.floorwk + ' W/K</tspan></text>\
     <g opacity="0.4">\
     <polygon fill="#F0533C" points="110.1,133.2 102.8,128.8 102.8,129.9 110.1,134.3 	"/>\
     <polygon fill="#F0533C" points="110.1,141.5 102.8,137.1 102.8,138.2 110.1,142.6 	"/>\
     <polygon fill="#F0533C" points="110.1,149.8 102.8,145.4 102.8,146.4 110.1,150.8 	"/>\
     <polygon fill="#F0533C" points="110.1,158 102.8,153.6 102.8,154.7 110.1,159.1 	"/>\
     </g>\
     <line opacity="0.4" fill="none" stroke="#F0533C" stroke-width="8" stroke-miterlimit="10" x1="106.5" y1="230.7" x2="106.5" y2="195.8"/>\
     <g opacity="0.4">\
     <polygon fill="#F0533C" points="110.1,203.2 102.8,198.8 102.8,199.9 110.1,204.3 	"/>\
     <polygon fill="#F0533C" points="110.1,211.5 102.8,207.1 102.8,208.2 110.1,212.6 	"/>\
     <polygon fill="#F0533C" points="110.1,219.8 102.8,215.4 102.8,216.4 110.1,220.8 	"/>\
     <polygon fill="#F0533C" points="110.1,228 102.8,223.6 102.8,224.7 110.1,229.1 	"/>\
     </g>\
     </svg>';
    return html;
}
function getEnergyDemandData(scenarios) {
    var data = {};
    for (var i = 0; i < scenarios.length; i++) {
        const scenario_id = scenarios[i];
        const scenario = project[scenario_id];
        if (!scenario) {
            console.log("Scenario doesn't exist");
            continue;
        }

        data[scenario_id] = [];

        var electric = 0;
        var gas = 0;
        var other = 0;

        if (scenario.fuel_totals !== undefined) {
            for (var fuel in scenario.fuel_totals) {
                if (scenario.fuels[fuel].category == 'Electricity') {
                    electric += scenario.fuel_totals[fuel].quantity;
                } else if (scenario.fuels[fuel].category == 'Gas') {
                    gas += scenario.fuel_totals[fuel].quantity;
                } else if (fuel != 'generation') {
                    other += scenario.fuel_totals[fuel].quantity;
                }
            }
            data[scenario_id].push({value: gas, label: 'Gas', variance: gas * 0.3});
            data[scenario_id].push({value: electric, label: 'Electric', variance: electric * 0.3});
            data[scenario_id].push({value: other, label: 'Other', variance: other * 0.3});
        }
    }

    data.bills = [
        { value: 0, label: 'Gas', },
        { value: 0, label: 'Electric', },
        { value: 0, label: 'Other' }
    ];

    for (var fuel in project['master'].currentenergy.use_by_fuel) {
        var f_use = project['master'].currentenergy.use_by_fuel[fuel];
        if (project['master'].fuels[fuel].category == 'Gas') {
            data.bills[0].value += f_use.annual_use;
        } else if (project['master'].fuels[fuel].category == 'Electricity') {
            data.bills[1].value += f_use.annual_use;
        } else {
            data.bills[2].value += f_use.annual_use;
        }
    }
    data.bills[1].value += project['master'].currentenergy.generation.fraction_used_onsite * project['master'].currentenergy.generation.annual_generation; // We added consumption coming from generation

    return data;
}
function getPrimaryEnergyUseData(scenarios) {
    let primaryEnergyUseData = {};
    let min = 0;
    let max = 500;

    for (var i = 0; i < scenarios.length; i++) {
        const scenario_id = scenarios[i];
        const scenario = project[scenario_id];

        const val = (label, key) => {
            if (scenario.fuel_requirements[key] !== undefined) {
                primaryEnergyUseData[scenario_id].push({
                    label: label,
                    value: scenario.fuel_requirements[key].quantity / data.TFA,
                });
            }
        };

        primaryEnergyUseData[scenario_id] = [];
        val('Water Heating',  'waterheating');
        val('Space Heating',  'space_heating');
        val('Cooking',        'cooking');
        val('Appliances',     'appliances');
        val('Lighting',       'lighting');
        val('Fans and Pumps', 'fans_and_pumps');

        // we offset the stack displacing it down function() {}or the amount of renewables
        if (scenario.use_generation == 1 && scenario.fuel_totals['generation'].primaryenergy < 0) {
            // fuel_totals['generation'].primaryenergy is negative
            var renewable_left = -scenario.fuel_totals['generation'].primaryenergy / data.TFA;

            primaryEnergyUseData[scenario_id].forEach(function (use) {
                if (use.value <= renewable_left) {
                    renewable_left -= use.value;
                    use.value = -use.value;
                } else {
                    primaryEnergyUseData[scenario_id].push({value: use.value - renewable_left, label: use.label}); // we create another bar with the same color than current use with the amount that is still positive
                    use.value = -renewable_left; // the amount offseted
                    renewable_left = 0;
                }
            });
        }

        if (scenario.primary_energy_use_m2 > max) {
            max = scenario.primary_energy_use_m2;
        }

        // fuel_totals['generation'] is negative
        if (scenario.use_generation == 1 && scenario.fuel_totals['generation'].primaryenergy / scenario.TFA < min) {
            min = scenario.fuel_totals['generation'].primaryenergy / scenario.TFA;
        }
    }

    primaryEnergyUseData.bills = [
        {
            value: data.currentenergy.primaryenergy_annual_kwhm2,
            label: 'Non categorized'
        },
        {
            value: -data.currentenergy.generation.primaryenergy / data.TFA,
            label: 'Non categorized'
        }
    ];

    return [ primaryEnergyUseData, min, max ];
}

function prepare_data_for_graph(data_source) {
    var dataFig = [];

    // We first add master and bills because it looks better in the graph when they go first
    if (data_source.master != undefined) {
        dataFig.push({label: 'Your home now', value: data_source.master});
    }
    if (data_source.bills != undefined) {
        dataFig.push({label: 'Bills data', value: data_source.bills});
    }

    // Add rst of scenarios
    for (var scenario in data_source) {
        if (scenario != 'master' && scenario != 'bills') {
            dataFig.push({label: 'Scenario ' + scenario.split('scenario')[1], value: data_source[scenario]});
        }
    }

    return dataFig;
}

function add_peak_heating_load(root, scenario_list) {
    const context = scenario_list.map(scenario_id => {
        let scenario = project[scenario_id];
        if (scenario_id === 'master') {
            name = scenario.scenario_name;
        } else {
            const nums = /(\d+)/g;
            const num = parseInt(scenario_id.match(nums)[0], 10);
            name = `Scenario ${num}`;
        }

        const heatloss = scenario.fabric.total_heat_loss_WK;
        const temp = scenario.temperature.target;
        const temp_diff = temp - (-5);
        const peak_heat = heatloss * temp_diff;
        const area = scenario.TFA;
        const peak_heat_m2 = peak_heat / area;

        return {
            name,
            heatloss,
            temp,
            temp_diff,
            peak_heat: peak_heat / 1000, // in kW instead of W
            area,
            peak_heat_m2,
        };
    });

    const template = `
        <table class="simple-table">
            <tr>
                <th></th>
                {% for scenario in scenarios %}
                    <th style="white-space: nowrap;">{{ scenario.name }}</th>
                {% endfor %}
            </tr>
            <tr>
                <td>Heat loss per degree of heat difference</td>
                {% for scenario in scenarios %}
                    <td>{{ scenario.heatloss | round }} W/K</td>
                {% endfor %}
            </tr>
            <tr>
                <td></td>
                {% for scenario in scenarios %}
                    <td>×</td>
                {% endfor %}
            </tr>
            <tr>
                <td>
                    Maximum temperature difference expected between inside and outside<sup>*</sup>
                </td>
                {% for scenario in scenarios %}
                    <td>{{scenario.temp_diff}}°C <sup>†</sup></td>
                {% endfor %}
            </tr>
            <tr>
                <td></td>
                {% for scenario in scenarios %}
                    <td>=</td>
                {% endfor %}
            </tr>
            <tr>
                <td><b>Peak heating load</b></td>
                {% for scenario in scenarios %}
                    <td style="white-space: nowrap;"><b>{{ scenario.peak_heat | round(2) }} kW</b></td>
                {% endfor %}
            </tr>
            <tr>
                <td></td>
                {% for scenario in scenarios %}
                    <td>÷</td>
                {% endfor %}
            </tr>
            <tr>
                <td>Floor area</td>
                {% for scenario in scenarios %}
                    <td>{{ scenario.area | round }} m²</td>
                {% endfor %}
            </tr>
            <tr>
                <td></td>
                {% for scenario in scenarios %}
                    <td>=</td>
                {% endfor %}
            </tr>
            <tr>
                <td><b>Peaking heating load per square metre</b></td>
                {% for scenario in scenarios %}
                    <td style="white-space: nowrap;"><b>{{ scenario.peak_heat_m2 | round }} W/m²</b></td>
                {% endfor %}
            </tr>
        </table>
        <p style="margin-bottom: 0; font-size: 80%; line-height: 1.2">
            <sup>*</sup> Lowest external temperature assumed to be –5°C<br>
            <sup>†</sup> 1°C = 1K (Kelvin)
        </p>`;

    let env = new nunjucks.Environment();
    root.innerHTML = env.renderString(template, { scenarios: context } );
}



/**
 * Bar Chart Library
 */

/*
 * We expect data looking like this:
 * [
 *     { value: [ { value: X1 }, { value: X2 } ] },
 *     { value: [ { value: Y2 }, { value: Y2 } ] },
 * ]
 *
 * This function will take the sum of each row's values, and return the highest.
 */
function getGraphValuesMax(graphData) {
    const add = (prev, cur) => prev + cur;
    const by_row = graphData.map(row =>
        row.value.map(data => data.value).reduce(add)
    );
    return Math.max(...by_row);
}

/*
 * This function rounds val up to the nearest roundTo.
 * e.g. getGraphCeil(1000,    0,  100) = 1000
 *      getGraphCeil(1000, 1005,  100) = 1100
 *      getGraphCeil(1000, 1000,  100) = 1000
 */
function getGraphCeil({ min, max, incr }) {
    if (max <= min) {
        return min;
    }

    return Math.floor((max + (incr-1)) / incr) * incr;
}

function BarChart(options) {

    var self = this;
    options = options || {};

    self._data = options.data || null;
    self._defaultBarColor = options.defaultBarColor || 'rgb(245,30,30)';
    self._barColors = options.barColors || {};
    self._barWidth = options.barWidth || null;
    self._barGutter = options.barGutter || 0;
    self._barDivisionType = options.barDivisionType || 'stack';
    self._element = (options.elementId) ? this.element(options.elementId) : null;
    self._canvas = null;
    self._width = options.width || 600;
    self._chartHeight = options.chartHeight || 400;
    self._ranges = options.ranges || [];
    self._defaultRangeColor = options._defaultRangeColor || 'rgb(254,204,204)';
    self._targets = options.targets || [];
    self._defaultTargetColor = options._defaultTargetColor || 'rgb(236,102,79)';
    self._defaultVarianceColor = options.defaultVarianceColor || 'rgb(0,0,0)';
    self._font = options.font || 'Arial';
    self._fontSize = options.fontSize || 14;
    self._barLabelsColor = options.barLabelsColor || 'rgb(189,188,187)';
    self._chartLow = (options.chartLow !== undefined) ? options.chartLow : null;
    self._chartHigh = options.chartHigh || null;
    self._division = options.division || 100;
    self._divisionColor = options.divisionColor || 'rgb(180,180,180)';
    self._divisionLabelsColor = options.divisionLabelsColor || 'rgb(104,103,103)';
    self._yAxisLabel = options.yAxisLabel || 50;
    self._yAxisLabelBackgroundColor = options.yAxisLabelBackgroundColor || 'rgb(236,236,236)';
    self._yAxisLabelColor = options.yAxisLabelColor || 'rgb(191,190,190)';
    self._yAxisTextAlign = options.yAxisTextAlign || 'center';
    self._chartTitle = options.chartTitle || null;
    self._chartTitleTextAlign = options.chartTitleTextAlign || 'left';
    self._chartTitleColor = options.chartTitleColor || 'rgb(195,194,194)';
    self._backgroundColor = options.backgroundColor || 'rgb(255,255,255)';

    /**
     * Sets canvas to `cvs` if provided, or resturns the canvas element
     */
    self.canvas = function(cvs) {
        if (!cvs && !self._canvas) {
            cvs = document.createElement('canvas');
            cvs.width = self._width;
            cvs.height = self._height;
            cvs.style.maxWidth = '100%';
            var ctx = cvs.getContext('2d');
            ctx.fillStyle = self._backgroundColor;
            ctx.fillRect(0, 0, self._width, self._height);
        }

        if (cvs) {
            self._canvas = cvs;
        }

        return self._canvas;
    };


    self.context = function() {
        return self.canvas().getContext('2d');
    };


    self.element = function(element) {
        if (element) {
            self._element = element;
        }

        return self._element;
    };

    self.draw = function(element) {
        if (element) {
            self.element(element);
        }

        if (!self.element()) {
            console.error(`Couldn't draw graph onto ${elementId}`);
            return;
        }

        // draw chart elements

        if (self._chartTitle) {
            self.drawChartTitle();
        }

        if (self._ranges && self._ranges.length) {
            for (var i = 0, len = self._ranges.length; i < len; i ++) {
                self.drawRange(self._ranges[i].low, self._ranges[i].high, self._ranges[i].label, self._ranges[i].color);
            }
        }

        self.drawScale();
        self.drawYAxisLabel();
        self.drawBars();
        self.drawBarLabels();

        // Targets should be above bars, so draw them after drawing the bars.

        if (self._targets && self._targets.length) {
            for (var i = 0, len = self._targets.length; i < len; i ++) {
                self.drawTarget(self._targets[i].target, self._targets[i].label, self._targets[i].color);
            }
        }

        if (self.objectLength(self._barColors)) {
            self.drawKey(self._barColors);
        }

        // append canvas to element
        self.element().appendChild(self.canvas());
    };


    self.drawChartTitle = function() {
        if (!self._chartTitle) {
            return false;
        }

        var ctx = self.context();
        ctx.fillStyle = self._chartTitleColor;
        ctx.font = self.font();
        ctx.textAlign = self._chartTitleTextAlign;

        if (self._chartTitleTextAlign === 'left') {
            ctx.fillText(self._chartTitle, 0, self._fontSize * 2);
        } else if (self._chartTitleTextAlign === 'center') {
            ctx.fillText(self._chartTitle, self._width / 2, self._fontSize * 2);
        } else if (self._chartTitleTextAlign === 'right') {
            ctx.fillText(self._chartTitle, self._width, self._fontSize * 2);
        }
    };


    self.drawYAxisLabel = function() {
        var ctx = self.context();
        ctx.font = self.font();
        ctx.save();
        ctx.translate(self.getYAxisLabelWidth() / 2, (self.getChartHeight() / 2) + self.getChartTitleHeight());
        ctx.rotate(-Math.PI/2);
        ctx.fillStyle = self._yAxisLabelBackgroundColor;
        ctx.fillRect((self.getChartHeight() / 2) * -1, (self.getYAxisLabelWidth() / 2) * -1, self.getChartHeight(), self._fontSize * 3);
        ctx.textAlign = self._yAxisTextAlign;
        ctx.fillStyle = self._yAxisLabelColor;
        ctx.fillText(self._yAxisLabel, 0, 0);
        ctx.restore();
    };


    self.drawScale = function() {

        if (self._division === 'auto') {
            var x = Math.floor(self.chartHigh() / 10);
            var every = Math.round(x / 15) * 10;
        } else {
            var every = self._division;
        }

        var low = Math.ceil(self.chartLow() / every) * every;
        var high = self.chartHigh();

        var ctx = self.context();
        ctx.strokeStyle = self._divisionColor;
        ctx.lineWidth = 1;
        ctx.font = self.font();
        ctx.textAlign = 'right';
        ctx.fillStyle = self._divisionLabelsColor;

        for (var i = low; i <= high; i += every) {
            const x = self.horizontalPixelPosition(0);
            const y = self.verticalPixelPosition(i);

            ctx.beginPath();
            ctx.moveTo(x, y - 0.5);
            ctx.lineTo(self.getChartRightPos(), y - 0.5);
            ctx.stroke();
            ctx.closePath();
            ctx.fillText(i, x - (self._fontSize / 2), y + (self._fontSize / 4));
        }
    };


    self.drawBars = function() {
        var ctx = self.context();
        var data = self._data;
        var barGutter = self._barGutter;
        var barWidth = self._barWidth;
        var barColor;

        for (var i = 0, len = data.length; i < len; i ++) {
            if (isNaN(data[i].value)) {
                if (self._barDivisionType === 'group') {
                    var rawHorizontalPosition = i * (barWidth + barGutter) + barGutter;

                    for (var i2 = 0, len2 = data[i].value.length; i2 < len2; i2 ++) {
                        barColor = self._defaultBarColor;

                        if (self.getLabelColor(data[i].value[i2].label)) {
                            barColor = self.getLabelColor(data[i].value[i2].label);
                        } else if (self.getLabelColor(data[i].label)) {
                            barColor = self.getLabelColor(data[i].label);
                        }

                        ctx.fillStyle = barColor;
                        ctx.fillRect(
                            self.horizontalPixelPosition(rawHorizontalPosition),
                            self.verticalPixelPosition(0),
                            barWidth / data[i].value.length,
                            self.valueToPixels(data[i].value[i2].value) * -1
                        );

                        if (data[i].value[i2].variance !== undefined) {
                            self.drawErrorBars(rawHorizontalPosition,data[i].value[i2].value,data[i].value[i2].variance,data[i].value.length);
                        }

                        rawHorizontalPosition += barWidth / data[i].value.length;
                    }
                } else {
                    var verticalPos = self.verticalPixelPosition(self.barLow(data[i]));
                    var orderedData = [];


                    for (var i2 = 0, len2 = data[i].value.length; i2 < len2; i2 ++) {
                        if (data[i].value[i2].value < 0) {
                            orderedData.push({
                                value: data[i].value[i2].value * -1,
                                label: data[i].value[i2].label
                            });
                        }
                    }

                    for (var i2 = 0, len2 = data[i].value.length; i2 < len2; i2 ++) {
                        if (data[i].value[i2].value > 0) {
                            orderedData.push(data[i].value[i2]);
                        }
                    }

                    for (var i2 = 0, len2 = orderedData.length; i2 < len2; i2 ++) {
                        barColor = self._defaultBarColor;

                        if (self.getLabelColor(orderedData[i2].label)) {
                            barColor = self.getLabelColor(orderedData[i2].label);
                        } else if (self.getLabelColor(data[i].label)) {
                            barColor = self.getLabelColor(data[i].label);
                        }

                        ctx.fillStyle = barColor;
                        ctx.fillRect(
                            self.horizontalPixelPosition(i * (barWidth + barGutter) + barGutter),
                            verticalPos,
                            barWidth,
                            self.valueToPixels(orderedData[i2].value) * -1
                        );

                        verticalPos -= self.valueToPixels(orderedData[i2].value);

                    }
                }
            } else {
                barColor = self._defaultBarColor;

                if (self.getLabelColor(data[i].label)) {
                    barColor = self.getLabelColor(data[i].label);
                }


                ctx.fillStyle = barColor;
                ctx.fillRect(
                    self.horizontalPixelPosition(i * (barWidth + barGutter) + barGutter),
                    self.verticalPixelPosition(0),
                    barWidth,
                    self.valueToPixels(data[i].value) * -1
                );

                if (data[i].variance !== undefined) {
                    self.drawErrorBars((i * (barWidth + barGutter) + barGutter),(data[i].value),data[i].variance);
                }
            }
        }
    };

    self.drawErrorBars = function(xPos,yPos,variance,barCount) {
        if (barCount !== undefined) {
            barCount = 1;
        }
        var ctx = self.context();
        var barWidth = self._barWidth / barCount;
        var barHeight = yPos;
        var errorVariance = (variance / 100) * barHeight;

        ctx.strokeStyle = self._defaultVarianceColor;
        ctx.lineWidth = 2;

        if ( yPos !== 0 ) {
            ctx.beginPath();
            // Vertical Line
            ctx.moveTo(self.horizontalPixelPosition(xPos + (barWidth / 2)), self.verticalPixelPosition((yPos) - errorVariance));
            ctx.lineTo(self.horizontalPixelPosition(xPos + (barWidth / 2)), self.verticalPixelPosition((yPos) + errorVariance));
            // Top Horizontal Line
            ctx.moveTo(self.horizontalPixelPosition(xPos + (barWidth * .65)),self.verticalPixelPosition((yPos) + errorVariance));
            ctx.lineTo(self.horizontalPixelPosition(xPos + (barWidth * .35)),self.verticalPixelPosition((yPos) + errorVariance));
            // Bottom Horizontal Line
            ctx.moveTo(self.horizontalPixelPosition(xPos + (barWidth * .65)),self.verticalPixelPosition((yPos) - errorVariance));
            ctx.lineTo(self.horizontalPixelPosition(xPos + (barWidth * .35)),self.verticalPixelPosition((yPos) - errorVariance));
            ctx.stroke();
            ctx.closePath();
        }

    };

    self.drawBarLabels = function() {
        var ctx = self.context();
        var barGutter = self._barGutter;
        var barWidth = self._barWidth;
        var data = self._data;
        var fontSize = self.getXAxisLabelFontSize();

        ctx.fillStyle = self._barLabelsColor;

        for (var i = 0, len = data.length; i < len; i ++) {
            ctx.save();
            ctx.translate(self.horizontalPixelPosition(i * (barWidth + barGutter) + barGutter + (barWidth / 2) + (fontSize / 4)), self.getChartHeight() + (fontSize * 2)  + self.getChartTitleHeight());
            ctx.rotate(-Math.PI/2);
            ctx.textAlign = 'right';
            ctx.fillText(data[i].label, 0, 0);
            ctx.restore();
        }
    };


    self.drawKey = function(keyData) {
        var ctx = self.context();
        var fontSize = self._fontSize;
        var maxCols = self.getKeyColumns(keyData);
        var yPos = self._height - self.getKeyHeight(keyData);
        var xPos;
        var col = 0;

        ctx.textAlign = 'left';
        ctx.font = fontSize + 'px ' + self._font;

        // draw line
        yPos += self._fontSize * 4;
        ctx.beginPath();
        ctx.moveTo(0, yPos - 0.5);
        ctx.lineTo(self._width, yPos - 0.5);
        ctx.strokeStyle = 'rgb(227,19,46)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3]);
        ctx.stroke();
        ctx.closePath();

        // draw key title
        yPos += self._fontSize * 1.6;
        ctx.fillStyle = 'rgb(112,111,112)';
        ctx.fillText('Key', 0, yPos);

        // draw key items
        yPos += self._fontSize * 1.6;

        for (var label in keyData) {
            if (keyData.hasOwnProperty(label)) {
                xPos = Math.round(col * (self._width / maxCols));
                ctx.fillStyle = keyData[label];
                ctx.fillRect(xPos, yPos, fontSize, fontSize);
                ctx.fillStyle = 'rgb(178,177,176)';
                ctx.fillText(label, xPos + 45, yPos + (fontSize * 0.9));

                col ++;

                if (col >= maxCols) {
                    col = 0;
                    yPos += fontSize * 1.6;
                }
            }
        }
    };


    self.drawRange = function(low, high, label, color) {
        var ctx = self.context();
        ctx.fillStyle = color || self._defaultRangeColor;
        ctx.fillRect(
            self.horizontalPixelPosition(0),
            self.verticalPixelPosition(low),
            self._width,
            self.valueToPixels(low - high)
        );

        if (label !== undefined) {
            ctx.font = self.font();
            ctx.textAlign = 'right';
            ctx.fillStyle = color || self._defaultRangeColor;
            ctx.fillText(label, self.getChartRightPos(), self.verticalPixelPosition(high) - (self._fontSize * 0.5));
        }
    };

    self.drawTarget = function(target, label, color) {
        var ctx = self.context();
        ctx.strokeStyle = color || self._defaultTargetColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([3]);
        ctx.beginPath();
        ctx.moveTo(self.horizontalPixelPosition(0), self.verticalPixelPosition(target) - 0.5);
        ctx.lineTo(self.getChartRightPos(), self.verticalPixelPosition(target) - 0.5);
        ctx.stroke();
        ctx.closePath();
        ctx.setLineDash([1]);

        if (label !== undefined) {
            ctx.font = self.font();
            ctx.textAlign = 'right';
            ctx.fillStyle = color || self._defaultTargetColor;
            ctx.fillText(label, self.getChartRightPos(), self.verticalPixelPosition(target) - (self._fontSize * 0.5));
        }
    };

    self.chartLow = function() {
        if (self._chartLow === null) {
            var values = [];

            for (var i = 0, len = self._data.length; i < len; i ++) {
                values.push(self.barLow(self._data[i]));
            }

            self._chartLow = Math.min.apply(Math, values);
            self._chartLow = (self._chartLow < 0) ? self._chartLow : 0;
        }

        return self._chartLow;
    };


    self.chartHigh = function() {
        if (!self._chartHigh) {
            var values = [];

            for (var i = 0, len = self._data.length; i < len; i ++) {
                // if (self._data[i].variance !== undefined) {

                //  var errorVariance = (self._data[i].variance / 100) * self._data[i].value;
                //  self._data[i].value = self._data[i].value + errorVariance;

                //  values.push(self.barTotal(self._data[i]));

                // } else {
                values.push(self.barTotal(self._data[i]));
                // }
            }

            var maxValue = Math.max.apply(Math, values);
            self._chartHigh = maxValue + (~~(maxValue / 10));

        }

        return self._chartHigh;
    };


    /**
     * For stacked bars, returns the sum of all negative values,
     * otherwise returns zero.
     */
    self.barLow = function(bar) {
        if (!isNaN(bar.value)) {
            return bar.value;
        }

        var barLow = 0;

        for (var i = 0, len = bar.value.length; i < len; i ++) {
            if (bar.value[i].value < 0) {
                barLow += bar.value[i].value;
            }
        }

        return barLow;
    };


    /**
     * Returns the total value of the bar if positive, or zero
     */
    self.barHigh = function(bar) {
        return (self.barTotal(bar) > 0) ? self.barTotal(bar) : 0;
    };


    /**
     * Returns the sum of values in a bar
     */
    self.barTotal = function(bar) {
        if (!isNaN(bar.value)) {
            return bar.value;
        }

        var barTotal = 0;

        for (var i = 0, len = bar.value.length; i < len; i ++) {
            barTotal += bar.value[i].value;
        }

        return barTotal;
    };


    self.valueToPixels = function(value) {
        var chartRange = self.chartHigh() - self.chartLow();
        var valueAsPercentage = value / chartRange;
        var pixels = (self.getChartHeight() * valueAsPercentage);
        return Math.round(pixels);
    };


    self.verticalPixelOffset = function() {
        var offset = self.chartLow() * -1;
        var chartRange = self.chartHigh() - self.chartLow();
        var offsetAsPercentage = offset / chartRange;
        var pixelOffset = (self.getChartHeight() * offsetAsPercentage);
        return pixelOffset;
    };


    self.verticalPixelPosition = function(value) {
        return self.getChartBottomPos() - self.verticalPixelOffset() - self.valueToPixels(value);
    };


    self.getChartBottomPos = function() {
        return self._height - self.getBarLabelsHeight() - self.getKeyHeight(self._barColors);
    };


    self.getChartHeight = function() {
        return self.getChartBottomPos() - self.getChartTitleHeight();
    };


    self.getChartTitleHeight = function() {
        return (self._chartTitle) ? self._fontSize * 8 : self._fontSize * 0.5;
    };


    self.horizontalPixelPosition = function(chartPos) {
        return self.getChartLeftPos() + chartPos;
    };


    self.getChartWidth = function() {
        return self._width - self.getChartLeftPos();
    };


    self.getChartRightPos = function() {
        return self._width;
    };


    self.getChartLeftPos = function() {
        return self.getYAxisLabelWidth() + self.getYAxisScaleWidth();
    };


    self.getYAxisLabelWidth = function() {
        if (self._yAxisLabel) {
            return self._fontSize * 3.5;
        }

        return 0;
    };


    self.getYAxisScaleWidth = function() {
        if (self._division === 'auto') {
            var every = Math.floor(self.chartHigh() / 10);
        } else {
            var every = self._division;
        }

        var low = Math.ceil(self.chartLow() / every) * every;
        var high = self.chartHigh();
        var textArray = [];

        for (var i = low; i <= high; i += every) {
            textArray.push(i);
        }

        return self.widestText(textArray, self.font()) + (self._fontSize / 2);
    };


    self.getBarLabelsHeight = function() {
        var data = self._data;
        var fontSize = self.getXAxisLabelFontSize();
        var textArray = [];

        for (var i = 0, len = data.length; i < len; i ++) {
            textArray.push(data[i].label);
        }

        return self.widestText(textArray, self.font()) + (fontSize * 2);
    };

    self.getKeyHeight = function(keyData) {
        return (self.getKeyRows(keyData)) ? (self.getKeyRows(keyData) * self._fontSize * 1.6) + (self._fontSize * 7.2) : 0;
    };


    self.getKeyColumns = function(keyData) {
        var colWidth = self.widestText(self.getKeyTextAsArray(keyData), self.font()) + (self._fontSize * 2) + 45;
        return Math.floor(self._width / colWidth);
    };


    self.getKeyRows = function(keyData) {
        return Math.ceil(self.getKeyTextAsArray(keyData).length / self.getKeyColumns(keyData));
    };


    self.getKeyTextAsArray = function(keyData) {
        var textArray = [];

        for (var label in keyData) {
            if (keyData.hasOwnProperty(label)) {
                textArray.push(label);
            }
        }

        return textArray;
    };


    self.getXAxisLabelFontSize = function() {
        return self._fontSize;
    };


    let widestCache = {};

    self.widestText = function(textArray, font) {
        // This was a significant performance bottleneck.
        let cacheKey = JSON.stringify({ 'textArray': textArray, 'font': font });
        if (widestCache[cacheKey]) {
            return widestCache[cacheKey];
        }

        var cvs = document.createElement('canvas');
        cvs.width = 2000;
        cvs.height = 2000;
        var ctx = cvs.getContext('2d');
        ctx.font = font;

        let widths = textArray.map(str => ctx.measureText(str).width);
        let max = Math.max(...widths);

        widestCache[cacheKey] = max;
        return max;
    };


    self.font = function() {
        return self._fontSize + 'px ' + self._font;
    };


    self.getLabelColor = function(label) {
        return (self._barColors[label]) ? self._barColors[label] : null;
    };


    self.setHeight = function() {
        self._height = self._chartHeight + self.getChartTitleHeight() + self.getBarLabelsHeight() + self.getKeyHeight(self._barColors);
    };


    self.objectLength = function(obj) {
        var count = 0;

        for (var i in obj) {
            if (obj.hasOwnProperty(i)) {
                count ++;
            }
        }

        return count;
    };


    self.setHeight();

    if (!self._barWidth) {
        self._barWidth = ((self.getChartWidth() - self._barGutter) / self._data.length) - self._barGutter;
    }


    return self;
};
