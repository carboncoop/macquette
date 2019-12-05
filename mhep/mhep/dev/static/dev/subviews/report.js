console.log('debug report.js');

function report_initUI() {
    data = project['master'];

    // Initialize choices scenario check boxes
    $('#scenario-choices-boxes').append('<li><input type="checkbox" checked disabled value="master" />Master</li>');
    for (var scenario in project) {
        var checked = '';
        if (scenario != "master") {
            if (scenario == 'scenario1' || scenario == 'scenario2' || scenario == 'scenario3')
                checked = 'checked';
            $('#scenario-choices-boxes').append('<li><input type="checkbox" ' + checked + ' value="' + scenario + '" /> Scenario' + scenario.split('scenario')[1] + ': ' + project[scenario].scenario_name + '</li>');
        }
    }

    if (view_html['compare'] == undefined) {
        $.ajax({
            url: urlHelper.static('subviews/compare.js'),
            async: false,
            cache: false,
            error: handleServerError('loading subview compare.js'),
        });
    }

    // Add static content
    add_events();
    add_prioirities_figure();
    add_featured_image();
    add_date();
    add_commentary();

    // Add scenarios content
    report_UpdateUI();
}

function report_UpdateUI() {
    let scenarios = [];
    $('#scenario-choices-boxes input:checked').each(function () {
        scenarios.push(this.value);
    });

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

    add_scenario_names(scenarios);
    add_performance_summary_figure(scenarios);
    add_heat_loss_summary_figure(scenarios);
    add_heat_balance_figure(scenarios);
    add_space_heating_demand_figure(scenarios);
    add_energy_demand_figure(scenarios);
    add_primary_energy_usage_figure(scenarios);
    add_carbon_dioxide_per_m2_figure(scenarios);
    add_carbon_dioxide_per_person_figure(scenarios);
    add_energy_costs_figure(scenarios);
    add_comfort_tables(scenarios);
    add_health_data(scenarios);
    add_measures_summary_tables(scenarios, scenarios_measures_summary);
    add_measures_complete_tables(scenarios, scenarios_measures_complete);
    add_comparison_tables(scenarios, scenarios_comparison);
}

function add_events() {
    window.onbeforeprint = function () {
        hide_sidebar();
    };
    $('body').on('click', '#reload', function () {
        report_UpdateUI();
    });
}
function add_featured_image() {
    if (data.featuredimage) {
        $(".js-home-image-wrapper").html('');
        var img = $('<img class="home-image">').attr("src", path + "Modules/assessment/images/" + projectid + "/" + data.featuredimage)
        img.appendTo(".js-home-image-wrapper");
    }
}
function add_date() {
    var date = new Date();
    var months_numbers = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    $('#report_date').html(date.getDate() + '-' + months_numbers[date.getMonth()] + '-' + date.getFullYear());
}
function add_prioirities_figure() {
    //  Shows retrofit priorities - in order - identifying whether interested in retrofit for cost, comfort or carbon reasons etc.

    var priorities = {};
    var household = project["master"].household;
    var prioritiesPossibilities = [
        "7b_carbon",
        "7b_money",
        "7b_comfort",
        "7b_airquality",
        "7b_modernisation",
        "7b_health",
    ]
    if (household != undefined) {
        if (typeof household['7b_carbon'] != "undefined") {
            priorities.carbon = {
                title: "Save carbon",
                order: household['7b_carbon']
            }
        }

        if (typeof household['7b_money'] != "undefined") {
            priorities.money = {
                title: "Save money",
                order: household['7b_money'],
            }
        }

        if (typeof household['7b_comfort'] != "undefined") {
            priorities.comfort = {
                title: "Improve comfort",
                order: household['7b_comfort'],
            }
        }

        if (typeof household['7b_airquality'] != "undefined") {
            priorities.airquality = {
                title: "Improve indoor air quality",
                order: household['7b_airquality']
            }
        }

        if (typeof household['7b_modernisation'] != "undefined") {
            priorities.modernisation = {
                title: "General modernisation",
                order: household['7b_modernisation'],
            }
        }

        if (typeof household['7b_health'] != "undefined") {
            priorities.health = {
                title: "Improve health",
                order: household['7b_health'],
            }
        }

        var sortedPriorities = [];
        for (var priority in priorities) {
            sortedPriorities.push([priority, priorities[priority]['order'], priorities[priority]['title']])
        }
        sortedPriorities.sort(function (a, b) {
            return parseInt(a[1]) - parseInt(b[1])
        })

        $("#retrofit-priorities").html('');
        for (var priority_order = 1; priority_order <= 3; priority_order++) {
            for (var i = 0; i < sortedPriorities.length; i++) {
                if (sortedPriorities[i][1] == priority_order)
                    $("#retrofit-priorities").append("<li>" + sortedPriorities[i][1] + ". " + sortedPriorities[i][2] + "</li>");
            }
        }
    }
}
function add_scenario_names(scenarios) {
    $('.scenarios-list').html('');
    scenarios.forEach(function (scenario) {
        if (scenario != 'master')
            $('.scenarios-list').append('<li><p>Scenario ' + scenario.split('scenario')[1] + ': ' + project[scenario].scenario_name + '</p></li>');
    });
}
function add_performance_summary_figure(scenarios) {
    // Quick overview/summary - Benchmarking Bar Charts. Need to ensure that all scenarios displayed, not just one as on current graph.
    // Space Heating Demand (kWh/m2.a)
    // Primary Energy Demand (kWh/m2.a)
    // CO2 emission rate (kgCO2/m2.a)
    // CO2 emission rate - per person (kgCO2/m2.a)

    var values = [];
    for (var i = 0; i < scenarios.length; i++) {
        if (typeof project[scenarios[i]] != "undefined" && project[scenarios[i]].space_heating_demand_m2 != "undefined") {
            values[i] = Math.round(project[scenarios[i]].space_heating_demand_m2);
        }
        else {
            values[i] = 0;
        }
    }

    colors = [
        "rgb(236, 157, 163)",
        "rgb(164, 211, 226)",
        "rgb(184, 237, 234)",
        "rgb(251, 212, 139)",
        "rgb(236, 157, 100)",
        "rgb(164, 211, 100)",
        "rgb(184, 237, 100)",
        "rgb(251, 212, 100)",
        "rgb(236, 157, 0)",
        "rgb(164, 211, 0)",
        "rgb(184, 237, 0)",
        "rgb(251, 212, 0)"
    ];

    var options = {
        name: "Space heating demand",
        font: "Karla",
        colors: colors,
        value: Math.round(data.space_heating_demand_m2),
        values: values,
        units: "kWh/m" + String.fromCharCode(178) + ".a", //String.fromCharCode(178) = 2 superscript
        targets: {
            "Min Target": datasets.target_values.space_heating_demand_lower,
            "Max Target": datasets.target_values.space_heating_demand_upper,
            "UK average": datasets.uk_average_values.space_heating_demand
        },
        targetRange: [datasets.target_values.space_heating_demand_lower, datasets.target_values.space_heating_demand_upper]
    };
    targetbarCarboncoop("space-heating-demand", options);
    // ---------------------------------------------------------------------------------
    var values = [];
    for (var i = 0; i < scenarios.length; i++) {
        if (typeof project[scenarios[i]] != "undefined" && project[scenarios[i]].primary_energy_use_m2 != "undefined") {
            values[i] = Math.round(project[scenarios[i]].primary_energy_use_m2);
        }
        else {
            values[i] = 0;
        }
    }

    var options = {
        name: "Primary energy demand",
        value: Math.round(data.primary_energy_use_m2),
        colors: colors,
        values: values,
        units: "kWh/m" + String.fromCharCode(178) + ".a", //String.fromCharCode(178) = 2 superscript
        targets: {
            // "Passivhaus": 120,
            "Carbon Coop 2050 target (inc. renewables)": datasets.target_values.primary_energy_demand,
            "UK Average": datasets.uk_average_values.primary_energy_demand
        }
    };
    targetbarCarboncoop("primary-energy", options);
    // ---------------------------------------------------------------------------------

    var values = [];
    for (var i = 0; i < scenarios.length; i++) {
        if (typeof project[scenarios[i]] != "undefined" && project[scenarios[i]].kgco2perm2 != "undefined") {
            values[i] = Math.round(project[scenarios[i]].kgco2perm2);
        }
        else {
            values[i] = 0;
        }
    }

    var options = {
        name: "CO<sub>2</sub> Emission rate <i class='icon-question-sign' title='Carbon emissions and number of homes: DECC (2014) \"United Kindgdom Housing Energy Fact File: 2013\", 28 January 2014, accessed at http://www.gov.uk/government/statistics/united-kingdom-housing-energy-fact-file-2013\n\n"
                + "Average Floor Area: National Statistics, (2016), \"English Housing Survey 2014 to 2015: Headline Report\", 18 Feb 2016, accessed at http://www.gov.uk/government/statistics/english-housing-survey-2014-to-2015-headline-report \n\n"
                + "CO<sub>2</sub> emissions factors are 15 year ones, based on figures published by BRE at http://www.bre.co.uk/filelibrary/SAP/2012/Emission-and-primary-factors-2013-2027.pdf' />",
        value: Math.round(data.kgco2perm2),
        colors: colors,
        values: values,
        units: "kgCO" + String.fromCharCode(8322) + "/m" + String.fromCharCode(178) + ".a", //String.fromCharCode(178) = 2 superscript
        targets: {
            "Carbon Coop 2050 target": datasets.target_values.co2_emission_rate,
            "UK Average": datasets.uk_average_values.co2_emission_rate,
        }
    };
    targetbarCarboncoop("co2-emission-rate", options);


    // ---------------------------------------------------------------------------------

    //    var values = [];
    // for (var i = 0 ; i < scenarios.length ; i++){
    // 	if (typeof project[scenarios[i]] != "undefined" && project[scenarios[i]].kwhdpp != "undefined"){
    // 		values[i] =  Math.round(project[scenarios[i]].kwhdpp.toFixed(1));
    // 	} else {
    // 		values[i] = 0;
    // 	}
    // }

    // var options = {
    //     name: "Per person energy use",
    //     value: data.kwhdpp.toFixed(1),
    //     colors: colors,
    //     values: values,
    //     units: "kWh/day",
    //     targets: {
    //         "70% heating saving": 8.6,
    //         "UK Average": 19.6
    //     }
    // };
    // targetbarCarboncoop("energy-use-per-person", options);

    $('#performace-summary-key ul').html('');
    for (var i = 0; i < scenarios.length; i++) {
        if (scenarios[i] == 'master')
            $('#performace-summary-key ul').append('<li style="display: inline-block"><div style="width:15px; height:15px;background-color:' + colors[i] + '; display:inline-block; margin - right: 55px"></div> Your home now</li>');
        else
            $('#performace-summary-key ul').append('<li style="display: inline-block"><div style="width:15px; height:15px;background-color:' + colors[i] + '; display:inline-block; margin - right: 55px"></div> Scenario ' + scenarios[i].split('scenario')[1] + ': ' + project[scenarios[i]].scenario_name + '</li>');
    }
}
function add_heat_loss_summary_figure(scenarios) {
    $('.js-house-heatloss-diagrams-wrapper').html("<ul class='js-house-heatloss-diagram-picker house-heatloss-diagram-picker'></ul>");
    // Add list to choose which scenario to show
    scenarios.forEach(function (scenario) {
        if (scenario == 'master') {
            var selected = "selected";
            var name = "Your home now";
        }
        else {
            var selected = "";
            var name = "Scenario " + scenario.split('scenario')[1];
        }
        $('.house-heatloss-diagram-picker').append('<li class="' + selected + '" data-scenario="' + scenario + '">' + name + '</li>');
    });

    // Add the diagrams
    scenarios.forEach(function (scenario) {
        var house_markup = generateHouseMarkup(heatlossData(scenario));
        var html = '<div class="bar-chart-container centered-house no-break" id="house-heatloss-diagram-' + scenario + '" data-scenario-diagram="' + scenario + '" style="display:none">';
        if (scenario == 'master')
            html += '<p>Your home now</p>';
        else
            html += '<p>Scenario ' + scenario.split('scenario')[1] + '</p>';
        html += '<div class="js-svg">' + house_markup + '</div>';
        html += '</div>';
        $('.js-house-heatloss-diagrams-wrapper').append(html);
    });

    // Events
    $("body").on("click", ".js-house-heatloss-diagram-picker li", function (e) {
        var scenario = $(this).data("scenario");
        $(".js-house-heatloss-diagram-picker li").removeClass("selected");
        $(this).addClass("selected");
        $(".js-house-heatloss-diagrams-wrapper .centered-house").css({
            "display": "none"
        });
        $("div[data-scenario-diagram='" + scenario + "']").css("display", "block");
    });

    // Show the diagram for the master scenario
    $('.js-house-heatloss-diagram-picker [data-scenario=master]').click();

}
function add_heat_balance_figure(scenarios) {
    // Heat transfer per year by element. The gains and losses here need to balance.
    var dataFig4 = [];
    var max_value = 250; // used to set the height of the chart

    scenarios.forEach(function (scenario) {
        if (scenario == 'master')
            var label = "Your home now";
        else
            var label = "Scenario " + scenario.split('scenario')[1];
        if (typeof project[scenario] != "undefined" && typeof project[scenario].annual_useful_gains_kWh_m2 != "undefined") {
            dataFig4.push({
                label: label,
                value: [
                    {value: project[scenario].annual_useful_gains_kWh_m2["Internal"], label: 'Internal Gains'},
                    {value: project[scenario].annual_useful_gains_kWh_m2["Solar"], label: 'Solar Gains'},
                    {value: project[scenario].space_heating.annual_heating_demand_m2, label: 'Space Heating Requirement'},
                    {value: -project[scenario].annual_losses_kWh_m2["fabric"], label: 'Fabric Losses'},
                    {value: -(project[scenario].annual_losses_kWh_m2["ventilation"] + project[scenario].annual_losses_kWh_m2["infiltration"]), label: 'Ventilation and Infiltration Losses'},
                ]
            });
            if (max_value < (project[scenario].annual_losses_kWh_m2["fabric"] + project[scenario].annual_losses_kWh_m2["ventilation"] + project[scenario].annual_losses_kWh_m2["infiltration"]))
                max_value = 50 + project[scenario].annual_losses_kWh_m2["fabric"] + project[scenario].annual_losses_kWh_m2["ventilation"] + project[scenario].annual_losses_kWh_m2["infiltration"];
        }
    });

    var HeatBalance = new BarChart({
        chartTitle: 'Heat Balance',
        chartTitleColor: 'rgb(87, 77, 86)',
        yAxisLabelColor: 'rgb(87, 77, 86)',
        barLabelsColor: 'rgb(87, 77, 86)',
        yAxisLabel: "kWh/m" + String.fromCharCode(178) + ".year",
        fontSize: 33,
        width: 1200.35,
        chartHeight: 600,
        division: 50,
        barWidth: 440 / dataFig4.length,
        barGutter: 480 / dataFig4.length,
        chartHigh: max_value,
        chartLow: -max_value,
        font: "Karla",
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
    $('#heat-balance').html('');
    HeatBalance.draw('heat-balance');
}
function add_space_heating_demand_figure(scenarios) {
    var dataFig = [];
    var max_value = 250; // used to set the height of the chart
    var label = '';
    var value = 0;
    for (var i = 0; i < scenarios.length; i++) {
        if (typeof project[scenarios[i]] != "undefined" && project[scenarios[i]].space_heating_demand_m2 != "undefined") {
            value = Math.round(project[scenarios[i]].space_heating_demand_m2);
            if (scenarios[i] == 'master')
                label = 'Your home now';
            else
                label = "Scenario " + scenarios[i].split('scenario')[1];
            dataFig.push({label: label, value: value});
            if (max_value < value)
                max_value = value + 50;
        }
        else {
            dataFig.push({label: label, value: 0});
        }
    }

    var SpaceHeatingDemand = new BarChart({
        chartTitleColor: 'rgb(87, 77, 86)',
        yAxisLabelColor: 'rgb(87, 77, 86)',
        barLabelsColor: 'rgb(87, 77, 86)',
        yAxisLabel: 'kWh/m' + String.fromCharCode(178) + '.year',
        fontSize: 33,
        font: "Karla",
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
    $('#fig-5-space-heating-demand').html('');
    SpaceHeatingDemand.draw('fig-5-space-heating-demand');
}
function add_energy_demand_figure(scenarios) {
    max_value = 40000;
    var energyDemandData = getEnergyDemandData(scenarios);
    var dataFig = prepare_data_for_graph(energyDemandData);
    var EnergyDemand = new BarChart({
        chartTitleColor: 'rgb(87, 77, 86)',
        yAxisLabelColor: 'rgb(87, 77, 86)', barLabelsColor: 'rgb(87, 77, 86)',
        yAxisLabel: 'kWh/year',
        fontSize: 33,
        font: "Karla",
        width: 1200,
        chartHeight: 600,
        division: 5000,
        chartHigh: max_value,
        barWidth: 550 / dataFig.length,
        barGutter: 400 / dataFig.length,
        defaultBarColor: 'rgb(231,37,57)', defaultVarianceColor: 'rgb(2,37,57)',
        barColors: {
            'Gas': 'rgb(236,102,79)',
            'Electric': 'rgb(240,212,156)',
            'Other': 'rgb(24,86,62)',
        }, data: dataFig
    });
    $('#energy-demand').html('');
    EnergyDemand.draw('energy-demand');
}
function add_primary_energy_usage_figure(scenarios) {
    var primaryEnergyUseData = getPrimaryEnergyUseData(scenarios);
    var max = primaryEnergyUseData.max;
    var min = primaryEnergyUseData.min - 50;
    delete primaryEnergyUseData.max;
    delete primaryEnergyUseData.min;
    var dataGraph = prepare_data_for_graph(primaryEnergyUseData);
    var primaryEneryUse = new BarChart({
        chartTitleColor: 'rgb(87, 77, 86)',
        yAxisLabelColor: 'rgb(87, 77, 86)',
        barLabelsColor: 'rgb(87, 77, 86)',
        yAxisLabel: 'kWh/m' + String.fromCharCode(178) + '.year',
        fontSize: 33,
        font: "Karla",
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
            'Lighting': 'rgb(236,102,79)', 'Fans and Pumps': 'rgb(246, 167, 7)', 'Non categorized': 'rgb(131, 51, 47)',
            // 'Generation': 'rgb(200,213,203)'
        },
        data: dataGraph,
        targets: [
            {
                label: 'UK Average 360 kWh/m' + String.fromCharCode(178) + '.a',
                target: 360,
                color: 'rgb(231,37,57)'
            }, {
                label: 'Carbon Coop Target 120 kWh/m' + String.fromCharCode(178) + '.a',
                target: 120,
                color: 'rgb(231,37,57)'
            }
        ],
    });
    $('#primary-energy-use').html('');
    primaryEneryUse.draw('primary-energy-use');
}
function add_carbon_dioxide_per_m2_figure(scenarios) {
    var carbonDioxideEmissionsData = [];
    var max = 100;
    if (typeof project["master"] !== "undefined" && typeof project["master"].kgco2perm2 !== "undefined") {
        var array = [{value: project["master"].kgco2perm2}];
        if (project['master'].use_generation == 1 && project['master'].fuel_totals['generation'].annualco2 < 0) // project[scenario].kgco2perm2 has deducted the savings due to renewables, to make the graph clearer we add the savings as negative to give the impression of offset
            array.push({value: project['master'].fuel_totals['generation'].annualco2 / data.TFA});
        carbonDioxideEmissionsData.push({label: "Your home now", value: array});
    }

    var array = [{value: project["master"].currentenergy.total_co2m2}, {value: -data.currentenergy.generation.annual_CO2 / data.TFA}];
    carbonDioxideEmissionsData.push({label: "Bills data", value: array});

    scenarios.forEach(function (scenario) {
        if (scenario != 'master') {
            var array = [{value: project[scenario].kgco2perm2}];
            if (project[scenario].use_generation == 1 && project[scenario].fuel_totals['generation'].annualco2 < 0) // project[scenario].kgco2perm2 has deducted the savings due to renewables, to make the graph clearer we add the savings as negative to give the impression of offset
                array.push({value: project[scenario].fuel_totals['generation'].annualco2 / data.TFA});
            carbonDioxideEmissionsData.push({label: "Scenario " + scenario.split('scenario')[1], value: array});
        }
    });

    carbonDioxideEmissionsData.forEach(function (scenario) {
        if (scenario.value > max)
            max = scenario.value + 10;
    });
    var CarbonDioxideEmissions = new BarChart({
        chartTitleColor: 'rgb(87, 77, 86)',
        yAxisLabelColor: 'rgb(87, 77, 86)', barLabelsColor: 'rgb(87, 77, 86)',
        yAxisLabel: 'kgCO' + String.fromCharCode(8322) + '/m' + String.fromCharCode(178) + '.year', fontSize: 33,
        font: "Karla",
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
                label: 'Carbon Coop Target - ' + datasets.target_values.co2_emission_rate + 'kgCO' + String.fromCharCode(8322) + '/m' + String.fromCharCode(178) + '.year', target: datasets.target_values.co2_emission_rate,
                color: 'rgb(231,37,57)'
            },
            {
                label: 'UK Average - ' + datasets.uk_average_values.co2_emission_rate + 'kgCO' + String.fromCharCode(8322) + '/m' + String.fromCharCode(178) + '.year',
                target: datasets.uk_average_values.co2_emission_rate,
                color: 'rgb(231,37,57)'
            },
        ], });
    $('#carbon-dioxide-emissions').html('');
    CarbonDioxideEmissions.draw('carbon-dioxide-emissions');
}
function add_carbon_dioxide_per_person_figure(scenarios) {
    var carbonDioxideEmissionsPerPersonData = [];
    if (typeof project["master"] != "undefined" && typeof project["master"].annualco2 !== "undefined" && typeof project["master"].occupancy !== "undefined") {
        var array = [{value: project["master"].annualco2 / project["master"].occupancy}];
        if (project['master'].use_generation == 1 && project['master'].fuel_totals['generation'].annualco2 < 0) // project[scenario].kgco2perm2 has deducted the savings due to renewables, to make the graph clearer we add the savings as negative to give the impression of offset
            array.push({value: project['master'].fuel_totals['generation'].annualco2 / project["master"].occupancy});
        carbonDioxideEmissionsPerPersonData.push({label: "Your home now", value: array});
    }

    var array = [{value: project["master"].TFA * project["master"].currentenergy.total_co2m2 / project["master"].occupancy}, {value: -data.currentenergy.generation.annual_CO2 / project["master"].occupancy}];
    carbonDioxideEmissionsPerPersonData.push({label: "Bills data", value: array});

    scenarios.forEach(function (scenario) {
        if (scenario != 'master') {
            var array = [{value: project[scenario].annualco2 / project["master"].occupancy}];
            if (project[scenario].use_generation == 1 && project[scenario].fuel_totals['generation'].annualco2 < 0) // project[scenario].kgco2perm2 has deducted the savings due to renewables, to make the graph clearer we add the savings as negative to give the impression of offset
                array.push({value: project[scenario].fuel_totals['generation'].annualco2 / project["master"].occupancy});
            carbonDioxideEmissionsPerPersonData.push({label: "Scenario " + scenario.split('scenario')[1], value: array});
        }
    });

    var max = 8000;
    carbonDioxideEmissionsPerPersonData.forEach(function (scenario) {
        if (scenario.value > max)
            max = scenario.value + 1000;
    });

    var CarbonDioxideEmissionsPerPerson = new BarChart({
        chartTitleColor: 'rgb(87, 77, 86)',
        yAxisLabelColor: 'rgb(87, 77, 86)',
        barLabelsColor: 'rgb(87, 77, 86)',
        yAxisLabel: 'kgCO' + String.fromCharCode(8322) + '/person/year',
        fontSize: 33,
        font: "Karla",
        division: max < 28000 ? 1000 : 2000,
        chartHigh: max,
        width: 1200,
        chartHeight: 600,
        barWidth: 550 / carbonDioxideEmissionsPerPersonData.length,
        barGutter: 400 / carbonDioxideEmissionsPerPersonData.length,
        defaultBarColor: 'rgb(157,213,203)', defaultVarianceColor: 'rgb(231,37,57)',
        // barColors: {
        // 	'Space heating': 'rgb(157,213,203)',
        // 	'Pumps, fans, etc.': 'rgb(24,86,62)',
        // 	'Cooking': 'rgb(40,153,139)',         // },
        data: carbonDioxideEmissionsPerPersonData
    });
    $('#carbon-dioxide-emissions-per-person').html('');
    CarbonDioxideEmissionsPerPerson.draw('carbon-dioxide-emissions-per-person');

}
function add_energy_costs_figure(scenarios) {
    var estimatedEnergyCostsData = [];
    var max = 3500;
    if (typeof project["master"] != "undefined" && typeof project["master"].total_cost !== "undefined") {
        var array = [{value: project["master"].total_cost}];
        if (project['master'].use_generation == 1 && project['master'].fuel_totals['generation'].annualcost < 0) // project[scenario].total_cost has deducted the savings due to renewables, to make the graph clearer we add the savings as negative to give the impression of offset
            array.push({value: project['master'].fuel_totals['generation'].annualcost});
        estimatedEnergyCostsData.push({label: "Your home now", value: array});
        if (max < project["master"].total_cost + 0.3 * project["master"].total_cost)
            max = project["master"].total_cost + 0.3 * project["master"].total_cost;
    }

    var array = [{value: project["master"].currentenergy.total_cost}];
    if (project['master'].currentenergy.generation.annual_savings > 0) // project[scenario].total_cost has deducted the savings due to renewables, to make the graph clearer we add the savings as negative to give the impression of offset
        array.push({value: -project['master'].currentenergy.generation.annual_savings});
    estimatedEnergyCostsData.push({label: "Bills data", value: array});

    scenarios.forEach(function (scenario) {
        if (scenario != 'master') {
            var array = [{value: project[scenario].total_cost}];
            if (project[scenario].use_generation == 1 && project[scenario].fuel_totals['generation'].annualcost < 0) // project[scenario].total_cost has deducted the savings due to renewables, to make the graph clearer we add the savings as negative to give the impression of offset
                array.push({value: project[scenario].fuel_totals['generation'].annualcost});
            estimatedEnergyCostsData.push({label: "Scenario " + scenario.split('scenario')[1], value: array});
        }
    });

    var EstimatedEnergyCosts = new BarChart({
        chartTitleColor: 'rgb(87, 77, 86)',
        yAxisLabelColor: 'rgb(87, 77, 86)',
        barLabelsColor: 'rgb(87, 77, 86)',
        yAxisLabel: '£/year',
        fontSize: 33,
        font: "Karla",
        division: 500,
        //chartHigh: max,
        width: 1200,
        chartHeight: 600,
        barWidth: 550 / estimatedEnergyCostsData.length,
        barGutter: 400 / estimatedEnergyCostsData.length,
        defaultBarColor: 'rgb(157,213,203)',
        data: estimatedEnergyCostsData
    });
    $('#estimated-energy-cost-comparison').html('');
    EstimatedEnergyCosts.draw('estimated-energy-cost-comparison');
}
function add_comfort_tables(scenarios) {
    // Temperature in Winter
    if (project.master.household == undefined
            || project.master.household["6a_temperature_winter"] == undefined
            || project.master.household["6a_airquality_winter"] == undefined
            || project.master.household["6a_airquality_summer"] == undefined
            || project.master.household["6a_temperature_summer"] == undefined
            || project.master.household["6b_daylightamount"] == undefined
            || project.master.household["6b_artificallightamount"] == undefined) {
        $('.comfort-tables').html('<p>There is not enough information, please check section 6 in Household Questionnaire. </p>')
    }
    else {
        var options = [{
                title: "Too cold", color: 'red',
            }, {
                title: "Just right",
                color: 'green',
            }, {
                title: "Too hot", color: 'red'
            }
        ];
        createComforTable(options, "comfort-table-winter-temp", project.master.household["6a_temperature_winter"]);
        // Air quality
        var options = [
            {
                title: "Too dry", color: 'red',
            }, {
                title: "Just right",
                color: 'green',
            }, {title: "Too stuffy",
                color: 'red'
            }];
        createComforTable(options, "comfort-table-winter-air", project.master.household["6a_airquality_winter"]);
        createComforTable(options, "comfort-table-summer-air", project.master.household["6a_airquality_summer"]);
        // Temperature in Summer
        var options = [
            {
                title: "Too cold", color: 'red',
            }, {
                title: "Just right", color: 'green',
            }, {
                title: "Too hot",
                color: 'red'
            }
        ];
        createComforTable(options, "comfort-table-summer-temp", project.master.household["6a_temperature_summer"]);
        // Air quality in Summer
        var options = [
            {
                title: "Too dry", color: 'red',
            }, {
                title: "Just right",
                color: 'green',
            }, {
                title: "Too stuffy",
                color: 'red'
            }];
        createComforTable(options, "comfort-table-summer-air", project.master.household["6a_airquality_summer"]);
        var options = [
            {
                title: "Too little",
                color: 'red',
            }, {title: "Just right",
                color: 'green',
            }, {
                title: "Too much",
                color: 'red'
            }
        ];
        createComforTable(options, "comfort-table-daylight-amount", project.master.household["6b_daylightamount"]);
        var options = [
            {
                title: "Too little",
                color: 'red',
            }, {
                title: "Just right",
                color: 'green',
            }, {
                title: "Too much",
                color: 'red'
            }
        ];
        createComforTable(options, "comfort-table-artificial-light-amount", project.master.household["6b_artificallightamount"]);
        var options = [
            {
                title: "Too draughty",
                color: 'red',
            }, {
                title: "Just right",
                color: 'green',
            }, {
                title: "Too still",
                color: 'red'
            }
        ];
        createComforTable(options, "comfort-table-draughts-summer", project.master.household["6a_draughts_summer"]);
        var options = [
            {
                title: "Too draughty",
                color: 'red',
            }, {
                title: "Just right",
                color: 'green',
            }, {
                title: "Too still",
                color: 'red'
            }
        ];
        createComforTable(options, "comfort-table-draughts-winter", project.master.household["6a_draughts_winter"]);
    }
}
function add_health_data(scenarios) {
    // Humidity Data
    if (data.household != undefined) {
        if (data.household.reading_humidity1 == undefined && data.household.reading_humidity2 == undefined)
            $(".js-average-humidity").html('There is not enough information, please check section 3 in Household Questionnaire.');
        else if (data.household.reading_humidity1 != undefined && data.household.reading_humidity2 == undefined)
            $(".js-average-humidity").html('When we visited, the relative humidity was ' + data.household.reading_humidity1 + ' %. (The ideal range is 40-60%).');
        else if (data.household.reading_humidity1 == undefined && data.household.reading_humidity2 != undefined)
            $(".js-average-humidity").html(' When we visited, the relative humidity was ' + data.household.reading_humidity2 + '%. (The ideal range is 40-60%).');
        else {
            var averageHumidity = 0.5 * (data.household.reading_humidity1 + data.household.reading_humidity2);
            $(".js-average-humidity").html('When we visited, the relative humidity was ' + averageHumidity + '%. (The ideal range is 40-60%).');
        }
    }

    // Temperature Data
    if (data.household != undefined) {
        if (data.household.reading_temp1 == undefined && data.household.reading_temp2 == undefined)
            $(".js-average-temp").html('There is not enough information, please check section 3 in Household Questionnaire.');
        else if (data.household.reading_temp1 != undefined && data.household.reading_temp2 == undefined)
            $(".js-average-temp").html('When we visited, the temperature was ' + data.household.reading_temp1 + ' °C.<br />(It is recommended that living spaces are at 16<sup>o</sup>C as a minium.');
        else if (data.household.reading_temp1 == undefined && data.household.reading_temp2 != undefined)
            $(".js-average-temp").html(' When we visited, the temperature was ' + data.household.reading_temp2 + '°C.<br />(It is recommended that living spaces are at 16<sup>o</sup>C as a minium.');
        else {
            var averageHumidity = 0.5 * (data.household.reading_temp1 + data.household.reading_temp2);
            $(".js-average-temp").html('When we visited, the temperature was ' + averageHumidity + '°C.<br />(It is recommended that living spaces are at 16<sup>o</sup>C as a minium (World Health Organisation).');
        }
    }

    // You also told us...
    if (data.household != undefined) {
        data.household['6c_noise_comment'] == undefined ? $('.js-noise_comment').html('There is not enough information, please check section 6 in Household Questionnaire.') : $('.js-noise_comment').html(data.household['6c_noise_comment']);
        data.household['6b_problem_locations'] == undefined || data.household['6b_problem_locations'] === '' ? $('.js-problem_locations_daylight').html('There is not enough information, please check section 6 in Household Questionnaire.') : $('.js-problem_locations_daylight').html(data.household['6b_problem_locations']);
        data.household['6a_problem_locations'] == undefined || data.household['6a_problem_locations'] == '' ? $('.js-problem_locations').html('There is not enough information, please check section 6 in Household Questionnaire.') : $('.js-problem_locations').html(data.household['6a_problem_locations']);
        data.household['6d_favourite_room'] == undefined || data.household['6d_favourite_room'] == '' ? $('.js-favourite_room').html('There is not enough information, please check section 6 in Household Questionnaire.') : $('.js-favourite_room').html(data.household['6d_favourite_room']);
        data.household['6d_unloved_rooms'] == undefined || data.household['6d_unloved_rooms'] == '' ? $('.js-unloved_rooms').html('There is not enough information, please check section 6 in Household Questionnaire.') : $('.js-unloved_rooms').html(data.household['6d_unloved_rooms']);

        var laundryHabits = "";
        if (typeof data.household["4b_drying_outdoorline"] != "undefined" && data.household["4b_drying_outdoorline"]) {
            laundryHabits += "outdoor clothes line, ";
        }
        if (typeof data.household["4b_drying_indoorrack"] != "undefined" && data.household["4b_drying_indoorrack"]) {
            laundryHabits += "indoor clothes racks, ";
        }
        if (typeof data.household["4b_drying_airingcupboard"] != "undefined" && data.household["4b_drying_airingcupboard"]) {
            laundryHabits += "airing cupboard, ";
        }
        if (typeof data.household["4b_drying_tumbledryer"] != "undefined" && data.household["4b_drying_tumbledryer"]) {
            laundryHabits += "tumble dryer, ";
        }
        if (typeof data.household["4b_drying_washerdryer"] != "undefined" && data.household["4b_drying_washerdryer"]) {
            laundryHabits += "washer/dryer, ";
        }
        if (typeof data.household["4b_drying_radiators"] != "undefined" && data.household["4b_drying_radiators"]) {
            laundryHabits += "radiators, ";
        }
        if (typeof data.household["4b_drying_electricmaiden"] != "undefined" && data.household["4b_drying_electricmaiden"]) {
            laundryHabits += "electric maiden, ";
        }

        if (laundryHabits.length === 0)
            laundryHabits = 'There is not enough information, please check section 4 in Household Questionnaire.'
        else
            var laundryHabits = laundryHabits.slice(0, -2);
        $(".js-laundry-habits").html(laundryHabits);
    }
}
function add_measures_summary_tables(scenarios, scenarios_measures_summary) {
    $('#ccop-report-measures-summary-tables').html('');
    var abc = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r']
    scenarios.forEach(function (scenario, index) {
        if (scenario != 'master') {
            if (index == 1)
                var html = '<div>';
            else
                var html = '<div class="no-break">';
            html += '<h4 class="top-border-title title-margin-bottom">Figure 13' + abc[index - 1] + ' - Scenario ' + scenario.split('scenario')[1] + ': ' + project[scenario].scenario_name + '</h4>'
            if (project[scenario].created_from != undefined && project[scenario].created_from != 'master')
                html += '<p>This scenario assumes the measures in Scenario ' + project[scenario].created_from.split('scenario')[1] + ' have already been carried out and adds to them</p>';
            html += '<p>Total cost of the scenario £' + Math.round(measures_costs(scenario) / 10) * 10 + ' </p>';
            html += '<div class="five-col-table-wrapper">' + scenarios_measures_summary[scenario] + '</div>';
            html += '</div>';
            //html = html.replace('measures-summary-table', 'measures-summary-table no-break');
            $('#ccop-report-measures-summary-tables').append(html);
        }
    });
}
function add_commentary() {
    if (data.household != undefined && data.household.commentary != undefined) {
        var commentary = data.household.commentary.replace(/\n/gi, "<br />");
        $('#commentary').html(commentary);
    }
}
function add_measures_complete_tables(scenarios, scenarios_measures_complete) {
    $('#ccop-report-measures-complete-tables').html('');
    var abc = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r']
    scenarios.forEach(function (scenario, index) {
        if (scenario != 'master') {
            if (index == 1)
                var html = '<div>';
            else
                var html = '<div class="no-break">';
            html += '<h4 class="top-border-title title-margin-bottom">Figure 14' + abc[index - 1] + ' - Scenario ' + scenario.split('scenario')[1] + ': ' + project[scenario].scenario_name + '</h4>'
            if (project[scenario].created_from != undefined && project[scenario].created_from != 'master')
                html += '<p>This scenario assumes the measures in Scenario ' + project[scenario].created_from.split('scenario')[1] + ' have already been carried out and adds to them</p>';
            html += '<p>Total cost of the scenario £' + Math.round(measures_costs(scenario) / 10) * 10 + ' </p>';
            html += '<div class="five-col-table-wrapper">' + scenarios_measures_complete[scenario] + '</div>';
            html += '</div>';
            html = html.replace(/complete-measures-table/g, 'complete-measures-table no-break');
            $('#ccop-report-measures-complete-tables').append(html);
        }
    });
}
function add_comparison_tables(scenarios, scenarios_comparison) {
    $('#comparison-tables').html('');
    var abc = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r']
    scenarios.forEach(function (scenario, index) {
        if (scenario != 'master') {
            var html = '<div class="highlight-box pink-highlight" style="page-break-before:avoid; page-break-inside: auto">';
            html += ' <h4 class="top-border-title title-margin-bottom ">Figure 15' + abc[index - 1] + ' Master/Scenario ' + scenario.split('scenario')[1] + 'Comparison Table</h4>';
            html += '<div class="js-scenario-comparison">' + scenarios_comparison[scenario] + '</div>';
            html += '</div>';
            $('#comparison-tables').append(html);
        }
    });
}

/*****************************************************************/

function heatlossData(scenario) {
    if (typeof project[scenario] != "undefined" && typeof project[scenario].fabric != "undefined") {
        return {
            floorwk: Math.round(project[scenario].fabric.total_floor_WK),
            ventilationwk: Math.round(project[scenario].ventilation.average_ventilation_WK),
            infiltrationwk: Math.round(project[scenario].ventilation.average_infiltration_WK),
            windowswk: Math.round(project[scenario].fabric.total_window_WK),
            wallswk: Math.round(project[scenario].fabric.total_wall_WK),
            roofwk: Math.round(project[scenario].fabric.total_roof_WK),
            thermalbridgewk: Math.round(project[scenario].fabric.thermal_bridging_heat_loss),
            totalwk: Math.round(project[scenario].fabric.total_floor_WK + project[scenario].ventilation.average_WK + project[scenario].fabric.total_window_WK + project[scenario].fabric.total_wall_WK + project[scenario].fabric.total_roof_WK + project[scenario].fabric.thermal_bridging_heat_loss)
        }
    }
    else {
        return {
            floorwk: 0,
            ventilationwk: 0,
            infiltrationwk: 0,
            windowswk: 0,
            wallswk: 0,
            roofwk: 0,
            thermalbridgewk: 0,
            totalwk: 0
        }
    }
}
function calculateRedShade(value, calibrateMax) {
    var calibrateMax = 292;
    return "rgba(255,0,0, " + (value / calibrateMax) + ")";
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
    var html = '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\
     width="444px" height="330.5px" viewBox="0 0 444 330.5" enable-background="new 0 0 444 330.5" xml:space="preserve">\
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
     <text transform="matrix(1 0 0 1 191.0084 172.7823)"><tspan x="0" y="0" fill="#F0533C" font-family="Karla-Bold" font-size="14">TOTAL </tspan><tspan x="-5.4" y="16.8" fill="#F0533C" font-size="14">' + heatlossData.totalwk + ' W/K</tspan></text>\
     <text transform="matrix(1 0 0 1 328.5163 95)"><tspan x="0" y="0" fill="#F0533C" font-family="Karla-Bold" font-size="11">Thermal Bridging</tspan><tspan x="0" y="12" fill="#F0533C" font-size="11">' + heatlossData.thermalbridgewk + ' W/K</tspan></text>\
     <text transform="matrix(1 0 0 1 230.624 21.1785)"><tspan x="0" y="0" fill="#F0533C" font-family="Karla-Bold" font-size="11">Roof</tspan><tspan x="0" y="12" fill="#F0533C" font-size="11">' + heatlossData.roofwk + ' W/K</tspan></text>\
     <text transform="matrix(1 0 0 1 330.5875 283.9302)"><tspan x="0" y="0" fill="#F0533C" font-family="Karla-Bold" font-size="11">Walls</tspan><tspan x="0" y="12" fill="#F0533C" font-size="11">' + heatlossData.wallswk + ' W/K</tspan></text>\
     <text transform="matrix(1 0 0 1 53.3572 283.9302)"><tspan x="0" y="0" fill="#F0533C" font-family="Karla-Bold" font-size="11">Planned ventilation</tspan><tspan x="0" y="12" fill="#F0533C" font-size="11">' + heatlossData.ventilationwk + ' W/K</tspan></text>\
     <text transform="matrix(1 0 0 1 150.0000 21)"><tspan x="0" y="0" fill="#F0533C" font-family="Karla-Bold" font-size="11">Draughts</tspan><tspan x="0" y="12" fill="#F0533C" font-size="11">' + heatlossData.infiltrationwk + ' W/K</tspan></text>\
     <text transform="matrix(1 0 0 1 35.0902 90.1215)"><tspan x="0" y="0" fill="#F0533C" font-family="Karla-Bold" font-size="11">Windows and doors</tspan><tspan x="11.2" y="12" fill="#F0533C" font-size="11">' + heatlossData.windowswk + ' W/K</tspan></text>\
     <text transform="matrix(1 0 0 1 248.466 283.9302)"><tspan x="0" y="0" fill="#F0533C" font-family="Karla-Bold" font-size="11">Floor</tspan><tspan x="0" y="12" fill="#F0533C" font-size="11">' + heatlossData.floorwk + ' W/K</tspan></text>\
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
     </svg>'
    return html;
}
function getEnergyDemandData(scenarios) {
    var data = {};
    for (var i = 0; i < scenarios.length; i++) {
        data[scenarios[i]] = [];
        var electric = 0;
        var gas = 0;
        var other = 0;
        if (typeof project[scenarios[i]] !== "undefined") {
            if (typeof project[scenarios[i]].fuel_totals !== "undefined") {
                for (var fuel in project[scenarios[i]].fuel_totals) {
                    if (project[scenarios[i]].fuels[fuel].category == 'Electricity')
                        electric += project[scenarios[i]].fuel_totals[fuel].quantity;
                    else if (project[scenarios[i]].fuels[fuel].category == 'Gas')
                        gas += project[scenarios[i]].fuel_totals[fuel].quantity;
                    else if (fuel != 'generation')
                        other += project[scenarios[i]].fuel_totals[fuel].quantity;
                }
                data[scenarios[i]].push({value: gas, label: 'Gas', variance: gas * 0.3});
                data[scenarios[i]].push({value: electric, label: 'Electric', variance: electric * 0.3});
                data[scenarios[i]].push({value: other, label: 'Other', variance: other * 0.3});
            }
        }
        if (max_value < (gas + electric + other))
            max_value = gas + electric + other + 5000;
    }


    data.bills = [
        {
            value: 0,
            label: 'Gas',
        },
        {value: 0,
            label: 'Electric',
        },
        {
            value: 0,
            label: "Other"
        }
    ];
    for (var fuel in project['master'].currentenergy.use_by_fuel) {
        var f_use = project['master'].currentenergy.use_by_fuel[fuel];
        if (project['master'].fuels[fuel].category == 'Gas')
            data.bills[0].value += f_use.annual_use;
        else if (project['master'].fuels[fuel].category == 'Electricity')
            data.bills[1].value += f_use.annual_use;
        else
            data.bills[2].value += f_use.annual_use;
    }
    data.bills[1].value += project['master'].currentenergy.generation.fraction_used_onsite * project['master'].currentenergy.generation.annual_generation; // We added consumption coming from generation
    if (max_value < (data.bills[0].value + data.bills[1].value + 1.0 * data.bills[2].value))
        max_value = data.bills[0].value + data.bills[1].value + 1.0 * data.bills[2].value + 5000;
    return data;
}
function getPrimaryEnergyUseData(scenarios) {
    var primaryEnergyUseData = {};
    primaryEnergyUseData.max = 500;
    primaryEnergyUseData.min = 0;
    for (var i = 0; i < scenarios.length; i++) {
        primaryEnergyUseData[scenarios[i]] = [];
        if (typeof project[scenarios[i]] !== "undefined") {
            if (typeof project[scenarios[i]].primary_energy_use_by_requirement !== "undefined") {
                if (typeof project[scenarios[i]].primary_energy_use_by_requirement['waterheating'] !== "undefined") {
                    primaryEnergyUseData[scenarios[i]].push({value: project[scenarios[i]].primary_energy_use_by_requirement['waterheating'] / data.TFA, label: 'Water Heating'});
                }

                if (typeof project[scenarios[i]].primary_energy_use_by_requirement['space_heating'] !== "undefined") {
                    primaryEnergyUseData[scenarios[i]].push({value: project[scenarios[i]].primary_energy_use_by_requirement['space_heating'] / data.TFA, label: 'Space Heating'});
                }

                if (typeof project[scenarios[i]].primary_energy_use_by_requirement['cooking'] !== "undefined") {
                    primaryEnergyUseData[scenarios[i]].push({value: project[scenarios[i]].primary_energy_use_by_requirement['cooking'] / data.TFA, label: 'Cooking'});
                }

                if (typeof project[scenarios[i]].primary_energy_use_by_requirement['appliances'] !== "undefined") {
                    primaryEnergyUseData[scenarios[i]].push({value: project[scenarios[i]].primary_energy_use_by_requirement['appliances'] / data.TFA, label: 'Appliances'});
                }

                if (typeof project[scenarios[i]].primary_energy_use_by_requirement['lighting'] !== "undefined") {
                    primaryEnergyUseData[scenarios[i]].push({value: project[scenarios[i]].primary_energy_use_by_requirement['lighting'] / data.TFA, label: 'Lighting'});
                }

                if (typeof project[scenarios[i]].primary_energy_use_by_requirement['fans_and_pumps'] !== "undefined") {
                    primaryEnergyUseData[scenarios[i]].push({value: project[scenarios[i]].primary_energy_use_by_requirement['fans_and_pumps'] / data.TFA, label: 'Fans and Pumps'});
                }
                if (project[scenarios[i]].use_generation == 1 && project[scenarios[i]].fuel_totals['generation'].primaryenergy < 0) { // we offset the stack displacing it down for the amount of renewables
                    var renewable_left = -project[scenarios[i]].fuel_totals['generation'].primaryenergy / data.TFA; // fuel_totals['generation'].primaryenergy is negative
                    primaryEnergyUseData[scenarios[i]].forEach(function (use) {
                        if (use.value <= renewable_left) {
                            renewable_left -= use.value;
                            use.value = -use.value;
                        }
                        if (use.value > renewable_left) {
                            primaryEnergyUseData[scenarios[i]].push({value: use.value - renewable_left, label: use.label}); // we create another bar with the same color than current use with the amount that is still positive
                            use.value = -renewable_left; // the amount offseted
                            renewable_left = 0;
                        }
                    });
                }
            }
        }
        if (typeof project[scenarios[i]] !== "undefined" && project[scenarios[i]].primary_energy_use_m2 > primaryEnergyUseData.max)
            primaryEnergyUseData.max = project[scenarios[i]].primary_energy_use_m2;
        if (typeof project[scenarios[i]] !== "undefined" && project[scenarios[i]].use_generation == 1 && project[scenarios[i]].fuel_totals['generation'].primaryenergy / project[scenarios[i]].TFA < primaryEnergyUseData.min)  // fuel_totals['generation'] is negative
            primaryEnergyUseData.min = project[scenarios[i]].fuel_totals['generation'].primaryenergy / project[scenarios[i]].TFA;
    }

    primaryEnergyUseData.bills = [
        {
            value: data.currentenergy.primaryenergy_annual_kwhm2,
            label: "Non categorized"},
        {
            value: -data.currentenergy.generation.primaryenergy / data.TFA,
            label: "Non categorized"}
    ]

    return primaryEnergyUseData;
}
function createComforTable(options, tableID, chosenValue) {
    $("#" + tableID + " .comfort-table-td").remove();
    for (var i = options.length - 1; i >= 0; i--) {

        if (options[i].title == chosenValue) {
            var background = options[i].color;
            $("#" + tableID + " .extreme-left").after($("<td class='comfort-table-td comfort-table-option " + i + "'><img src='../Modules/assessment/img-assets/" + options[i].color + "_box.jpg' style='height:30px;width:30px;vertical-align:middle' /></td>"));
        }
        else {
            var background = 'transparent';
            $("#" + tableID + " .extreme-left").after($("<td class='comfort-table-td comfort-table-option " + i + "'></td>"));
        }
        //$("#" + tableID + " .extreme-left").after($("<td class='comfort-table-td comfort-table-option " + i + "'  style='background:" + background + "'></td>"));
    }
}
function prepare_data_for_graph(data_source) {
    var dataFig = [];

    // We first add master and bills because it looks better in the graph when they go first
    if (data_source.master != undefined)
        dataFig.push({label: 'Your home now', value: data_source.master});
    if (data_source.bills != undefined)
        dataFig.push({label: 'Bills data', value: data_source.bills});

    // Add rst of scenarios
    for (var scenario in data_source)
        if (scenario != 'master' && scenario != 'bills')
            dataFig.push({label: "Scenario " + scenario.split('scenario')[1], value: data_source[scenario]});

    return dataFig;
}
