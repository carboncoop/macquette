console.log('Debug currentenergy.js');


function currentenergy_initUI() {
    data = project['master'];

    $('#type_of_fuel_select').html(get_fuels_for_select());
    $('#currentenergy_use_by_fuel').html('');
    for (var fuel in data.currentenergy.use_by_fuel) {
        var html = '<tr>';
        html += '<td>' + fuel + '</td>';
        html += "<td><input type='number' style='width:80px' key='data.currentenergy.use_by_fuel." + fuel + ".annual_use' dp=2 /></td>";
        html += "<td>x <span key='data.fuels." + fuel + ".co2factor' dp=2 /></td>";
        html += "<td><span key='data.currentenergy.use_by_fuel." + fuel + ".annual_co2' dp=2 /></td>";
        html += "<td>x <span key='data.fuels." + fuel + ".primaryenergyfactor' dp=2 /></td>";
        html += "<td><span key='data.currentenergy.use_by_fuel." + fuel + ".primaryenergy' dp=2 /></td>";
        html += "<td><span key='data.fuels." + fuel + ".fuelcost' dp=2 /></td>";
        html += "<td><span key='data.fuels." + fuel + ".standingcharge' dp=2 /></td>";
        html += "<td>£<span key='data.currentenergy.use_by_fuel." + fuel + ".annualcost' dp=2 /></td>";
        html += "<td><i class='currentenergy-delete-fuel icon-trash' style='cursor:pointer' fuel='" + fuel + "'></i></td>";
        html += '</tr>';
        $('#currentenergy_use_by_fuel').append(html);
    }

    if (data.currentenergy.onsite_generation === 1) {
        $('#onsite-generation').show();
    } else {
        $('#onsite-generation').hide();
    }
}

function currentenergy_UpdateUI() {
    const width = $('#currentenergy-primaryenergy').width();

    document.getElementById('currentenergy-primaryenergy').innerHTML =
        targetbarSVG({
            name: 'Primary energy demand',
            width: width,
            unknown: typeof(data.currentenergy.primaryenergy_annual_kwhm2) === undefined ||
                isNaN(data.currentenergy.primaryenergy_annual_kwhm2) ||
                data.currentenergy.primaryenergy_annual_kwhm2 === Infinity,
            value: Math.round(data.currentenergy.primaryenergy_annual_kwhm2),
            units: 'kWh/m²',
            targets: [
                { label: 'Passivhaus', value: 120 },
                { label: 'UK Average', value: 360 },
            ]
        });

    document.getElementById('currentenergy-co2').innerHTML =
        targetbarSVG({
            name: 'CO2 Emission rate',
            width: width,
            unknown: typeof(data.currentenergy.total_co2m2) === undefined ||
                isNaN(data.currentenergy.total_co2m2) ||
                data.currentenergy.total_co2m2 === Infinity,
            value: Math.round(data.currentenergy.total_co2m2),
            units: 'kgCO₂/m²',
            targets: [
                { label: '80% by 2050', value: 17 },
                { label: 'UK Average', value: 50.3 },
            ]
        });

    document.getElementById('currentenergy-perperson').innerHTML =
        targetbarSVG({
            name: 'Per person energy use',
            width: width,
            unknown: false,
            value: data.currentenergy.energyuseperperson.toFixed(1),
            units: 'kWh/day',
            targets: [
                { label: '70% heating saving', value: 8.6 },
                { label: 'UK Average', value: 19.6 },
            ]
        });
}


$('#add_use_by_fuel').click(function () {
    var fuel_type = $('#type_of_fuel_select').val();
    data.currentenergy.use_by_fuel[fuel_type] = {annual_use: 0, annual_co2: 0, primaryenergy: 0, annualcost: 0};
    currentenergy_initUI();
    update();
});

$('#openbem').on('click', '.currentenergy-delete-fuel', function () {
    var fuel = $(this).attr(('fuel'));
    delete data.currentenergy.use_by_fuel[fuel];
    currentenergy_initUI();
    update();
});

$('#openbem').on('change', '[key="data.currentenergy.onsite_generation"]', function () {
    $('#onsite-generation').toggle();
});
