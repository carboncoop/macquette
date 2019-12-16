function draw_openbem_graphics(parent) {
    $(`${parent} .house-container`).html(houseSVG(data));

    draw_space_heating_targetbar(parent, data);
    draw_primary_energy_targetbar(parent, data);
    draw_co2_targetbar(parent, data);
    draw_perperson_targetbar(parent, data);

    if (scenario != undefined) {
        if (page != 'report' && scenario != 'master') {
            $('#measures-costs').html('Measures cost: £' + measures_costs(scenario).toFixed(2));
        } else {
            $('#measures-costs').html('');
        }
    }
}

function houseSVG(data) {
    const SCALE = 30;

    const floorwk = data.fabric.total_floor_WK;
    const ventilationwk = data.ventilation.average_ventilation_WK;
    const infiltrationwk = data.ventilation.average_infiltration_WK;
    const windowswk = data.fabric.total_window_WK;
    const wallswk = data.fabric.total_wall_WK;
    const roofwk = data.fabric.total_roof_WK;
    const thermalbridgewk = data.fabric.thermal_bridging_heat_loss;

    const scaled_floor = Math.sqrt(floorwk / SCALE);
    const scaled_ventilation = Math.sqrt(ventilationwk / SCALE);
    const scaled_windows = Math.sqrt(windowswk / SCALE);
    const scaled_walls = Math.sqrt(wallswk / SCALE);
    const scaled_roof = Math.sqrt(roofwk / SCALE);
    const scaled_thermalbridge = Math.sqrt(thermalbridgewk / SCALE);
    const scaled_infiltration = Math.sqrt(infiltrationwk / SCALE);

    const totalwk = floorwk + ventilationwk + infiltrationwk + windowswk + wallswk + roofwk + thermalbridgewk;

    return `
        <svg class="house" viewBox="0 0 1040 800" preserveAspectRatio="xMinYMin">
            <defs>
                <g id="house-arrow">
                    <path d="M0 25h65V0l35 50-35 50V75H0z" />
                </g>

                <g id="house-house">
                    <path fill="rgba(99,86,71,.8)" d="M220 100h10v110h-10zM10 140h10v30H10z" />
                    <path fill="rgba(99,86,71,0.8)" d="M120 235h100v-25h10v35H10v-35h10v25zM20 90v10H10V90H0v-5L120 0l120 85v5h-10v10h-10V90L120 20z" />
                    <path fill="rgba(99,86,71,.3)" d="M11 100h8v40h-8zM11 170h8v40h-8z" />
                </g>
            </defs>

            <use xlink:href="#house-house" x="128" y="55" transform="scale(2)" />
            <text x="500" y="400" class="text-bold house--dark" text-anchor="middle">TOTAL</text>
            <text class="house--dark" x="500" y="435" text-anchor="middle">
                ${Math.round(thermalbridgewk)} W/K
            </text>

            <use transform="translate(460,615) rotate(90) scale(${scaled_floor}) translate(0,-50)"
                 xlink:href="#house-arrow"
                 class="house--darker" />
            <text x="540" y="650" class="text-bold house--darker">Floor</text>
            <text class="house--dark" x="540" y="685">
                ${Math.round(floorwk)} W/K
            </text>

            <use transform="translate(645,200) rotate(-55) scale(${scaled_roof}) translate(0,-50)"
                 xlink:href="#house-arrow"
                 class="house--darker" />
            <text x="530" y="50" class="text-bold house--darker">Roof</text>
            <text class="house--dark" x="530" y="85">
                ${Math.round(roofwk)} W/K
            </text>

            <use transform="translate(730,535) rotate(0) scale(${scaled_walls}) translate(0,-50)"
                 xlink:href="#house-arrow"
                 class="house--light" />
            <text x="730" y="650" class="text-bold house--dark">Walls</text>
            <text class="house--dark" x="730" y="685">
                ${Math.round(wallswk)} W/K
            </text>

            <use transform="translate(260,535) rotate(180) scale(${scaled_ventilation}) translate(0,-50)"
                 xlink:href="#house-arrow"
                 class="house--light" />
            <text x="260" y="650" class="text-bold house--dark" text-anchor="end">Ventilation</text>
            <text class="house--dark" x="260" y="685" text-anchor="end">
                ${Math.round(ventilationwk)} W/K
            </text>

            <use transform="translate(260,350) rotate(180) scale(${scaled_windows}) translate(0,-50)"
                 xlink:href="#house-arrow"
                 class="house--light" />
            <text x="260" y="215" class="text-bold house--dark" text-anchor="end">Windows</text>
            <text class="house--dark" x="260" y="250" text-anchor="end">
                ${Math.round(windowswk)} W/K
            </text>

            <use transform="translate(730,350) rotate(0) scale(${scaled_thermalbridge}) translate(0,-50)"
                 xlink:href="#house-arrow"
                 class="house--light" />
            <text x="730" y="210" class="text-bold house--dark">Thermal bridging</text>
            <text class="house--dark" x="730" y="245">
                ${Math.round(thermalbridgewk)} W/K
            </text>

            <use transform="translate(340,205) rotate(235) scale(${scaled_infiltration}) translate(0,-50)"
                 xlink:href="#house-arrow"
                 class="house--darker" />
            <text x="315" y="50" class="text-bold house--darker">Infiltration</text>
            <text class="house--dark" x="315" y="85">
                ${Math.round(infiltrationwk)} W/K
            </text>
        </svg>`;
}

/*
 * Draw a 'target bar'.
 *
 * name - string to label the graph with
 * unknown - is this value unknown?
 * value - numeric value
 * units - units for value
 * targets - array of objects with "label" and "value" keys, to display on the graph
 */
function targetbarSVG({ width, name, unknown, value, units, targets }) {
    const height = 40;

    // Always 25% larger than max target or value
    const targetValues = targets.map(t => t.value);
    const maxval = Math.max(value, ...targetValues) * 1.25;
    const xscale = width / maxval;

    const header =
        unknown === true
            ? 'Not enough data'
            : `${value} ${units}`;

    const drawLine = target => {
        const x = target.value * xscale;

        return `
            <line x1="${x}" y1="1" x2="${x}" y2="${height-1}" stroke="rgba(99,86,71,0.8)" stroke-dasharray="4.33 4.33" />
            <text x="${x+5}" y="${height-22}" fill="rgba(99,86,71,0.8)">
                ${target.value} ${units}
            </text>
            <text x="${x+5}" y="${height-8}" fill="rgba(99,86,71,0.8)" style="font-weight: bold;">
                ${target.label}
            </text>
        `;
    };

    return `
        <div class='targetbar-head'>
            <span>${name}:</span>
            <span><b>${header}</b></span>
        </div>

        <svg viewBox="0 0 ${width} ${height}" height="${height}">
            <rect x="1" y="1" width="${width-2}" height="${height-2}" style="fill: rgba(99,86,71,0.2); stroke: rgba(99,86,71, 0.5); stroke-width: 2px" />
            <rect x="1" y="1" width="${(value*xscale)-2}" height="${height-2}" fill="rgba(99,86,71,0.2)" />

            ${unknown ? '' : targets.map(drawLine)}
        </svg>
    `;
}

function draw_space_heating_targetbar(parent, data) {
    const is_unknown = isNaN(data.space_heating_demand_m2) || data.space_heating_demand_m2 == Infinity;
    const value =
        is_unknown
            ? 0
            : Math.round(data.space_heating_demand_m2);
    const width = $(`${parent} #spaceheating`).width();

    $(`${parent} #spaceheating`).html(
        targetbarSVG({
            name: 'Space heating demand',
            width: width,
            unknown: is_unknown,
            value: value,
            units: 'kWh/m²',
            targets: [
                //"Passivhaus": 15,
                { label: 'Min target', value: datasets.target_values.space_heating_demand_lower, },
                { label: 'Max target', value: datasets.target_values.space_heating_demand_upper, },
                { label: 'UK Average', value: datasets.uk_average_values.space_heating_demand },
            ]
        })
    );
}

function draw_primary_energy_targetbar(parent, data) {
    const is_unknown = isNaN(data.primary_energy_use_m2) || data.primary_energy_use_m2 === Infinity;
    const value =
        is_unknown
            ? 0
            : Math.round(data.primary_energy_use_m2);
    const width = $(`${parent} #primaryenergy`).width();

    $(`${parent} #primaryenergy`).html(
        targetbarSVG({
            name: 'Primary energy demand',
            width: width,
            unknown: is_unknown,
            value: value,
            units: 'kWh/m²',
            targets: [
                { label: 'Target', value: datasets.target_values.primary_energy_demand_passive_house },
                { label: 'UK Average', value: datasets.uk_average_values.primary_energy_demand },
            ]
        })
    );
}

function draw_co2_targetbar(parent, data) {
    const is_unknown = isNaN(data.kgco2perm2) || data.kgco2perm2 === Infinity;
    const value =
        is_unknown
            ? 0
            : Math.round(data.kgco2perm2);
    const width = $(`${parent} #co2`).width();

    $(`${parent} #co2`).html(
        targetbarSVG({
            name: 'CO2 Emission rate',
            width: width,
            unknown: is_unknown,
            value: value,
            units: 'kgCO₂/m²',
            targets: [
                { label: 'Zero Carbon', value: 0 },
                { label: '80% by 2050', value: 17 },
                { label: 'UK Average', value: datasets.uk_average_values.co2_emission_rate },
            ]
        })
    );
}

function draw_perperson_targetbar(parent, data) {
    const is_unknown = isNaN(data.kwhdpp) || data.kwhdpp === Infinity;
    const value =
        is_unknown
            ? 0
            : Math.round(data.kwhdpp.toFixed(1));
    const width = $(`${parent} #perperson`).width();

    $(`${parent} #perperson`).html(
        targetbarSVG({
            name: 'Per person energy use',
            width: width,
            unknown: is_unknown,
            value: value,
            units: 'kWh/day',
            targets: [
                { label: '70% heating saving', value: datasets.target_values.energy_use_per_person },
                { label: 'UK Average', value: datasets.uk_average_values.energy_use_per_person },
            ]
        })
    );
}
