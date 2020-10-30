// var because it's exported (used in report)
var questionnaire = {
    YES_NO_NA: {
        'YES': 'Yes',
        'NO': 'No',
        'NA': 'Not applicable',
    },
    TENURE: {
        'OWNER':        'Owner occupied',
        'RENT_PRIVATE': 'Private rent',
        'RENT_SOCIAL':  'Social rent',
        'COOP':         'Co-op',
        'SHARED':       'Shared ownership',
    },
    OCCUPANCY_ACTUAL: {
        '0': 'not yet moved in',
        '1Y': 'less than 12 months',
        '2Y': '1-2 years',
        '5Y': '2-5 years',
        '10Y': '5-10 years',
        '20Y': '10-20 years',
        '20+Y': 'more than 20 years',
    },
    OCCUPANCY_EXPECTED: {
        'LONG':  'long term (10 years plus)',
        'MED':   'medium term (5–10 years)',
        'SHORT': 'short term (less than 5 years)',
    },
    WORKS_START: {
        '3_MONTH':  '3 months',
        '6_MONTH':  '3–6 months',
        '24_MONTH': '12–24 months',
        '5_YEAR':   '2–5 years',
    },
    LOGISTICS_PACKAGING: {
        'ONEGO': 'all in one go',
        'PHASES': 'in phases',
    },
    LOGISTICS_DISRUPTION: {
        '0': 'very minimal disruption',
        '1': 'having to redecorate in some rooms',
        '2': 'complete strip out and redecoration',
        '3': 'moving out for a few days',
        '4': 'moving out for several months',
    },
    LOGISTICS_BUDGET: {
        'YES': 'yes',
        'LATER': "I will work out a budget after understnding what's possible",
    },
    HOUSE_TYPE: {
        'FLAT_CONVERSION': 'Flat (conversion)',
        'FLAT_PURPOSE':    'Flat (purpose built)',
        'MIDTERRACE':      'Mid-terrace',
        'SEMIDETACHED':    'Semi-detached or end terrace',
        'DETACHED':        'Detached',
    },
    VENTILATION_SUGGESTION: {
        'BAD':  'Inadequate and should be upgraded as soon as possible',
        'OK':   'Adequate for the current condition but will need to be upgraded as part of retrofit',
        'GOOD': 'Is adequate and likely to be adequate for most foreseeable retrofit scenarios',
    },
    RADON_RISK: {
        'LOW': 'less than 1%',
        '1-3': '1-3%',
        '3-5': '3-5%',
        '5-10': '5-10%',
        '10-30': '10-30%',
        '30': 'greater than 30%',
    },
    COMFORT_TEMP: {
        'LOW': 'Too cold',
        'MID': 'Just right',
        'HIGH': 'Too hot',
    },
    COMFORT_AIR: {
        'LOW': 'Too dry',
        'MID': 'Just right',
        'HIGH': 'Too stuffy',
    },
    COMFORT_DRAUGHT: {
        'LOW': 'Too draughty',
        'MID': 'Just right',
        'HIGH': 'Too still',
    },
    COMFORT_DAYLIGHT: {
        'LOW': 'Too little',
        'MID': 'Just right',
        'HIGH': 'Too much',
        'VAR': 'Variable',
    },
    HISTORIC_AGE_BAND: {
        'before-1900':  'before 1900',
        '1900-1929':    '1900–1929',
        '1930-1949':    '1930–1949',
        '1950-1966':    '1950–1966',
        '1967-1975':    '1967–1975',
        '1976-1982':    '1976–1982',
        '1983-1990':    '1983–1990',
        '1991-1995':    '1991–1995',
        '1996-2002':    '1996–2002',
        '2003-2006':    '2003–2006',
        '2007-2011':    '2007–2011',
        '2012-onwards': '2012 onwards',
    },
    HISTORIC_LISTED: {
        'NO': 'not listed',
        'I': 'listed as Grade I',
        'II': 'listed as Grade II',
        'II*': 'listed as Grade II*',
        'LOCAL': 'listed on a local list',
    },
    FLOODING_RISK: {
        'HIGH': 'high',
        'MED':  'medium',
        'LOW':  'low',
        'VLOW': 'very low',
    },
    FLOODING_RISK_RESERVOIRS: {
        'WITHIN': 'within potential extent of flooding from reservoir',
        'OUTWITH': 'not within potential extent of flooding from reservoir',
    }
};

const qsucceed = v => ({ type: 'SUCCESS', 'val': v });
const qfail = v => ({ type: 'FAILED' });

const qtype = {
    str: {
        parse: s => qsucceed(s.toString()),
        type: 'str',
        friendly: 'text'
    },
    float: {
        parse: s => {
            let f = parseFloat(s);
            return isNaN(f) ? qfail() : qsucceed(f);
        },
        type: 'float',
        friendly: 'number',
    },
    int: {
        parse: s => {
            let f = parseInt(s, 10);
            return isNaN(f) ? qfail() : qsucceed(f);
        },
        type: 'int',
        friendly: 'number',
    },
    opt: table => ({
        parse: s => {
            // Be forgiving of spaces and case
            s = s.toLowerCase().trim();
            for (let [key, value] of Object.entries(table)) {
                if (s === key.toLowerCase() || s === value.toLowerCase()) {
                    return qsucceed(key);
                }
            }
            return qfail();
        },
        type: 'opt',
        friendly: 'choices',
        table: table,
    }),
    date: {
        parse: s => {
            // XXX Improve this
            return qsucceed(s.toString());
        },
        type: 'date',
        friendly: 'dd/mm/yyyy',
    },
    yesno: {
        parse: s => {
            if (s === undefined) {
                return qfail();
            } else if (s.toString().toLowerCase() === 'yes' || s === 1 || s === 'true' || s === true) {
                return qsucceed(true);
            } else if (s.toString().toLowerCase() === 'no' || s === 0 || s === 'false' || s === false) {
                return qsucceed(false);
            } else {
                return qfail();
            }
        },
        type: 'yesno',
        friendly: 'yes or no',
    },
};

const qfields = {
    'assessor_name': qtype.str,
    'assessment_date': qtype.date,
    'householder_name': qtype.str,
    'address_1': qtype.str,
    'address_2': qtype.str,
    'address_3': qtype.str,
    'address_town': qtype.str,
    'address_postcode': qtype.str,
    'address_la': qtype.str,
    'address_lsoa': qtype.str,
    'tenure': qtype.opt(questionnaire.TENURE),
    'tenure_note': qtype.str,
    'occupants_under5': qtype.int,
    'occupants_5to17': qtype.int,
    'occupants_18to65': qtype.int,
    'occupants_over65': qtype.int,
    'occupants_note': qtype.str,
    'occupants_pets': qtype.str,
    'health': qtype.str,
    'occupancy_actual': qtype.opt(questionnaire.OCCUPANCY_ACTUAL),
    'occupancy_expected': qtype.opt(questionnaire.OCCUPANCY_EXPECTED),
    'occupancy_expected_note': qtype.str,
    'expected_lifestyle_change': qtype.yesno,
    'expected_lifestyle_change_note': qtype.str,
    'expected_other_works': qtype.yesno,
    'expected_other_works_note': qtype.str,
    'expected_start': qtype.opt(questionnaire.WORKS_START),
    'expected_start_note': qtype.str,
    'priority_carbon': qtype.int,
    'priority_money': qtype.int,
    'priority_comfort': qtype.int,
    'priority_airquality': qtype.int,
    'priority_modernisation': qtype.int,
    'priority_health': qtype.int,
    'priority_qualitative_note': qtype.str,
    'aesthetics_external': qtype.yesno,
    'aesthetics_internal': qtype.yesno,
    'aesthetics_note': qtype.str,
    'logistics_packaging': qtype.opt(questionnaire.LOGISTICS_PACKAGING),
    'logistics_diy': qtype.yesno,
    'logistics_diy_note': qtype.str,
    'logistics_disruption': qtype.opt(questionnaire.LOGISTICS_DISRUPTION),
    'logistics_disruption_note': qtype.str,
    'logistics_budget': qtype.opt(questionnaire.LOGISTICS_BUDGET),
    'logistics_budget_note': qtype.str,
    'house_type': qtype.opt(questionnaire.HOUSE_TYPE),
    'house_type_note': qtype.str,
    'house_nr_bedrooms': qtype.int,
    'construct_note_floors': qtype.str,
    'construct_note_walls': qtype.str,
    'construct_note_roof': qtype.str,
    'construct_note_openings': qtype.str,
    'construct_note_drainage': qtype.str,
    'construct_note_ventiliation': qtype.str,
    'construct_note_ingress': qtype.str,
    'previous_works': qtype.str,
    'structural_issues': qtype.str,
    'structural_issues_note': qtype.str,
    'damp': qtype.str,
    'damp_note': qtype.str,
    'space_heating_provided': qtype.str,
    'space_heating_controls': qtype.str,
    'heating_off_summer': qtype.yesno,
    'heating_thermostat': qtype.float,
    'heating_weekday_on1_hours': qtype.int,
    'heating_weekday_on1_mins': qtype.int,
    'heating_weekday_off1_hours': qtype.int,
    'heating_weekday_off1_mins': qtype.int,
    'heating_weekday_on2_hours': qtype.int,
    'heating_weekday_on2_mins': qtype.int,
    'heating_weekday_off2_hours': qtype.int,
    'heating_weekday_off2_mins': qtype.int,
    'heating_weekday_on3_hours': qtype.int,
    'heating_weekday_on3_mins': qtype.int,
    'heating_weekday_off3_hours': qtype.int,
    'heating_weekday_off3_mins': qtype.int,
    'heating_weekend_on1_hours': qtype.int,
    'heating_weekend_on1_mins': qtype.int,
    'heating_weekend_off1_hours': qtype.int,
    'heating_weekend_off1_mins': qtype.int,
    'heating_weekend_on2_hours': qtype.int,
    'heating_weekend_on2_mins': qtype.int,
    'heating_weekend_off2_hours': qtype.int,
    'heating_weekend_off2_mins': qtype.int,
    'heating_weekend_on3_hours': qtype.int,
    'heating_weekend_on3_mins': qtype.int,
    'heating_weekend_off3_hours': qtype.int,
    'heating_weekend_off3_mins': qtype.int,
    'heating_unheated_habitable': qtype.str,
    'hot_water_provided': qtype.str,
    'mains_electricity': qtype.yesno,
    'mains_gas': qtype.yesno,
    'mains_water': qtype.yesno,
    'mains_sewer': qtype.yesno,
    'ventilation_adequate_paths': qtype.yesno,
    'ventilation_purge_vents': qtype.yesno,
    'ventilation_gaps': qtype.yesno,
    'ventilation_note': qtype.str,
    'reading_temp1': qtype.float,
    'reading_humidity1': qtype.int,
    'reading_temp2': qtype.float,
    'reading_humidity2': qtype.int,
    'ventilation_suggestion': qtype.opt(questionnaire.VENTILATION_SUGGESTION),
    'fuel_burner': qtype.opt(questionnaire.YES_NO),
    'fuel_burner_note': qtype.str,
    'laundry': qtype.str,
    'radon_risk': qtype.opt(questionnaire.RADON_RISK),
    'comfort_temperature_winter': qtype.opt(questionnaire.COMFORT_TEMP),
    'comfort_temperature_summer': qtype.opt(questionnaire.COMFORT_TEMP),
    'comfort_airquality_winter': qtype.opt(questionnaire.COMFORT_AIR),
    'comfort_airquality_summer': qtype.opt(questionnaire.COMFORT_AIR),
    'comfort_draughts_winter': qtype.opt(questionnaire.COMFORT_DRAUGHT),
    'comfort_draughts_summer': qtype.opt(questionnaire.COMFORT_DRAUGHT),
    'thermal_comfort_problems': qtype.yesno,
    'thermal_comfort_note': qtype.str,
    'daylight': qtype.opt(questionnaire.COMFORT_DAYLIGHT),
    'daylight_problems': qtype.yesno,
    'daylight_note': qtype.str,
    'noise_problems': qtype.yesno,
    'noise_note': qtype.str,
    'rooms_unloved': qtype.str,
    'rooms_favourite': qtype.str,
    'historic_age_band': qtype.opt(questionnaire.HISTORIC_AGE_BAND),
    'historic_age_precise': qtype.str,
    'historic_conserved': qtype.yesno,
    'historic_listed': qtype.opt(questionnaire.HISTORIC_LISTED),
    'historic_note': qtype.str,
    'flooding_history': qtype.yesno,
    'flooding_note': qtype.str,
    'flooding_rivers_sea': qtype.opt(questionnaire.FLOODING_RISK),
    'flooding_surface_water': qtype.opt(questionnaire.FLOODING_RISK),
    'flooding_reservoirs': qtype.opt(questionnaire.FLOODING_RISK_RESERVOIRS),
    'overheating_note': qtype.str,
    'context_and_other_points': qtype.str,
};

console.log('debug householdquestionnaire.js');

function householdquestionnaire_initUI() {
    data = project['master'];
    data.household = data.household || {};
}

function householdquestionnaire_UpdateUI() {
    if (data.temperature.hours_off.weekday.length > 0) {
        let text = data.temperature.hours_off.weekday
            .filter(elem => elem != null && elem != 0)
            .map(elem => elem.toFixed(1) + 'h')
            .join(', ');

        $('#periods_heating_off_weekday').html(text);
    }

    if (data.temperature.hours_off.weekend.length > 0) {
        let text = data.temperature.hours_off.weekend
            .filter(elem => elem != null && elem != 0)
            .map(elem => elem.toFixed(1) + 'h')
            .join(', ');

        $('#periods_heating_off_weekend').html(text);
    }

    let csv = export_csv();
    document.getElementById('get_csv').setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(csv));
    document.getElementById('get_csv').setAttribute('download', 'householder_qs.csv');
}

$('#process_csv').click(function (e) {
    let file = document.querySelector('#csv_file').files[0];
    let reader = new FileReader();

    reader.onload = function() {
        let parsed = Papa.parse(reader.result, {skipEmptyLines: true});

        if (parsed.errors.length > 0) {
            let errors = parsed.errors
                .map(err => `${err.message} (row ${error.row})`)
                .join('<br>');

            $('#csv-result').css('color', 'red').html('There was a problem processing the file:' + error_string);
            console.error(parsed);
        } else {
            errors = import_csv(parsed.data);
            update();
            if (errors.length > 0) {
                $('#csv-result').css('color', 'red').html('Questionnaire imported with errors:<br>' + errors.join('<br>'));
            } else {
                $('#csv-result').css('color', 'black').html('Questionnaire imported');
            }
        }
    };

    reader.readAsText(file);
});

function export_csv() {
    let contents = [];

    contents.push(',,,For multiple choice answers please place an X in column B against the correct choice');
    contents.push('Field,Type,Answer');

    for (let [name, type] of Object.entries(qfields)) {
        let friendly = type.friendly;

        // For questions with multiple choices, we output a list of the choices and
        // allow the user to put an 'X' next to the right one.
        if (type.table) {
            let first = true;
            for (let [optk, optv] of Object.entries(type.table)) {
                let current = project.master.household[name] == optk ? 'X' : '';
                contents.push(`${first ? name : ''},${friendly},${current},${optv}`);
                first = false;
            }
        } else {
            let current;

            // We have to do some work to redress the broken underlying model that
            // MHEP uses here.  Sometimes true is 1 or true or "YES".  XXX
            // The way to fix this is to make the questionnaire use its own listen
            // handlers rather than 'key', and use the table of fields above to set up
            // the data store correctly.  One day.
            if (type.type == 'yesno') {
                let r = qtype.yesno.parse(project.master.household[name]);
                if (r.type === 'FAILED') {
                    current = '';
                } else if (r.val === true) {
                    current = 'yes';
                } else if (r.val === false) {
                    current = 'no';
                } else {
                    current = '';
                }
            } else {
                current = project.master.household[name] || '';
            }

            contents.push(`${name},${friendly},${current}`);
        }
    }

    return contents.join('\n');
}

function import_csv(rows) {
    const COL_KEY = 0;
    const COL_ANSWER = 2;
    const COL_CHOICES = 3;

    let errors = [];

    // We keep the key out of the loop because it's only on the first row of multi-row
    // choices
    let key = null;

    for (let row of rows) {
        // Skip over rows with nothing for field name (if no current key)
        if (!key && !row[COL_KEY]) {
            continue;
        }

        // If there's a new field name, try using it
        if (row[COL_KEY]) {
            // if it's unknown, skip and reset the key
            if (!(row[COL_KEY] in qfields)) {
                key = null;
                continue;
            } else {
                // Otherwise accept it as the new key
                key = row[COL_KEY];
            }
        }

        // If we get here then we always have a key.

        // If there is no value then we don't overwrite
        if (row[COL_ANSWER] == '') {
            continue;
        }

        let val = row[COL_ANSWER];
        if (qfields[key].table) {
            // If we have a choices table then we use the 'choices' field rather than
            // the 'answer', which is just an 'X'.  Only fields with 'X' in them get
            // to this point, because we skipped over empty answers earlier.
            val = row[COL_CHOICES];
        }

        let res = qfields[key].parse(val);
        if (res.type == 'SUCCESS') {
            project.master.household[key] = res.val;
        } else {
            errors.push(`Couldn't understand ${key} ("${val}")`);
        }
    }

    return errors;
}
