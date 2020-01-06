/******************************************************
 *
 * # Open floor U-value calculator (openFUVC)
 * ------------------------------------------
 *
 * Welcome to openFUVC, an open source implementation of the thermal transmittance
 * calculation of floors as specified in BS EN ISO 13370:2007.
 *
 * This project has been developed by [URBED](http://urbed.coop/) and
 * [Carbon Co-op](http://carbon.coop/) as part of [MyHomeEnergyPlanner](https://github.com/emoncms/MyHomeEnergyPlanner).
 *
 * The calculator is released under the [GNU Affero General Public License](https://www.gnu.org/licenses/agpl-3.0.en.html). So download it, study it, share it, change it, use it for yourself or in your website in which case don't forget to add a link to the <a rehf="https://github.com/carboncoop/openFUVC">source code</a> (also applies to any changes you may make).
 *
 ********************************************************/

function openFUVC() {
    this.dataset = openFUVC_dataset;
}

/**
 * @param {String} type - of floor to calculate U-value of. Options: suspended_floor, slab_on_ground, heated_basement or exposed_floor_above_GL
 * @param {Object} data - Object with all the different inputs required by the methods to calculate the u-value. The documentation of each method specifies the expected properties in the data object
 * @returns {Number} U-value for the given type of floor described by data in W/m2.K
 */
openFUVC.prototype.calc = function (type, data) {
    data = this.sanitize_data_in(data);
    var u_value = 0;
    switch (type) {
        case 'suspended_floor':
            u_value = this.supended_floor(data);
            break;
        case 'slab_on_ground':
            u_value = this.slab_on_ground(data);
            break;
        case 'heated_basement':
            u_value = this.heated_basement(data);
            break;
        case 'exposed_floor_above_GL':
            u_value = this.exposed_floor_above_GL(data);
            break;
        default:
            console.error('Type of calculation not valid: ' + type);
            window.alert('Type of calculation not valid: ' + type);
    }
    return u_value;
};

/********************************************************************
 * Calculates u-value of a suspended floor according to the method in BS EN ISO 13370:2007 (Annex E)
 * @param datain object with the relevant data to do the calculations
 *      - region: index to the matching region in openFUVC.dataset.regions
 *      - area: Area  of floor in m2
 *      - perimeter: Exposed perimeter in m
 *      - height: Height above external floor level in m, if unknown/uncertain enter 0.3 m
 *      - depth_of_basement_floor: depth of basement floor below ground level in metres
 *      - wind_shielding_factor
 *      - wind_speed_annual_average: Average wind speed at 10m above ground level in m/s. If not defined then it will be calculated for the region from the dataset
 *      - external_temperature_annual_average: Average annual external temperature in C. If not defined then it will be calculated for the region from the dataset
 *      - internal_temperature_annual_average: Average annual internal temperature in C
 *      - area_ventilation_openings: ventilation openings per m exposed perimeter in m2/m
 *      - floor_deck_layers: array of objects. Each object: {thickness: number, thermal_conductivity_1: number, thermal_conductivity_2: number, length_2: number, spacing: number}
 *      - wall_thickness - External walls thickness in m
 *      - wall_uvalue: thermal transmittance of walls of underfloor space (above ground level) in W/m2.K
 *      - base_insulation_thermal_conductivity: Thermal conductivity (λ) of insulation on the base of the underfloor space in W/m.K
 *      - base_insulation_thickness: in metres
 *      - edge_insulation_underfloor_space: edge insulation is applied around the base of the underfloor space - Options: horizontal, vertical or none
 *      - edge_insulation_thickness: horizontal or vertical edge insulation around the base of the underfloor space in metres
 *      - edge_insulation_length: width of horizontal edge isulation or depth of vertical edge insulation, in metres
 *      - edge_insulation_thermal_conductivity: thermal conductivity due to the type of insulation in W/m.K
 *      - thermal_conductivity_ug: Thermal conductivity of unfrozen ground in W/m.K
 *      - ventilation_type: type of ventilation of the underfloor space. Options: natural, mechanical_from_inside, mechanical_from_outside_to_heated_basement, mechanical_from_outside_to_unheated_basement, none.
 *      - ventilation_rate: volumetric air change rate, in m3/s. Required when 'ventilation_type' is 'mechanical_from_inside', 'mechanical_from_outside_to_heated_basement' or 'mechanical_from_outside_to_unheated_basement'
 *      - ventilation_rate_unheated_basement: ventilation rate to unheated basement in air changes per hour. Use when "ventilation_type" is "mechanical_from_outside_to_unheated_basement". If not present then default one in openFUVC.dataset.default_ventilation_rate_unheated_basement will be used
 *      - basement_volume: air volume of the basement in ??? I guess m3
 *
 * @returns {number} u-value of the suspended floor W/m2.K
 * @see data.dataset
 *
 */
openFUVC.prototype.supended_floor = function (datain) {
    // 1. Calculation of B: characteristic dimension
    var B = this.characteristic_dimension(datain.area, datain.perimeter);

    // 2. Calculation of Ug: the thermal transmittance for heat flow through the ground
    // 2.1. Calculation of Rg: the thermal resistance of any insulation on the base of the underfloor space
    if (datain.base_insulation_thickness != undefined && datain.base_insulation_thermal_conductivity != undefined) {
        var Rg = datain.base_insulation_thickness / datain.base_insulation_thermal_conductivity;
    } else {
        var Rg = 0;
    }

    // 2.2. Calculation of dg: equivalent thickness
    var dg = this.equivalent_thickness(datain.wall_thickness, datain.thermal_conductivity_ug, this.dataset.Rsi_downwards, Rg, this.dataset.Rse_to_subfloor);

    // 2.3. Calculation of Ug
    if (datain.depth_of_basement_floor < 0.5) {
        var Ug = 2 * datain.thermal_conductivity_ug * Math.log(Math.PI * B / dg + 1) / (Math.PI * B + dg);
    } else {
        // equation 8
        var dt = dg;
        var dw = this.equivalent_thickness(0, datain.thermal_conductivity_ug, this.dataset.Rsi_horizontal, 1 / datain.wall_uvalue, this.dataset.Rse_to_subfloor);
        var Ubf = this.thermal_transmittance_basement_floor(datain.thermal_conductivity_ug, B, datain.depth_of_basement_floor, dt);
        var Ubw = this.thermal_transmittance_basement_walls(datain.thermal_conductivity_ug, datain.depth_of_basement_floor, dw, dt);
        var Ug = Ubf + datain.depth_of_basement_floor * datain.perimeter * Ubw / datain.area; // equation E.2
    }

    // 2.4. Ug correction due to edge insulation around the base of the underfloor space (B.3)
    if (datain.edge_insulation_underfloor_space != undefined && datain.edge_insulation_underfloor_space != 'none') {
        var Uei = 0;
        if (datain.edge_insulation_underfloor_space == 'horizontal') {
            Uei = 2 / B * this.linear_thermal_transmittance_horizontal_edge_insulation(datain.thermal_conductivity_ug, dg, datain.edge_insulation_length, datain.edge_insulation_thickness, datain.edge_insulation_thermal_conductivity);
        } else if (datain.edge_insulation_underfloor_space == 'vertical') {
            Uei = 2 / B * this.linear_thermal_transmittance_vertical_edge_insulation(datain.thermal_conductivity_ug, dg, datain.edge_insulation_length, datain.edge_insulation_thickness, datain.edge_insulation_thermal_conductivity);
        } else {
            console.error('Edge insulation not valid: ' + datain.edge_insulation_underfloor_space);
            window.alert('Edge insulation not valid: ' + datain.edge_insulation_underfloor_space);
        }
        Ug = Ug + Uei;
    }

    // 3. Calculation of Uf: the thermal transmittance of suspended part of floor,
    // in W/(m 2 ·K) (between the internal environment and the underfloor space);
    var Uf = this.thermal_transmittance_floor_deck(datain.floor_deck_layers);

    // 4- Calculation U-value of suspended floor, quation E.3
    // 4.1- Annual average wind speed
    if (datain.wind_speed_annual_average != undefined) {
        var wind_speed = datain.wind_speed_annual_average;
    } else {
        var wind_speed = this.get_wind_speed_annual_average(datain.region);
    }

    // 4.2- Annual average external temperature
    if (datain.external_temperature_annual_average != undefined) {
        var external_temperature = datain.external_temperature_annual_average;
    } else {
        var external_temperature = this.get_external_temperature_annual_average(datain.region);
    }

    // 4.3- Other variables depending on the type of ventilation
    switch (datain.ventilation_type) {
        case 'natural':
            var Vrate = 0.59 * datain.area_ventilation_openings * wind_speed * datain.wind_shielding_factor * datain.perimeter;
            var Vcp = Vrate * this.dataset.air_density * this.dataset.air_heat_capacity;
            var ventilating_air_temperature = external_temperature;
            datain.internal_temperature_annual_average = external_temperature + 5; //this random assignment is because we don't need to ask in the UI for the internal temperature but we sitll use it in the calculation of numerator (below), it  doesn't matter what value it has: the fact that ventilating_air_temperature equals external_temperature makes the second part of the numerator calculation equals to 1
            break;
        case 'mechanical_from_inside':
            var Vrate = datain.ventilation_rate;
            var Vcp = Vrate * this.dataset.air_density * this.dataset.air_heat_capacity;
            var ventilating_air_temperature = datain.internal_temperature_annual_average;
            break;
        case 'mechanical_from_outside_to_heated_basement':
            var Vrate = datain.ventilation_rate;
            var Vcp = Vrate * this.dataset.air_density * this.dataset.air_heat_capacity;
            var ventilating_air_temperature = external_temperature;
            break;
        case 'mechanical_from_outside_to_unheated_basement':
            if (datain.ventilation_rate_unheated_basement != undefined) {
                var Vrate = datain.ventilation_rate_unheated_basement;
            } else {
                Vrate = this.dataset.default_ventilation_rate_unheated_basement;
            }
            var Vcp = 0.34 * Vrate * datain.basement_volume;
            var ventilating_air_temperature = external_temperature;
            datain.internal_temperature_annual_average = external_temperature + 5; //this random assignment is because we don't need to ask in the UI for the internal temperature but we sitll use it in the calculation of numerator (below), it  doesn't matter what value it has: the fact that ventilating_air_temperature equals external_temperature makes the second part of the numerator calculation equals to 1
            break;
        case 'none':
        default:
            var Vrate = 0;
            var Vcp = 0;
            var ventilating_air_temperature = external_temperature; // Not relevant as it's multiplied by V in the formula, resulting in 0
            datain.internal_temperature_annual_average = external_temperature + 5; //this random assignment is because we don't need to ask in the UI for the internal temperature but we sitll use it in the calculation of numerator (below), it  doesn't matter what value it has: Vcp equals 0 making internal temperature bit of the formula to be 0 as well
            break;
    }
    //4.4- Calculate U-value
    var numerator = datain.area * Ug + datain.height * datain.perimeter * datain.wall_uvalue + Vcp * (datain.internal_temperature_annual_average - ventilating_air_temperature) / (datain.internal_temperature_annual_average - external_temperature);
    var denominator = datain.area * Uf + datain.area * Ug + datain.height * datain.perimeter * datain.wall_uvalue + Vcp;
    var U = Uf * numerator / denominator;

    return U;
};

/********************************************************************
 * Calculates u-value of a slab on ground according to the method in BS EN ISO 13370:2007 (section 9.1)
 * @param datain object with the relevant data to do the calculations
 *      - area: Area  of floor in m2
 *      - perimeter: Exposed perimeter in m
 *      - wall_thickness - Wall thickness in m
 *      - base_insulation_thermal_conductivity: Thermal conductivity (λ) of insulation on the base of the underfloor space in W/m.K
 *      - base_insulation_thickness: in metres
 *      - edge_insulation_underfloor_space: edge insulation is applied around the base of the underfloor space - Options: horizontal, vertical or none
 *      - edge_insulation_thickness: horizontal or vertical edge insulation around the base of the underfloor space in metres
 *      - edge_insulation_length: width of horizontal edge isulation or depth of vertical edge insulation, in metres
 *      - edge_insulation_thermal_conductivity: thermal conductivity due to the type of insulation in W/m.K
 *      - thermal_conductivity_ug: Thermal conductivity of unfrozen ground in W/m.K
 *
 * @returns {number} u-value of the slab on ground floor W/m2.K
 * @see data.dataset
 *
 */
openFUVC.prototype.slab_on_ground = function (datain) {
    // Calculation of B: characteristic dimension
    var B = this.characteristic_dimension(datain.area, datain.perimeter);

    // Calculation of Rf: thermal resistance of the floor slab, including that of any
    // all-over insulation layers above, below or within the floor slab, and that of any floor covering
    if (datain.base_insulation_thickness != undefined && datain.base_insulation_thermal_conductivity != undefined) {
        var Rf = datain.base_insulation_thickness / datain.base_insulation_thermal_conductivity;
    } else {
        var Rf = 0;
    }

    // Calculation of dt: equivalent thickness
    var dt = this.equivalent_thickness(datain.wall_thickness, datain.thermal_conductivity_ug, this.dataset.Rsi_downwards, Rf, this.dataset.Rse_to_subfloor);

    // Calculation U-value of slab on ground
    if (dt < B) {
        // uninsulated and moderately insulated floors
        var U = 2 * datain.thermal_conductivity_ug / (Math.PI * B + dt) * Math.log(1 + Math.PI * B / dt);
    } else {
        // well-insulated floors
        var U = datain.thermal_conductivity_ug / (0.457 * B + dt);
    }

    // U correction due to edge insulation around the base of the underfloor space (B.3)
    if (datain.edge_insulation_underfloor_space != undefined && datain.edge_insulation_underfloor_space != 'none') {
        var Uei = 0;
        if (datain.edge_insulation_underfloor_space == 'horizontal') {
            Uei = 2 / B * this.linear_thermal_transmittance_horizontal_edge_insulation(datain.thermal_conductivity_ug, dt, datain.edge_insulation_length, datain.edge_insulation_thickness, datain.edge_insulation_thermal_conductivity);
        } else if (datain.edge_insulation_underfloor_space == 'vertical') {
            Uei = 2 / B * this.linear_thermal_transmittance_vertical_edge_insulation(datain.thermal_conductivity_ug, dt, datain.edge_insulation_length, datain.edge_insulation_thickness, datain.edge_insulation_thermal_conductivity);
        } else {
            console.error('Edge insulation not valid: ' + datain.edge_insulation_underfloor_space);
            window.alert('Edge insulation not valid: ' + datain.edge_insulation_underfloor_space);
        }
        U = U + Uei;
    }

    return U;
};

/**
 * Calculates u-value of a heated basement according to the method in BS EN ISO 13370:2007 (section 9.3)
 * @param datain object with the relevant data to do the calculations
 *      - area: Area  of floor in m2
 *      - perimeter: Exposed perimeter in m
 *      - wall_thickness - Wall thickness (below floor) in m
 *      - base_insulation_thermal_conductivity: Thermal conductivity (λ) of insulation on the base of the underfloor space in W/m.K
 *      - base_insulation_thickness: in metres
 *      - thermal_conductivity_ug: Thermal conductivity of unfrozen ground in W/m.K
 *      - wall_uvalue: U-value of basement walls (thermal transmittance) in W/m2.K
 *      - depth_of_basement_floor: depth of basement floor below ground level in metres
 *
 * @returns {number} u-value of the slab on ground floor W/m2.K
 * @see data.dataset
 *
 */
openFUVC.prototype.heated_basement = function (datain) {
    // Calculation of B: characteristic dimension
    var B = this.characteristic_dimension(datain.area, datain.perimeter);
    // Calculation of Rf: thermal resistance of the floor slab, including that of any
    // all-over insulation layers above, below or within the floor slab, and that of any floor covering
    if (datain.base_insulation_thickness != undefined && datain.base_insulation_thermal_conductivity != undefined) {
        var Rf = datain.base_insulation_thickness / datain.base_insulation_thermal_conductivity;
    } else {
        var Rf = 0;
    }
    // Calculation of dt: equivalent thickness floor
    var dt = this.equivalent_thickness(datain.wall_thickness, datain.thermal_conductivity_ug, this.dataset.Rsi_downwards, Rf, this.dataset.Rse_to_subfloor);
    // Calculation of dw: equivalent thickness walls
    var dw = this.equivalent_thickness(0, datain.thermal_conductivity_ug, this.dataset.Rsi_horizontal, 1 / datain.wall_uvalue, this.dataset.Rse_to_subfloor);
    // Calculation thermal resistance floor
    var Ubf = this.thermal_transmittance_basement_floor(datain.thermal_conductivity_ug, B, datain.depth_of_basement_floor, dt);
    // Calculation thermal resistance walls
    var Ubw = this.thermal_transmittance_basement_walls(datain.thermal_conductivity_ug, datain.depth_of_basement_floor, dw, dt);
    // Calculation of U-value of a heated basement
    var U = (datain.area * Ubf + datain.depth_of_basement_floor * datain.perimeter * Ubw) / (datain.area + datain.depth_of_basement_floor * datain.perimeter);

    return U;
};

/********************************************************************
 * Calculates u-value of an exposed floor above ground level according to SAP 2012 section 3.3 p.15
 * @param datain object with the relevant data to do the calculations
 *      - floor_deck_layers: array of objects. Each object: {thickness: number, thermal_conductivity_1: number, thermal_conductivity_2: number, length_2: number, spacing: number}
 *      - unheated_space_thermal_resistance: thermal resistance of the unheated space underneath the floor in m2.K/W
 *
 * @returns {number} u-value of exposed floor above ground level in W/m2.K
 *
 */
openFUVC.prototype.exposed_floor_above_GL = function (datain) {
    var Uo = this.thermal_transmittance_floor_deck(datain.floor_deck_layers);
    var Ru = datain.unheated_space_thermal_resistance;
    var U = 1 / (Ru + 1 / Uo);
    return U;
};

/****
 * Calculate characteristic dimension of floor - formula 2 in BS EN ISO 13370:2007
 *
 * @param {Number} area
 * @param {Number} perimeter
 * @returns {Number} characteristic dimension of floor in metres
 */
openFUVC.prototype.characteristic_dimension = function (area, perimeter) {
    return area / (0.5 * perimeter);
};

/***
 * Calculates total equivalent thickness - formulas 3, 7 and 13 in  BS EN ISO 13370:2007
 *
 * @param {number} thickness
 * @param {number} thermal_conductivity_ug - thermal conductivity of unfrozen ground in W/(m·K)
 * @param {number} Rsi - internal surface resistance in m2K/W
 * @param {number} Rf - thermal resistance of floor construction in m2K/W
 * @param {number} Rse - external surface resistance in m2K/W
 * @returns {number} total equivalent thickness in metres
 */
openFUVC.prototype.equivalent_thickness = function (thickness, thermal_conductivity_ug, Rsi, Rf, Rse) {
    var d = thickness + thermal_conductivity_ug * (Rsi + Rf + Rse);
    return d;
};

/**
 * Calculates the thermal transmittance of a floor deck taking into account the different layers. Each layer
 * can be made of one or two materials
 * @param {array} layers - array of objects. Each object is layer of the floor deck defining the thickness of the layer, the thermal conductivity of each material, spacing between joists and lenght of the second material. Each object: {thickness: number, thermal_conductivity_1: number, thermal_conductivity_2: number, length_2: number, spacing: number}
 * @returns {Number} The thermal transmittance of the floor deck in W/(m2 ·K)
 */
openFUVC.prototype.thermal_transmittance_floor_deck = function (layers) {
    var openFUVC = this;
    var Rf = openFUVC.dataset.Rse_to_subfloor; // External surface resistance (this is the bottom layer)
    layers.forEach(function (layer) {
        if (layer.thermal_conductivity_1 == 'unventilated') {
            layer.thermal_conductivity_1 = openFUVC.thermal_resistance_unventilated_layer(layer.thickness);
        }
        if (layer.thermal_conductivity_1 == 'slightly_ventilated') {
            layer.thermal_conductivity_1 = openFUVC.thermal_resistance_slightly_ventilated_layer(layer.thickness);
        }
        var mat1_proportion = (1 - layer.length_2) / layer.spacing;
        var mat2_proportion = layer.length_2 / layer.spacing;
        Rf += mat1_proportion * layer.thickness / layer.thermal_conductivity_1 + mat2_proportion * layer.thickness / layer.thermal_conductivity_2;
    });
    return 1 / Rf;
};

/**
 * Calculates the thermal resistance of an unventilated layer of a deck floor as defined in a table in EN ISO 6946 : 2007
 * That table links the thickness of the layer with the resistance. This method interpolates the value of
 * the resistance for the thickness of the air layer
 *
 * @see openFUVC.dataset.thermal_resistance_unventilated_layer
 * @param {number} thickness of the air layer in m
 * @returns {Number} The thermal resistance of the unventilated layer in m2.K/W
 */
openFUVC.prototype.thermal_resistance_unventilated_layer = function (thickness) {
    var datapoints = this.dataset.thermal_resistance_unventilated_layer;
    var thermal_resistance = 0;
    var calculated = false;
    datapoints.forEach(function (datapoint, index) {
        if (thickness < datapoint[0] && calculated === false) { // the datapoints is a table linking thickness with transmittance, we interpolate  to calculate the transmittance for our specific thickness
            var x = thickness;
            var xa = datapoints[index - 1][0];
            var ya = datapoints[index - 1][1];
            var xb = datapoints[index][0];
            var yb = datapoints[index][1];
            var y = ya + (yb - ya) * (x - xa) / (xb - xa);
            thermal_resistance = y;
            calculated = true;
        }
    });
    if (calculated == false) {
        var thermal_resistance = datapoints[datapoints.length - 1][1];
    }
    return thermal_resistance;
};

/**
 * Calculate the thermal resistance of an slightly ventilated layer of a deck floor as defined in EN ISO 6946 : 2007
 * Ventilation openings (Av) are assumed to be 1000 mm 2 per metre of length
 *
 * @see openFUVC.dataset.thermal_resistance_unventilated_layer
 * @param {Number} thickness of the air layer in m
 * @returns {Number} The thermal resistance of the unventilated layer in m2.K/W
 */
openFUVC.prototype.thermal_resistance_slightly_ventilated_layer = function (thickness) {
    var Av = 1000; // mm 2 per metre of length
    var Rtu = this.thermal_resistance_unventilated_layer(thickness);
    var Rtv = this.dataset.Rsi_downwards;
    var Rt = Rtu * (1500 - Av) / 1000 + Rtv * (Av - 500) / 1000;
    return Rt;
};

/**
 * Calculates the transmittance of a basement floor - section 9.32 in BS EN ISO 13370:2007
 *
 * @param {number} thermal_conductivity_ug - Thermal conductivity of unfrozen ground - W/m.K
 * @param {number} B - characteristic dimension of floor
 * @param {number} depth_of_basement_floor - depth of basement floor below ground level in metres
 * @param {number} dt - total equivalent thickness slab on ground floor in metres
 * @returns {number} transmittance of a basement floor in W/(m2 ·K)
 */
openFUVC.prototype.thermal_transmittance_basement_floor = function (thermal_conductivity_ug, B, depth_of_basement_floor, dt) {
    if (dt + 0.5 * depth_of_basement_floor < B) {
        var Ubf = 2 * thermal_conductivity_ug * Math.log(Math.PI * B / (dt + 0.5 * depth_of_basement_floor)) / (Math.PI + dt + 0.5 * depth_of_basement_floor);
    } else {
        var Ubf = thermal_conductivity_ug / (0.457 * B + dt + 0.5 * depth_of_basement_floor);
    }
    return Ubf;
};

/***
 * Calculates the transmittance of a basement walls - section 9.33 in BS EN ISO 13370:2007
 *
 * @param {number} thermal_conductivity_ug - Thermal conductivity of unfrozen ground - W/m.K
 * @param {number} depth_of_basement_floor - depth of basement floor below ground level in metres
 * @param {number} dw - total equivalent thickness basement wall in metres
 * @param {number} dt - total equivalent thickness slab on ground floor in metres
 * @returns {number} transmittance of a basement wall in W/(m2 ·K)
 */
openFUVC.prototype.thermal_transmittance_basement_walls = function (thermal_conductivity_ug, depth_of_basement_floor, dw, dt) {
    if (dw < dt) {
        dt = dw;
    }
    var Ubw = 2 * thermal_conductivity_ug / Math.PI * depth_of_basement_floor * (1 + 0.5 * dt / (dt + depth_of_basement_floor)) * Math.log(depth_of_basement_floor / dw + 1);
    return Ubw;
};

/**
 *  Calculates the linear thermal transmittance associated with horizonta edge insulation - Section B.2 in BS EN ISO 13370:2007
 * @param {number} thermal_conductivity_ug - Thermal conductivity of unfrozen ground - W/m.K
 * @param {number} dt - total equivalent thickness slab on ground floor in metres
 * @param {number} horizontal_width - width of horizontal edge insulation, in m
 * @param {number} thickness - thickness of the edge insulation (or foundation), in m.
 * @param {number} edge_insulation_thermal_conductivity - thermal conductivity due to the ype of edge insulation in W/m.K
 * @returns {number} thermal transmittance of edge insulation W/(m2 ·K)
 */
openFUVC.linear_thermal_transmittance_horizontal_edge_insulation = function (thermal_conductivity_ug, dt, horizontal_width, thickness, edge_insulation_thermal_conductivity) {
    var Rn = thickness / edge_insulation_thermal_conductivity;
    var d = thermal_conductivity_ug * (Rn - thickness / thermal_conductivity_ug); // equation B.1
    var Pge = thermal_conductivity_ug / Math.PI * (Math.log(1 + horizontal_width / dt) - Math.log(1 + horizontal_width / (dt + d)));
    return Pge;
};

/**
 *  Calculates the linear thermal transmittance associated with vertical edge insulation - Section B.3 in BS EN ISO 13370:2007
 * @param {number} thermal_conductivity_ug - Thermal conductivity of unfrozen ground - W/m.K
 * @param {number} dt - total equivalent thickness slab on ground floor in metres
 * @param {number} vertical_depth - depth of vertical edge insulation, in m
 * @param {number} thickness - thickness of the edge insulation (or foundation), in m.
 * @param {number} edge_insulation_thermal_conductivity - thermal conductivity due to the ype of edge insulation in W/m.K
 * @returns {number} thermal transmittance of edge insulation W/(m2 ·K)
 */
openFUVC.prototype.linear_thermal_transmittance_vertical_edge_insulation = function (thermal_conductivity_ug, dt, vertical_depth, thickness, edge_insulation_thermal_conductivity) {
    var Rn = thickness / edge_insulation_thermal_conductivity;
    var d = thermal_conductivity_ug * (Rn - thickness / thermal_conductivity_ug); // equation B.1
    var Pge = -thermal_conductivity_ug / Math.PI * (Math.log(1 + 2 * vertical_depth / dt) - Math.log(1 + 2 * vertical_depth / (dt + d)));
    return Pge;
};

/**
 *  Calculates the linear thermal transmittance associated with horizontal edge insulation - Section B.3 in BS EN ISO 13370:2007
 * @param {number} thermal_conductivity_ug - Thermal conductivity of unfrozen ground - W/m.K
 * @param {number} dt - total equivalent thickness slab on ground floor in metres
 * @param {number} horizontal_width - width of horizontal edge insulation, in m
 * @param {number} thickness - thickness of the edge insulation (or foundation), in m.
 * @param {number} edge_insulation_thermal_conductivity - thermal conductivity due to the ype of edge insulation in W/m.K
 * @returns {number} thermal transmittance of edge insulation W/(m2 ·K)
 */
openFUVC.prototype.linear_thermal_transmittance_horizontal_edge_insulation = function (thermal_conductivity_ug, dt, horizontal_width, thickness, edge_insulation_thermal_conductivity) {
    var Rn = thickness / edge_insulation_thermal_conductivity;
    var d = thermal_conductivity_ug * (Rn - thickness / thermal_conductivity_ug); // equation B.1
    var Pge = -thermal_conductivity_ug / Math.PI * (Math.log(1 + horizontal_width / dt) - Math.log(1 + horizontal_width / (dt + d)));
    return Pge;
};

/***
 * Calculates annual average external temperature for a given region
 * @param {Number} region
 * @returns {Number} annual average external temperature
 */
openFUVC.prototype.get_external_temperature_annual_average = function (region) {
    var temp = 0;
    this.dataset.external_temperature_monthly_average[region].forEach(function (monthly_average) {
        temp += monthly_average;
    });
    return temp / 12;
};

/***
 * Calculates annual average wind speed for a given region
 * @param {Number} region
 * @returns {Number} annual average wind speed
 */
openFUVC.prototype.get_wind_speed_annual_average = function (region) {
    var temp = 0;
    this.dataset.wind_speed_monthly_average[region].forEach(function (monthly_average) {
        temp += monthly_average;
    });
    return temp / 12;
};

/**
 * Casts relevant properties of the data object to number
 *
 * @param {object} data
 * @returns {object} data object after sanitizing all the numeric properties
 */
openFUVC.prototype.sanitize_data_in = function (data) {
    if (data.region != undefined) {
        data.region = 1.0 * data.region;
    }
    if (data.area != undefined) {
        data.area = 1.0 * data.area;
    }
    if (data.perimeter != undefined) {
        data.perimeter = 1.0 * data.perimeter;
    }
    if (data.height != undefined) {
        data.height = 1.0 * data.height;
    }
    if (data.depth_of_basement_floor != undefined) {
        data.depth_of_basement_floor = 1.0 * data.depth_of_basement_floor;
    }
    if (data.wind_shielding_factor != undefined) {
        data.wind_shielding_factor = 1.0 * data.wind_shielding_factor;
    }
    if (data.wind_speed_annual_average != undefined) {
        data.wind_speed_annual_average = 1.0 * data.wind_speed_annual_average;
    }
    if (data.external_temperature_annual_average != undefined) {
        data.external_temperature_annual_average = 1.0 * data.external_temperature_annual_average;
    }
    if (data.internal_temperature_annual_average != undefined) {
        data.internal_temperature_annual_average = 1.0 * data.internal_temperature_annual_average;
    }
    if (data.wall_thickness != undefined) {
        data.wall_thickness = 1.0 * data.wall_thickness;
    }
    if (data.wall_uvalue != undefined) {
        data.wall_uvalue = 1.0 * data.wall_uvalue;
    }
    if (data.base_insulation_thermal_conductivity != undefined) {
        data.base_insulation_thermal_conductivity = 1.0 * data.base_insulation_thermal_conductivity;
    }
    if (data.base_insulation_thickness != undefined) {
        data.base_insulation_thickness = 1.0 * data.base_insulation_thickness;
    }
    if (data.edge_insulation_thickness != undefined) {
        data.edge_insulation_thickness = 1.0 * data.edge_insulation_thickness;
    }
    if (data.edge_insulation_length != undefined) {
        data.edge_insulation_length = 1.0 * data.edge_insulation_length;
    }
    if (data.edge_insulation_length != undefined) {
        data.edge_insulation_length = 1.0 * data.edge_insulation_length;
    }
    if (data.edge_insulation_thermal_conductivity != undefined) {
        data.edge_insulation_thermal_conductivity = 1.0 * data.edge_insulation_thermal_conductivity;
    }
    if (data.thermal_conductivity_ug != undefined) {
        data.thermal_conductivity_ug = 1.0 * data.thermal_conductivity_ug;
    }
    if (data.ventilation_rate != undefined) {
        data.ventilation_rate = 1.0 * data.ventilation_rate;
    }
    if (data.ventilation_rate_unheated_basement != undefined) {
        data.ventilation_rate_unheated_basement = 1.0 * data.ventilation_rate_unheated_basement;
    }
    if (data.basement_volume != undefined) {
        data.basement_volume = 1.0 * data.basement_volume;
    }
    if (data.depth_of_basement_floor != undefined) {
        data.depth_of_basement_floor = 1.0 * data.depth_of_basement_floor;
    }
    if (data.floor_deck_layers != undefined) {
        data.floor_deck_layers.forEach(function (layer) {
            if (layer.thermal_conductivity_1 != 'unventilated' && layer.thermal_conductivity_1 != 'slightly_ventilated') {
                layer.thermal_conductivity_1 = 1.0 * layer.thermal_conductivity_1;
            }
            layer.thermal_conductivity_2 = 1.0 * layer.thermal_conductivity_2;
            layer.length_2 = 1.0 * layer.length_2;
            layer.spacing = 1.0 * layer.spacing;
        });
    }
    if (data.unheated_space_thermal_resistance != undefined) {
        data.unheated_space_thermal_resistance = 1.0 * data.unheated_space_thermal_resistance;
    }
    if (data.area_ventilation_openings != undefined) {
        data.area_ventilation_openings = 1.0 * data.area_ventilation_openings;
    }

    return data;
};

var openFUVC_dataset = {
    Rsi_downwards: 0.17, // Internal surface resistance (heat flow downwards) - m2.K/W
    Rsi_horizontal: 0.13, // Internal surface resistance (heat flow horizontal) - m2.K/W
    Rsi_upwards: 0.1, // Internal surface resistance (heat flow upwards) - m2.K/W
    Rse_to_subfloor: 0.04, // External Surface Resistance (e.g. to subfloor) - m2.K/W
    Rse_below_ground: 0, // Thermal Resistance of below ground Exterior Surface (where immediately touching ground) - m2.K/W
    air_heat_capacity: 1000, // specific heat capacity of air at constant pressure, in J/(kg·K)
    air_density: 1.23, // the density of air, in kg/m3
    default_ventilation_rate_unheated_basement: 0.3, // default ventilation rate of an unheated basement, in air changes per hour
    thermal_conductivity_ug: {// Thermal conductivity of unfrozen ground (source: p.5, BS EN ISO 13370:2007) - W/m.K
        clay_or_silt: ['Clay or silt (1.5)', 1.5],
        sand_or_gravel: ['Sand or gravel (2.0)', 2.0],
        homogeneus_rock: ['Homogenous rock (3.5)', 3.5],
        unknown: ['Unknown (2.0)', 2.0]
    },
    heat_capacity: {// Heat capacity per volume (source: p.5, BS EN ISO 13370:2007) - J/m3K
        clay_or_silt: 3000000,
        sand_or_gravel: 2000000,
        homogeneus_rock: 2000000,
        unknown: 2000000
    },
    wind_shielding_factor: {// fw (source p.11,BS EN ISO 13370:2007)
        sheltered: ['Sheltered - eg. city centre (0.02)', 0.02],
        average: ['Average - eg. suburban (0.05)', 0.05],
        exposed: ['Exposed - eg. rural (0.1)', 0.1]
    },
    ventilation_openings: {// Ventilation openings per m exposed perimeter - m2/m
        minimal_or_partially_blocked: ['Minimal or partially blocked', 0.0015],
        standard: ['Standard', 0.003],
        well_ventilated: ['Well ventilated', 0.0045]
    },
    wall_uvalue: {// U-value of walls to underfloor space (thermal conductivity) -W/m2.K - (note this is itself a simplification/assumption - would be possible to also calculate U-value here, but felt this would over-complicate things)
        usm_greater500: ['Uninsulated solid masonry wall >500mm (1.7)', 1.7],
        usm_300_500: ['Uninsulated solid masonry wall 300-500mm (2.1)', 2.1],
        usm_200_300: ['Uninsulated solid masonry wall 200-300mm (1.8)', 1.8],
        ucw: ['Uninsulated cavity wall (1.6)', 1.6],
        icw: ['Insulated cavity wall (0.5)', 0.5],
        smw_75_100_EWI: ['Solid masonry wall with 75-100mm EWI (0.4)', 0.4],
        smw_200_EWI: ['Solid masonry wall with 200mm EWI (0.2)', 0.2],
        fcw_100_EWI: ['Filled cavity wall wall with 100mm EWI (0.2)', 0.2],
        smw_IWI: ['Solid masonry wall with IWI (0.4)', 0.4] // This is a pretty unlikely specification - you'd almost never put internal wall insulation in a sub-floor void. Including it for completeness.
    },
    insulation_conductivity: {// Insulation thermal conductivity (W/m.K)
        granular_insulation: ['Granular insulation - technopor, misapor or similar (0.1)', 0.1],
        rigid_glass_foam: ['Rigid glass foam (0.05)', 0.05],
        fibre_insulation: ['Fibre insulation - glasswool, mineral fibre, woodfibre, etc. (0.04)', 0.04],
        eps: ['Polystyrene foam boards - EPS (0.04)', 0.04],
        xps: ['Polystyrene foam boards - XPS (0.035)', 0.035],
        rigid_foam_boards: ['Rigid foam boards - phenolic/PU/PIR (0.025)', 0.025],
        very_high_performance: ['Very high performance - aerogel, VIPs, etc. (0.015)', 0.015],
        unknown: ['Unknown (0.04)', 0.04],
        none: ['None', 'none']
    },
    edge_insulation_underfloor_space: {
        horizontal: ['Horizontal', 'horizontal'],
        vertical: ['Vertical', 'vertical'],
        none: ['None', 'none']
    },
    ventilation_type: {
        natural: ['Natural', 'natural'],
        mechanical_from_inside: ['Mechanical from inside', 'mechanical_from_inside'],
        mechanical_from_outside_to_heated_basement: ['Mechanical from outside to heated basement', 'mechanical_from_outside_to_heated_basement'],
        mechanical_from_outside_to_unheated_basement: ['Mechanical from outside to unheated basement', 'mechanical_from_outside_to_unheated_basement'],
        none: ['None', 'none']
    },
    floor_deck: {
        structural_elements: {
            softwood: ['Soft wood (0.13)', 0.13],
            hardwood: ['Hard wood (0.18)', 0.18],
            chipboard_plywood_OSB_MDF: ['Chipboard, plywood, OSB or MDF (0.13)', 0.13],
            cement_screed: ['Cement screed (1.4)', 1.4],
            concrete_blockwork: ['Concrete blockwork (0.3)', 0.3],
            reinforced_concrete_beams: ['Reinforced concrete beams (2.1)', 2.1]
        },
        insulation: {
            granular: ['Granular insulation - technopor, misapor or similar (0.1)', 0.1],
            rigid: ['Rigid glass foam (0.05)', 0.05],
            fibre: ['Fibre insulation - glasswool, mineral fibre, woodfibre etc (0.04)', 0.04],
            EPS: ['Polystyrene foam boards - EPS (0.04)', 0.04],
            XPS: ['Polystyrene foam boards - XPS (0.035)', 0.035],
            rigid_foam_boards: ['Rigid foam boards - phenolic/PU/PIR (0.25)', 0.025],
            very_high_performance: ['Very high performance - aerogel, VIPs, etc. (0.015)', 0.015],
            unknown: ['Unknown', 0.04],
        },
        finishes: {
            gypsum_plasterboard_or_cement_particle_board: ['Gypsum plasterboard or cement particle board (0.25)', 0.25],
            chipboard_plywood_OSB_MDF: ['Chipboard, plywood, OSB or MDF (0.13)', 0.13],
            fermacell: ['Fermacell (0.32)', 0.32],
            woodfibre_sheathing_board: ['Woodfibre sheathing board (0.1)', 0.1],
            magnesium_oxide_board: ['Magnesium oxide board (0.4)', 0.4]
        },
        air_gaps: {
            unventilated: ['Still air gap', 'unventilated'],
            slightly_ventilated: ['Slightly ventilated air-gap', 'slightly_ventilated']
        }
    },
    unheated_space_thermal_resistance: {// Thermal resistance in m2.K/W - source SAP2012 - p16
        'Floor above single internal garage, inside thermal envelope, connected side wall, floor and end wall': ['Floor above single internal garage, inside thermal envelope, connected side wall, floor and end wall (0.68)', 0.68],
        'Floor above single internal garage, inside thermal envelope, connected side wall and floor only': ['Floor above single internal garage, inside thermal envelope, connected side wall and floor only (0.54)', 0.54],
        'Floor above single interal garage, inside thermal envelope, connected side wall and floor only, displaced forward': ['Floor above single interal garage, inside thermal envelope, connected side wall and floor only, displaced forward (0.33)', 0.33],
        'Floor above single internal garage, outside thermal envelope, connected side wall and floor only': ['Floor above single internal garage, outside thermal envelope, connected side wall and floor only (0.25)', 0.25],
        'Floor above single interal garage, outside thermal envelope, connected side wall and floor only, displaced forward': ['Floor above single interal garage, outside thermal envelope, connected side wall and floor only, displaced forward (0.26)', 0.26],
        'Floor above single interal garage, outside thermal envelope': ['Floor above single interal garage, outside thermal envelope (0.68)', 0.68],
        'Floor above garage inside thermal envelope': ['Floor above garage inside thermal envelope (0.25)', 0.25],
        'Floor above entance porch or similar': ['Floor above entance porch or similar (0.3)', 0.3],
        'Floor above stairwell': ['Floor above stairwell (0.82)', 0.82],
        'Floor above communal access corridor, facing wall exposed': ['Floor above communal access corridor, facing wall exposed (0.31)', 0.31],
        'Floor above communal access corridor, facing wall not exposed': ['Floor above communal access corridor, facing wall not exposed (0.43)', 0.43]
    },
    thermal_resistance_unventilated_layer: [// First dimension is thickness, second thermal resistance in m2.K/W (source EN ISO 6946 : 2007)
        [0, 0],
        [0.005, 0.11],
        [0.007, 0.13],
        [0.010, 0.15],
        [0.015, 0.17],
        [0.025, 0.19],
        [0.050, 0.21],
        [0.100, 0.22],
        [0.300, 0.23]
    ],
    regions: [//List of regions, this dataset is important as its index corresponds with external_temperature_annual_average
        // UK regions -  Source  SAP2012
        'UK average',
        'Thames',
        'South East England',
        'Southern England',
        'South West England',
        'Severn Wales / Severn England',
        'Midlands',
        'West Pennines Wales / West Pennines England.',
        'North West England / South West Scotland',
        'Borders Scotland / Borders England',
        'North East England',
        'East Pennines',
        'East Anglia',
        'Wales',
        'West Scotland',
        'East Scotland',
        'North East Scotland',
        'Highland',
        'Western Isles',
        'Orkney',
        'Shetland',
        'Northern Ireland',
        // USA regions
        /*"Hot-Humid (Miami, FL)",     //"IECC Region 1A",
                 "Hot-Humid (Houston, TX)" ,     //"IECC Region 2A",
                 "Hot/Mixed-Humid (Atlanta, GA)",  //"IECC Region 3A",
                 "Mixed-Humid (Baltimore, MD)",   //"IECC Region 4A",
                 "Cold (Chicago, IL)" ,   //"IECC Region 5A",
                 "Cold (Minneapolis, MN)",    //"IECC Region 6A",
                 "Hot-Dry (Phoenix, AZ)", //"IECC Region 2B",
                 "Hot-Dry (CA) (Los Angeles, CA)", //"IECC Region 3B-CA",
                 "Hot-Dry (Las Vegas, NV)",    //"IECC Region 3B-Other",
                 "Mixed-Dry (Albuquerque, NM)",   //"IECC Region 4B",
                 "Cold (Boulder, CO)",    //"IECC Region 5B",
                 "Cold (Helena, MT)", //"IECC Region 6B",
                 "Mixed-Marine (San Francisco, CA)"  //"IECC Region 3C",
                 "Marine (Seattle, WA)",  //"IECC Region 4C",
                 "Very Cold (Duluth, MN)",    //"IECC Region 7",
                 "Arctic (Fairbanks, AK)"    //"IECC Region 8"*/
        // for USA regions:
        // a) https://www1.eere.energy.gov/buildings/publications/pdfs/building_america/4_3a_ba_innov_buildingscienceclimatemaps_011713.pdf
        // b) https://energy.gov/sites/prod/files/2015/10/f27/ba_climate_region_guide_7.3.pdf
        // c) http://en.openei.org/wiki/Commercial_Reference_Buildings
    ],
    /************************************************
     * external_temperature_monthly_average
     * Mean external temperature: these data are for typical height above sea level of the regions in datasets.regions
     *  - Units: ˚C
     *  - First dimension: region
     *  - Second dimension: month
     *  - Source: SAP2012, appendix U1, p. 172     *
     */
    external_temperature_monthly_average: [
        // UK regions
        [4.3, 4.9, 6.5, 8.9, 11.7, 14.6, 16.6, 16.4, 14.1, 10.6, 7.1, 4.2],
        [5.1, 5.6, 7.4, 9.9, 13.0, 16.0, 17.9, 17.8, 15.2, 11.6, 8.0, 5.1],
        [5.0, 5.4, 7.1, 9.5, 12.6, 15.4, 17.4, 17.5, 15.0, 11.7, 8.1, 5.2],
        [5.4, 5.7, 7.3, 9.6, 12.6, 15.4, 17.3, 17.3, 15.0, 11.8, 8.4, 5.5],
        [6.1, 6.4, 7.5, 9.3, 11.9, 14.5, 16.2, 16.3, 14.6, 11.8, 9.0, 6.4],
        [4.9, 5.3, 7.0, 9.3, 12.2, 15.0, 16.7, 16.7, 14.4, 11.1, 7.8, 4.9],
        [4.3, 4.8, 6.6, 9.0, 11.8, 14.8, 16.6, 16.5, 14.0, 10.5, 7.1, 4.2],
        [4.7, 5.2, 6.7, 9.1, 12.0, 14.7, 16.4, 16.3, 14.1, 10.7, 7.5, 4.6],
        [3.9, 4.3, 5.6, 7.9, 10.7, 13.2, 14.9, 14.8, 12.8, 9.7, 6.6, 3.7],
        [4.0, 4.5, 5.8, 7.9, 10.4, 13.3, 15.2, 15.1, 13.1, 9.7, 6.6, 3.7],
        [4.0, 4.6, 6.1, 8.3, 10.9, 13.8, 15.8, 15.6, 13.5, 10.1, 6.7, 3.8],
        [4.3, 4.9, 6.5, 8.9, 11.7, 14.6, 16.6, 16.4, 14.1, 10.6, 7.1, 4.2],
        [4.7, 5.2, 7.0, 9.5, 12.5, 15.4, 17.6, 17.6, 15.0, 11.4, 7.7, 4.7],
        [5.0, 5.3, 6.5, 8.5, 11.2, 13.7, 15.3, 15.3, 13.5, 10.7, 7.8, 5.2],
        [4.0, 4.4, 5.6, 7.9, 10.4, 13.0, 14.5, 14.4, 12.5, 9.3, 6.5, 3.8],
        [3.6, 4.0, 5.4, 7.7, 10.1, 12.9, 14.6, 14.5, 12.5, 9.2, 6.1, 3.2],
        [3.3, 3.6, 5.0, 7.1, 9.3, 12.2, 14.0, 13.9, 12.0, 8.8, 5.7, 2.9],
        [3.1, 3.2, 4.4, 6.6, 8.9, 11.4, 13.2, 13.1, 11.3, 8.2, 5.4, 2.7],
        [5.2, 5.0, 5.8, 7.6, 9.7, 11.8, 13.4, 13.6, 12.1, 9.6, 7.3, 5.2],
        [4.4, 4.2, 5.0, 7.0, 8.9, 11.2, 13.1, 13.2, 11.7, 9.1, 6.6, 4.3],
        [4.6, 4.1, 4.7, 6.5, 8.3, 10.5, 12.4, 12.8, 11.4, 8.8, 6.5, 4.6],
        [4.8, 5.2, 6.4, 8.4, 10.9, 13.5, 15.0, 14.9, 13.1, 10.0, 7.2, 4.7],
        // USA regions
        /*[20.3, 21.1, 22.5, 24.2, 26.6, 28.0, 28.8, 28.9, 28.3, 26.5, 23.8, 21.3],
                 [11.9, 13.8, 16.9, 20.7, 24.9, 27.7, 28.9, 28.9, 26.3, 21.6, 16.5, 12.3],
                 [6.9, 8.7, 12.7, 16.9, 21.4, 25.1, 26.8, 26.4, 23.2, 17.3, 12.3, 7.6],
                 [1.5, 2.4, 7.0, 12.5, 17.7, 22.9, 25.4, 24.4, 20.3, 13.7, 8.4, 3.0],
                 [-3.9, -2.1, 3.5, 9.6, 15.2, 20.7, 23.4, 22.5, 18.3, 11.5, 4.8, -1.9],
                 [-8.6, -6.2, 0.6, 8.7, 15.2, 20.7, 23.1, 21.7, 16.9, 9.5, 1.2, -6.1],
                 [13.6, 15.4, 18.6, 22.6, 27.7, 32.7, 34.9, 34.1, 31.4, 25.0, 18.0, 13.0],
                 [14.6, 14.6, 16.0, 16.8, 19.0, 20.7, 22.9, 23.1, 22.4, 19.8, 17.0, 14.2],
                 [9.2, 11.0, 15.4, 18.8, 25.3, 30.0, 33.9, 32.0, 28.0, 20.5, 13.8, 8.5],
                 [3.1, 5.8, 9.4, 13.8, 19.1, 24.1, 25.8, 24.6, 20.9, 14.7, 7.6, 2.7],
                 [0.2, 1.3, 5.7, 10.0, 15.1, 20.7, 22.8, 21.9, 17.4, 10.9, 3.8, -0.9],
                 [-5.1, -2.7, 2.2, 7.1, 12.1, 16.6, 20.9, 19.9, 14.6, 7.7, 0.6, -5.1],
                 [10.9, 12.7, 14.2, 15.6, 16.1, 17.4, 18.1, 18.5, 18.4, 17.8, 14.5, 10.9],
                 [5.9, 6.8, 8.7, 11.0, 14.3, 16.8, 19.6, 19.7, 17.1, 12.3, 8.2, 5.3],
                 [-11.5, -9.4, -3.1, 4.3, 10.8, 15.8, 18.7, 18.0, 13.3, 6.2, -1.6, -8.9],
                 [-2.1, -22.5, -17.8, -11.6, 1.0, 10.0, 16.1, 17.2, 13.8, 7.5, -4.0, -16.2, -20.1]*/
        // References for USA regions
        // a) http://ashrae-meteo.info/  1986-2010 for monthly temperature average temp (C)
    ],
    /************************************************
     * wind_speed_monthly_average
     * Wind speed (m/s) for calculation of infiltration rate         *
     *  - Units: m/s
     *  - First dimension: region
     *  - Second dimension: month
     *  - Source: SAP2012, appendix U2, p. 173         *
     */
    wind_speed_monthly_average: [
        // Uk regions
        [5.1, 5.0, 4.9, 4.4, 4.3, 3.8, 3.8, 3.7, 4.0, 4.3, 4.5, 4.7],
        [4.2, 4.0, 4.0, 3.7, 3.7, 3.3, 3.4, 3.2, 3.3, 3.5, 3.5, 3.8],
        [4.8, 4.5, 4.4, 3.9, 3.9, 3.6, 3.7, 3.5, 3.7, 4.0, 4.1, 4.4],
        [5.1, 4.7, 4.6, 4.3, 4.3, 4.0, 4.0, 3.9, 4.0, 4.5, 4.4, 4.7],
        [6.0, 5.6, 5.6, 5.0, 5.0, 4.4, 4.4, 4.3, 4.7, 5.4, 5.5, 5.9],
        [4.9, 4.6, 4.7, 4.3, 4.3, 3.8, 3.8, 3.7, 3.8, 4.3, 4.3, 4.6],
        [4.5, 4.5, 4.4, 3.9, 3.8, 3.4, 3.3, 3.3, 3.5, 3.8, 3.9, 4.1],
        [4.8, 4.7, 4.6, 4.2, 4.1, 3.7, 3.7, 3.7, 3.7, 4.2, 4.3, 4.5],
        [5.2, 5.2, 5.0, 4.4, 4.3, 3.9, 3.7, 3.7, 4.1, 4.6, 4.8, 4.7],
        [5.2, 5.2, 5.0, 4.4, 4.1, 3.8, 3.5, 3.5, 3.9, 4.2, 4.6, 4.7],
        [5.3, 5.2, 5.0, 4.3, 4.2, 3.9, 3.6, 3.6, 4.1, 4.3, 4.6, 4.8],
        [5.1, 5.0, 4.9, 4.4, 4.3, 3.8, 3.8, 3.7, 4.0, 4.3, 4.5, 4.7],
        [4.9, 4.8, 4.7, 4.2, 4.2, 3.7, 3.8, 3.8, 4.0, 4.2, 4.3, 4.5],
        [6.5, 6.2, 5.9, 5.2, 5.1, 4.7, 4.5, 4.5, 5.0, 5.7, 6.0, 6.0],
        [6.2, 6.2, 5.9, 5.2, 4.9, 4.7, 4.3, 4.3, 4.9, 5.4, 5.7, 5.4],
        [5.7, 5.8, 5.7, 5.0, 4.8, 4.6, 4.1, 4.1, 4.7, 5.0, 5.2, 5.0],
        [5.7, 5.8, 5.7, 5.0, 4.6, 4.4, 4.0, 4.1, 4.6, 5.2, 5.3, 5.1],
        [6.5, 6.8, 6.4, 5.7, 5.1, 5.1, 4.6, 4.5, 5.3, 5.8, 6.1, 5.7],
        [8.3, 8.4, 7.9, 6.6, 6.1, 6.1, 5.6, 5.6, 6.3, 7.3, 7.7, 7.5],
        [7.9, 8.3, 7.9, 7.1, 6.2, 6.1, 5.5, 5.6, 6.4, 7.3, 7.8, 7.3],
        [9.5, 9.4, 8.7, 7.5, 6.6, 6.4, 5.7, 6.0, 7.2, 8.5, 8.9, 8.5],
        [5.4, 5.3, 5.0, 4.7, 4.5, 4.1, 3.9, 3.7, 4.2, 4.6, 5.0, 5.0],
        // USA regions
        /*[4.2, 4.5, 4.6, 4.7, 4.2, 3.7, 3.5, 3.5, 3.6, 4.1, 4.3, 4.1],
                 [3.6, 4.0, 4.0, 4.0, 3.6, 3.6, 3.1, 2.7, 3.1, 3.1, 3.6, 3.6],
                 [4.6, 4.7, 4.9, 4.5, 3.9, 3.6, 3.4, 3.3, 3.6, 3.8, 4.1, 4.4],
                 [4.5, 4.5, 4.9, 4.9, 4.0, 3.6, 3.6, 3.6, 3.6, 4.0, 4.0, 4.0],
                 [5.4, 5.4, 5.4, 5.4, 4.9, 4.0, 4.0, 3.6, 4.0, 4.5, 4.9, 4.9],
                 [4.9, 4.5, 4.9, 5.4, 4.9, 4.9, 4.5, 4.0, 4.5, 4.9, 4.9, 4.5],
                 [2.2, 2.7, 3.1, 3.1, 3.1, 3.1, 3.1, 3.1, 2.7, 2.7, 2.2, 2.2],
                 [3.1, 3.1, 3.6, 4.0, 3.6, 3.6, 3.6, 3.6, 3.1, 3.1, 3.1, 3.1],
                 [3.1, 4.0, 4.9, 4.9, 5.4, 4.9, 4.9, 4.5, 4.0, 3.6, 3.6, 3.1],
                 [3.6, 4.0, 4.5, 4.9, 4.5, 4.5, 4.0, 3.6, 3.6, 3.6, 3.6, 3.6],
                 [4.5, 4.5, 4.5, 4.9, 4.5, 4.5, 4.0, 4.0, 4.0, 4.5, 4.0, 4.5],
                 [3.1, 3.1, 3.6, 4.0, 4.0, 4.0, 3.6, 3.1, 3.1, 3.1, 3.1, 3.1],
                 [3.6, 4.0, 4.9, 5.8, 6.3, 6.3, 6.3, 5.8, 5.4, 4.5, 3.6, 3.6],
                 [4.5, 4.5, 4.5, 4.5, 4.0, 4.0, 3.6, 3.6, 3.6, 4.0, 4.0, 4.5],
                 [5.4, 5.4, 5.4, 5.8, 5.4, 4.9, 4.5, 4.5, 4.9, 5.4, 5.4, 5.4],
                 [1.3, 1.8, 2.2, 2.7, 3.6, 3.1, 3.1, 2.7, 2.7, 2.2, 1.8, 1.3] */
    ],
};
