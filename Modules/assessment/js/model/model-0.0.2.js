/*

 An open source building energy model based on SAP.

 Studying the SAP model we see that the calculations can be broken down into sub
 calculation modules and that it could be possible to create a flexible model where
 you can include or exclude certain parts depending on the granularity or adherance
 to SAP that you would like.

 Principles

 - All variables that are accessed in the ui need to be available via the data object.

 - Variables written to from one module and accessed from another need to be in the
 global name space.

 - Variables used internally by a module that are also accessed in the ui should be
 defined within the module namespace.

 - Variables used internally by a module that are not accessed by the ui should be
 defined as local variables within the module's calc function.

 - variable naming: this_is_a_variable. _ between words. Abreviations can be in capitals
 otherwise lower case.

 - if the module has a primary data object i.e floors call the module by the data object
 name.

 - calc functions should be divided by task.


 */

// encapsulated style of construction for calling
var calc = function()
{
    /*
     * A function which adds default values onto an object from another object.
     * For example, saying add_defaults({}, {a:1}), will modify the first argument
     * to have property 'a' with value '1'. Calling add_defaults({a:2}, {a:1}) will 
     * have no effect on the first argument, as 'a' is already specified.
     * The function is recursive on the local properties of things to add, so for example
     * add_defaults({a:{b:1}}, {a:{c:3}}) will result in the object {a:{b:1, c:3}}.
     */
    var add_defaults = function(data, add)
    {
        Object.keys(add).forEach(function(key) {
            if (!(key in data)) {
                data[key] = add[key];
            } else {
                add_defaults(data[key], add[key]);
            }
        });
        
        return data;
    };

    /*
     * Given an object, return an array containing the values of all the properties
     * on that object; for example
     * values({a:[1,2,3], b:foo}) => [[1,2,3], foo]
     */
    var values = function(object) {
        return Object.keys(object).map(function(key) {return object[key];});
    };

    var add = function(a, b) {return a+b;};
    var sub = function(a, b) {return a-b;};
    var mul = function(a, b) {return a*b;};

    /*
     * Given a binary function f, return a function which takes two arrays
     * and returns a new array produced by applying f to each pair from the arrays.
     * For example pointwise(add)([1,2,3], [4,5,6]) => [5,7,9]
     */
    var pointwise = function(f) {
        return function(a, b) {
            var out = [];
            for (var x = 0; x<x.length && x<b.length; x++) {
                out.push(f(a[x], b[x]));
            }
            return out;
        };
    };

    var v_add = pointwise(add);
    var v_sub = pointwise(sub);
    var v_mul = pointwise(mul);
    var watts_to_kwh = function(watts) {return watts * 0.024;};
    
    var run = function(data)
    {
        start(data);
        floors(data);
        occupancy(data);
        fabric(data);
        ventilation(data);

        LAC(data);
        water_heating(data);
        SHW(data);
        appliancelist(data);
        generation(data);
        currentenergy(data);

        temperature(data);
        space_heating(data);
        energy_systems(data);
        SAP(data);

        data.totalWK = data.fabric.total_heat_loss_WK + data.ventilation.average_WK;
        
        data.primary_energy_use_m2 = data.primary_energy_use/data.TFA;
        data.kgco2perm2 = data.annualco2/data.TFA;
        data.kwhdpp = (data.energy_use/365.0)/data.occupancy;
        data.primarykwhdpp = (data.primary_energy_use/365.0)/data.occupancy;
        
        return data;
    };

    var start = function(data) {
        data = data || {}

        add_defaults(data,
                     {region:0,
                      altitude:0,
                      household:0});
        
        data.num_of_floors = 0;
        data.TFA = 0;
        data.volume = 0;
        data.occupancy = 0;

        data.internal_temperature = [18,18,18,18,18,18,18,18,18,18,18,18];
        data.external_temperature = [10,10,10,10,10,10,10,10,10,10,10,10];
        data.losses_WK = {};
        data.gains_W = {};

        data.energy_requirements = {};
        data.total_cost = 0;
        data.total_income = 0;
        data.primary_energy_use = 0;
        data.kgco2perm2 = 0;
        data.primary_energy_use_bills = 0;
        data.fabric_energy_efficiency = 0;

        data.totalWK = 0;
    };


    //---------------------------------------------------------------------------------------------
    // FLOORS
    // Module Inputs:  this.data.floors
    // Global Outputs: this.data.TFA, this.data.volume, this.data.num_of_floors
    //---------------------------------------------------------------------------------------------

    var floors = function(data)
    {
        add_defaults(data, {floors:[]});
        
        data.floors.forEach(
            function(floor)
            {
                floor.volume = floor.area * floor.height;
                data.TFA += floor.area;
                data.volume += floor.volume;
                data.num_of_floors++;
            });
    }

    //---------------------------------------------------------------------------------------------
    // OCCUPANCY
    // SAP calculation of occupancy based on total floor area
    // Global inputs:  this.data.TFA
    // Global outputs: this.data.occupancy
    //---------------------------------------------------------------------------------------------

    var occupancy = function(data)
    {
        add_defaults(data, {use_custom_occupancy: false,
                            custom_occupancy: 1});

        if (data.use_custom_occupancy) {
            data.occupancy = data.custom_occupancy;
        } else if (data.TFA > 13.9) {
            data.occupancy = 1 + 1.76 * (1 - Math.exp(-0.000349 * Math.pow((data.TFA -13.9),2))) + 0.0013 * (data.TFA - 13.9);
        } else {
            data.occupancy = 1;
        }
    }
    
    //---------------------------------------------------------------------------------------------
    // BUILDING FABRIC
    // Calculates total monthly fabric heat loss and monthly solar gains from building elements list
    // Module Inputs:  this.data.fabric.elements
    // Global Inputs:  this.data.TFA
    // Global Outputs: this.data.TMP, this.data.losses_WK.fabric, this.data.gains_W.solar
    // Uses external function: calc_solar_gains_from_windows
    //---------------------------------------------------------------------------------------------

    var fabric = function(data)
    {
        add_defaults(data,
                     {fabric: {elements: [],
                               // QUESTION: table S13 has more factors, based on age band
                               thermal_bridging_yvalue: 0.15}});
        
        data.fabric.total_heat_loss_WK = 0;
        data.fabric.total_thermal_capacity = 0;

        data.fabric.total_floor_WK = 0;
        data.fabric.total_wall_WK = 0;
        data.fabric.total_roof_WK = 0;
        data.fabric.total_window_WK = 0;

        data.fabric.annual_solar_gain = 0;

        data.fabric.total_external_area = 0;

        data.fabric.total_wall_area = 0;
        data.fabric.total_floor_area = 0;
        data.fabric.total_roof_area = 0;
        data.fabric.total_window_area = 0;
        // Solar gains
        var sum = 0;
        var gains = [0,0,0,0,0,0,0,0,0,0,0,0];

        // assign areas to each element
        data.fabric.elements.forEach(
            function(element) {
                if (typeof element.l === 'number' && typeof element.h === 'number') {
                    element.area = element.l * element.h;
                }
                if (typeof element.area !== 'number') {
                    element.area = 0;
                }
                element.netarea = element.area;
            }
        );

        // net off window areas from things which have windows in them
        data.fabric.elements.forEach(
            function(element) {
                if (element.type === 'window' && typeof element.subtractfrom === 'number') {
                    var subtractfrom = data.fabric.elements[element.subtractfrom];
                    if (typeof subtractfrom.windowarea !== 'number') {
                        subtractfrom.windowarea = 0;
                    }
                    subtractfrom.windowarea += element.area;
                    subtractfrom.netarea -= element.area;
                }
            }
        );

        // compute the heat loss for each element, now we know the net areas
        data.fabric.elements.forEach(function(element)
        {
            element.wk = element.netarea * element.uvalue;
            data.fabric.total_heat_loss_WK += element.wk;

            // By checking that the u-value is not 0 = internal walls we can calculate total external area
            if (element.uvalue != 0) {
                data.fabric.total_external_area += element.netarea;
            }

            switch (element.type) {
                case: 'floor'
                data.fabric.total_floor_WK += element.wk;
                data.fabric.total_floor_area += element.netarea;
                break;
            case 'wall':
                data.fabric.total_wall_WK += element.wk;
                data.fabric.total_wall_area += element.netarea;
                break;
            case 'roof':
                data.fabric.total_roof_WK += element.wk;
                data.fabric.total_roof_area += element.netarea;
                break;
            case 'window':
                data.fabric.total_window_WK += element.wk;
                data.fabric.total_window_area += element.netarea;
                break;
            default:
                console.warn('unknown element type', element.type, element);
            }
            
            // Calculate total thermal capacity
            if (element.kvalue != 0) {
                /// QUESTION: should this have been element.area, or should it be net area?
                ///           I have changed it to net area, as I don't think the windows in a wall contribute
                ///           to its k-value.
                data.fabric.total_thermal_capacity += element.kvalue * element.netarea;
            }

            if (element.type == 'window')
            {
                var orientation = element['orientation'];
                var area = element['area'];
                var overshading = element['overshading'];
                var g = element['g'];
                var ff = element['ff'];

                var gain = 0;

                // Access factor table: first dimention is shading factor, 2nd in winter, summer.
                var table_6d = [[0.3,0.5],[0.54,0.7],[0.77,0.9],[1.0,1.0]];

                // The gains for a given window are calculated for each month
                // the result of which needs to be put in a bin for totals for jan, feb etc..
                for (var month=0; month<12; month++)
                {
                    // access factor is time of year dependent
                    // Summer months: 5:June, 6:July, 7:August and 8:September (where jan = month 0)
                    var summer = (month >= 5 && month <= 8) ? 0 : 1;
                    var access_factor = table_6d[overshading][summer];

                    // Map orientation code from window to solar rad orientation codes.
                    if (orientation == 5) orientation = 3; // SE/SW
                    if (orientation == 6) orientation = 2; // East/West
                    if (orientation == 7) orientation = 1; // NE/NW

                    var gain_month = access_factor * area * solar_rad(data.region,orientation,90,month) * 0.9 * g * ff;
                    gains[month] += gain_month;
                    gain += gain_month;
                }

                var accessfactor = [0.5, 0.67, 0.83, 1.0];
                sum += 0.9 * area * g * ff * accessfactor[overshading];
                element.gain = gain / 12.0;
                data.fabric.annual_solar_gain += element.gain;
            }
        });

        data.fabric.thermal_bridging_heat_loss = data.fabric.total_external_area * data.fabric.thermal_bridging_yvalue;

        data.fabric.total_heat_loss_WK += data.fabric.thermal_bridging_heat_loss;

        data.fabric.annual_solar_gain_kwh = data.fabric.annual_solar_gain * 0.024 * 365;
        data.TMP = data.fabric.total_thermal_capacity / data.TFA;

        var monthly_fabric_heat_loss = [];
        for (var m=0; m<12; m++) monthly_fabric_heat_loss[m] = data.fabric.total_heat_loss_WK;

        data.losses_WK["fabric"] = monthly_fabric_heat_loss;

        data.gains_W["solar"] = gains;
        data.GL = sum / data.TFA;
    }

    
    //---------------------------------------------------------------------------------------------
    // VENTILATION
    // Module Inputs: this.data.ventilation object
    // Global Inputs: this.data.volume, this.data.num_of_floors, this.data.region
    // Global Outputs: this.data.losses_WK.ventilation
    // Datasets: datasets.table_u2
    //---------------------------------------------------------------------------------------------

    var ventilation = function(data)
    {
        var defaults = {
            number_of_chimneys: 0,
            number_of_openflues: 0,
            number_of_intermittentfans: 0,
            number_of_passivevents: 0,
            number_of_fluelessgasfires: 0,

            air_permeability_test: false,
            air_permeability_value: 0,

            dwelling_construction: 'timberframe',
            suspended_wooden_floor: 0, // 'unsealed', 'sealed', 0
            draught_lobby: false,
            percentage_draught_proofed: 0,
            number_of_sides_sheltered: 0,

            ventilation_type: 'd',
            system_air_change_rate: 0,
            balanced_heat_recovery_efficiency: 100
        }

        add_defaults(data, {ventilation: defaults});

        var total = 0;
        total += data.ventilation.number_of_chimneys * 40;
        total += data.ventilation.number_of_openflues * 20;
        total += data.ventilation.number_of_intermittentfans * 10;
        total += data.ventilation.number_of_passivevents * 10;
        total += data.ventilation.number_of_fluelessgasfires * 10;

        var infiltration = 0;
        if (data.volume !== 0) {
            infiltration = total / data.volume;
        }

        if (data.ventilation.air_permeability_test === false)
        {
            infiltration += (data.num_of_floors - 1) * 0.1;

            if (data.ventilation.dwelling_construction === 'timberframe') infiltration += 0.2;
            if (data.ventilation.dwelling_construction === 'masonry') infiltration += 0.35;

            if (data.ventilation.suspended_wooden_floor === 'unsealed') infiltration += 0.2;
            if (data.ventilation.suspended_wooden_floor === 'sealed') infiltration += 0.1;

            if (!data.ventilation.draught_lobby) infiltration += 0.05;

            // Window infiltration
            infiltration += (0.25 - (0.2 * data.ventilation.percentage_draught_proofed / 100 ));
        }
        else
        {
            infiltration += data.ventilation.air_permeability_value / 20.0;
        }

        var shelter_factor = 1 - (0.075 * data.ventilation.number_of_sides_sheltered);

        infiltration *= shelter_factor;

        var adjusted_infiltration =
                datasets.table_u2[data.region]
                .map(function(windspeed) {
                    return infiltration * windspeed / 4;
                });
       
        // (24a)m effective_air_change_rate
        // (22b)m adjusted_infiltration
        // (23b)  this.input.effective_air_change_rate.exhaust_air_heat_pump
        // (23c)  this.input.balanced_heat_recovery_efficiency

        var infiltration_to_ach;
        switch (data.ventilation.ventilation_type) {
        case 'a':
            var offset = data.ventilation.system_air_change_rate *
                (1 - data.ventilation.balanced_heat_recovery_efficiency / 100.0);
            infiltration_to_ach = function(infiltration) {
                // (24a)m = (22b)m + (23b) x (1 - (23c) / 100)
                return infiltration + offset;
            };
            break;
        case 'b':
            var offset = data.ventilation.system_air_change_rate;
            // (24b)m = (22b)m + (23b) 
            infiltration_to_ach = function(infiltration) {
                return infiltration + offset;
            };
            break;
        case 'c':
            var system_ach = data.ventilation.system_air_change_rate;
            infiltration_to_ach = function(infiltration) {
                // if (22b)m < 0.5 × (23b), then (24c) = (23b); otherwise (24c) = (22b) m + 0.5 × (23b)
                return Math.max(system_ach, infiltration + 0.5*system_ach);
            };
            break;
        case 'd':
            // if (22b)m ≥ 1, then (24d)m = (22b)m otherwise (24d)m = 0.5 + [(22b)m2 × 0.5]
            infiltration_to_ach = function(infiltration) {
                if (infiltration >= 1) {
                    return infiltration;
                } else {
                    return 0.5 + Math.pow(infiltration, 2) * 0.5;
                }
            }
            break;
        default:
            console.error('unknown ventilation type', data.ventilation.ventilation_type);
            infiltration_to_ach = function(i) { return i; };
            break;
        }
        
        var effective_air_change_rate = adjusted_infiltration.map(infiltration_to_ach);
        
        var sum = 0;

        var infiltration_WK = effective_air_change_rate.map(function(ach) {
            var WK = ach * data.volume * 0.33;
            sum += WK;
            return WK;
        });
        
        data.ventilation.average_WK = sum / 12.0;

        data.ventilation.effective_air_change_rate = effective_air_change_rate;
        data.ventilation.infiltration_WK = infiltration_WK;

        data.losses_WK.ventilation = infiltration_WK;
    }

    
    //---------------------------------------------------------------------------------------------
    // TEMPERATURE
    // Module Inputs: this.data.temperature.responsiveness, this.data.temperature.target, this.data.temperature.living_area, this.data.temperature.control_type
    // Global Inputs: this.data.TFA, this.data.TMP, this.data.losses_WK, this.data.gains_W, this.data.altitude, this.data.region
    // Global Outputs: this.data.internal_temperature, this.data.external_temperature
    // Datasets: datasets.table_u1
    // Uses external function: calc_utilisation_factor
    //---------------------------------------------------------------------------------------------
    var temperature = function (data)
    {
        add_defaults(data,
                     {temperature: {
                         control_type:1,
                         living_area: data.TFA,
                         target: 21,
                         responsiveness: 1}});
        
        var R = data.temperature.responsiveness;
        var Th = data.temperature.target;
        var TMP = data.TMP; // data.TMP;

        var H = values(data.losses_WK)   // over each type of losses
                .reduce(v_add); // add month-wise

        var HLP = H.map(function(h) {return h / data.TFA;}); // over H, divide by TFA
        var G = values(data.gains_W)     // over each type of gains
                .reduce(v_add); // add month-wise

        var Te = datasets.table_u1[data.region].map(function(Te_m) {
            return Te_m - (0.3 * data.altitude / 50);
        });

        //----------------------------------------------------------------------------------------------------------------
        // 7. Mean internal temperature (heating season)
        //----------------------------------------------------------------------------------------------------------------

        // Bring calculation of (96)m forward as its used in section 7.
        // Monthly average external temperature from Table U1
        // for (var i=1; i<13; i++) data['96-'+i] = table_u1[i.region][i-1]-(0.3 * i.altitude / 50);

        // See utilisationfactor.js for calculation
        // Calculation is described on page 159 of SAP document
        // Would be interesting to understand how utilisation factor equation
        // can be derived

        var utilisation_factor_A = [];
        for (var m=0; m<12; m++)
        {
            utilisation_factor_A[m] = calc_utilisation_factor(TMP,HLP[m],H[m],Th,Te[m],G[m]);
        }

        // Table 9c: Heating requirement
        // Living area
        // 1. Set Ti to the temperature for the living area during heating periods (Table 9)
        // 2. Calculate the utilisation factor (Table 9a)
        // 3. Calculate the temperature reduction (Table 9b) for each off period (Table 9), u1 and u2, for weekdays

        var Ti_livingarea = [];
        for (var m=0; m<12; m++)
        {
            var Ti = Th;

            // (TMP,HLP,H,Ti,Te,G, R,Th,toff)
            var u1a = calc_temperature_reduction(TMP,HLP[m],H[m],Ti,Te[m],G[m],R,Th,7);
            var u1b = calc_temperature_reduction(TMP,HLP[m],H[m],Ti,Te[m],G[m],R,Th,0);
            var u2 =  calc_temperature_reduction(TMP,HLP[m],H[m],Ti,Te[m],G[m],R,Th,8);

            var Tweekday = Th - (u1a + u2);
            var Tweekend = Th - (u1b + u2);
            Ti_livingarea[m] = (5*Tweekday + 2*Tweekend) / 7;
        }

        // rest of dwelling
        var Th2 = [];
        for (var m=0; m<12; m++) {
            // see table 9 page 159
            if (data.temperature.control_type===1) Th2[m] = Th - 0.5 * HLP[m];
            if (data.temperature.control_type===2) Th2[m] = Th - HLP[m] + (Math.pow(HLP[m],2) / 12);
            if (data.temperature.control_type===3) Th2[m] = Th - HLP[m] + (Math.pow(HLP[m],2) / 12);
            //Th2[m] = i.Th - i.HLP[m] + 0.085 *Math.pow(i.HLP[m],2);

            if (isNaN(Th2[m])) Th2[m] = Th;
        }

        var utilisation_factor_B = [];
        for (var m=0; m<12; m++)
        {
            var Ti = Th2[m];
            var tmpHLP = HLP[m];
            if (tmpHLP>6.0) tmpHLP = 6.0;
            // TMP,HLP,H,Ti,Te,G
            utilisation_factor_B[m] = calc_utilisation_factor(TMP,tmpHLP,H[m],Ti,Te[m],G[m]);
        }

        var Ti_restdwelling = [];
        for (var m=0; m<12; m++)
        {
            var Th = Th2[m];
            var Ti = Th2[m];

            var u1a = calc_temperature_reduction(TMP,HLP[m],H[m],Ti,Te[m],G[m],R,Th,7);
            var u1b = calc_temperature_reduction(TMP,HLP[m],H[m],Ti,Te[m],G[m],R,Th,0);
            var u2 =  calc_temperature_reduction(TMP,HLP[m],H[m],Ti,Te[m],G[m],R,Th,8);

            var Tweekday = Th - (u1a + u2);
            var Tweekend = Th - (u1b + u2);
            Ti_restdwelling[m] = (5*Tweekday + 2*Tweekend) / 7;
        }

        var fLA = data.temperature.living_area / data.TFA;
        if (isNaN(fLA)) fLA = 0;

        data.internal_temperature = [];
        for (var m=0; m<12; m++)
        {
            data.internal_temperature[m] = (fLA * Ti_livingarea[m]) + (1 - fLA) * Ti_restdwelling[m];
        }

        data.external_temperature = Te;
    }


    //---------------------------------------------------------------------------------------------
    // SPACE HEATING AND COOLING
    // Calculates space heating and cooling demand.
    // Module Inputs: this.data.space_heating.use_utilfactor_forgains
    // Global Inputs: this.data.TFA, this.data.internal_temperature, this.data.external_temperature, this.data.losses_WK, this.data.gains_W
    // Global Outputs: this.data.energy_requirements.space_heating, this.data.energy_requirements.space_cooling
    // Uses external function: calc_utilisation_factor
    // Datasets: datasets.table_1a
    //---------------------------------------------------------------------------------------------

    var space_heating = function(data)
    {
        add_defaults(data,
                     {space_heating:{use_utilfactor_forgains: true}});
        
        // These might all need to be defined within the space_heating namespace to be accessible in the ui.
        // DeltaT (Difference between Internal and External temperature)
        var delta_T = v_sub(data.internal_temperature, data.external_temperature);
        // H values by month
        var H = values(data.losses_WK).reduce(v_add);
        // heat losses = H * deltaT
        var total_losses = v_mul(H, delta_T);
        // gains by month
        var total_gains = values(data.gains_W).reduce(v_add);
        var utilisation_factor = [];

        for (var m=0; m<12; m++)
        {
            // Calculate overall utilisation factor for gains
            var HLP = H[m] / data.TFA;
            utilisation_factor[m] = calc_utilisation_factor(data.TMP,HLP,H,data.internal_temperature[m],data.external_temperature[m],total_gains[m]);
        }

        // either multiply utilisation factors by gainss, or just use gainss
        var useful_gains =
                data.space_heating.use_utilfactor_forgains ?
                  v_mul(utilisation_factor, total_gains) : total_gains;

        // heat demand is losses net gains.
        var heat_demand = v_sub(total_losses, useful_gains);

        // cooling demand is negative heat demand
        var cooling_demand = heat_demand.map(function(demand) {
            if (demand < 0) return -demand;
            else return 0;
        });
        
        // eliminate negative heat demands
        heat_demand = heat_demand.map(function(demand) {return Math.max(demand, 0);});

        // convert to kWh: watts * days -> kWh / year
        var heat_demand_kwh =    v_mul(heat_demand,    datasets.table_1a).map(watts_to_kwh);
        var cooling_demand_kwh = v_mul(cooling_demand, datasets.table_1a).map(watts_to_kwh);

        // sum over months
        var annual_heating_demand = heat_demand_kwh.reduce(add);
        var annual_cooling_demand = cooling_demand_kwh.reduce(add);

        data.space_heating.delta_T = delta_T;
        data.space_heating.total_losses = total_losses;
        data.space_heating.total_gains = total_gains;
        data.space_heating.utilisation_factor = utilisation_factor;
        data.space_heating.useful_gains = useful_gains;

        data.space_heating.heat_demand = heat_demand;
        data.space_heating.cooling_demand = cooling_demand;
        data.space_heating.heat_demand_kwh = heat_demand_kwh;
        data.space_heating.cooling_demand_kwh = cooling_demand_kwh;

        data.space_heating.annual_heating_demand = annual_heating_demand;
        data.space_heating.annual_cooling_demand = annual_cooling_demand;

        if (annual_heating_demand>0) data.energy_requirements.space_heating = {name: "Space Heating", quantity: annual_heating_demand};
        if (annual_cooling_demand>0) data.energy_requirements.space_cooling = {name: "Space Cooling", quantity: annual_cooling_demand};

        data.fabric_energy_efficiency = (annual_heating_demand + annual_cooling_demand) / data.TFA;
    }


    //---------------------------------------------------------------------------------------------
    // ENERGY SYSTEMS, FUEL COSTS
    // Module Inputs: this.data.energy_systems
    // Global Inputs: this.data.energy_requirements
    // Global Outputs: this.data.fuel_totals, this.data.total_cost
    // Datasets: datasets.fuels
    //---------------------------------------------------------------------------------------------

    var energy_systems = function(data)
    {
        add_defaults(data,
                     energy_systems:{},
                     fuels: JSON.parse(JSON.stringify(datasets.fuels)));

        data.fuel_totals = {};

        for (var z in data.energy_requirements)
        {
            var quantity = data.energy_requirements[z].quantity;

            if (data.energy_systems[z]==undefined) data.energy_systems[z] = [];

            for (var x in data.energy_systems[z])
            {
                data.energy_systems[z][x].demand = quantity * data.energy_systems[z][x].fraction;

                data.energy_systems[z][x].fuelinput = data.energy_systems[z][x].demand / data.energy_systems[z][x].efficiency;

                var system = data.energy_systems[z][x].system;
                var fuel = datasets.energysystems[system].fuel;
                if (data.fuel_totals[fuel]==undefined) data.fuel_totals[fuel] = {name: fuel, quantity:0};
                data.fuel_totals[fuel].quantity += data.energy_systems[z][x].fuelinput;
            }
        }

        data.energy_use = 0;
        data.annualco2 = 0;
        for (z in data.fuel_totals)
        {
            data.fuel_totals[z].annualcost = data.fuel_totals[z].quantity * data.fuels[z].fuelcost + data.fuels[z].standingcharge*365;
            data.fuel_totals[z].fuelcost = data.fuels[z].fuelcost;
            data.fuel_totals[z].primaryenergy = data.fuel_totals[z].quantity * data.fuels[z].primaryenergyfactor;
            data.fuel_totals[z].annualco2 = data.fuel_totals[z].quantity * data.fuels[z].co2factor;

            data.total_cost += data.fuel_totals[z].annualcost;

            data.energy_use += data.fuel_totals[z].quantity;
            data.primary_energy_use += data.fuel_totals[z].primaryenergy;
            data.annualco2 += data.fuel_totals[z].annualco2;
        }

        data.net_cost = data.total_cost - data.total_income;
    };

    
    //---------------------------------------------------------------------------------------------
    // SAP
    // Module Inputs: this.data.SAP.energy_cost_deflator
    // Global Inputs: this.data.total_cost
    //---------------------------------------------------------------------------------------------

    var SAP = function(data)
    {
        data.SAP = {};

        data.SAP.energy_cost_deflator = 0.42;

        data.SAP.energy_cost_factor = (data.total_cost * data.SAP.energy_cost_deflator) / (data.TFA + 45.0);

        if (data.SAP.energy_cost_factor >= 3.5) {
            data.SAP.rating = 117 - 121 * (Math.log(data.SAP.energy_cost_factor) / Math.LN10);
        } else {
            data.SAP.rating = 100 - 13.95 * data.SAP.energy_cost_factor;
        }
    };

    
    var LAC = function(data)
    {
        add_defaults(data,
                     {LAC: {LLE: 1,
                            L: 1,
                            reduced_internal_heat_gains: false}});
        
        // average annual energy consumption for lighting if no low-energy lighting is used is:
        data.LAC.EB = 59.73 * Math.pow((data.TFA * data.occupancy),0.4714);

        if (data.LAC.L!=0)
        {
            data.LAC.C1 = 1 - (0.50 * data.LAC.LLE / data.LAC.L);
            data.LAC.C2 = 0;
            if (data.GL<=0.095) {
                data.LAC.C2 = 52.2 * Math.pow(data.GL,2) - 9.94 * data.GL + 1.433;
            } else {
                data.LAC.C2 = 0.96;
            }

            data.LAC.EL = data.LAC.EB * data.LAC.C1 * data.LAC.C2;

            var EL_monthly = [];
            var GL_monthly = [];

            var EL_sum = 0;
            for (var m=0; m<12; m++) {
                EL_monthly[m] = data.LAC.EL * (1.0 + (0.5 * Math.cos((2*Math.PI * (m - 0.2))/12.0))) * datasets.table_1a[m] / 365.0;
                EL_sum += EL_monthly[m];

                GL_monthly[m] = EL_monthly[m] * 0.85 * 1000 / (24 * datasets.table_1a[m]);
                if (data.LAC.reduced_internal_heat_gains) GL_monthly[m] = 0.4 * EL_monthly[m];
            }

            if (data.use_LAC) {
                data.gains_W["Lighting"] = GL_monthly;
                if (EL_sum>0) data.energy_requirements.lighting = {name: "Lighting", quantity: EL_sum};
            }
        }

        /*

         Electrical appliances

         */

        // The initial value of the annual energy use in kWh for electrical appliances is
        var EA_initial = 207.8 * Math.pow((data.TFA * data.occupancy),0.4714);

        var EA_monthly = [];
        var GA_monthly = [];
        var EA = 0; // Re-calculated the annual total as the sum of the monthly values
        for (var m=0; m<12; m++)
        {
            // The appliances energy use in kWh in month m (January = 1 to December = 12) is
            EA_monthly[m] = EA_initial * (1.0 + (0.157 * Math.cos((2*Math.PI * (m - 1.78))/12.0))) * datasets.table_1a[m] / 365.0;
            EA += EA_monthly[m];

            GA_monthly[m] = EA_monthly[m] * 1000 / (24 * datasets.table_1a[m]);
            if (data.LAC.reduced_internal_heat_gains) GA_monthly[m] = 0.67 * GA_monthly[m];
        }

        // The annual CO2 emissions in kg/m2/year associated with electrical appliances is
        var appliances_CO2 = (EA * 0.522 ) / data.TFA;

        if (data.use_LAC) {
            data.gains_W["Appliances"] = GA_monthly;
            if (EA>0) data.energy_requirements.appliances = {name: "Appliances", quantity: EA};
        }

        data.LAC.EA = EA;

        /*

         Cooking

         */

        // Internal heat gains in watts from cooking
        var GC = 35 + 7 * data.occupancy;

        // When lower internal heat gains are assumed for the calculation
        if (data.LAC.reduced_internal_heat_gains) GC = 23 + 5 * data.occupancy;

        var GC_monthly = [];
        for (var m=0; m<12; m++) GC_monthly[m] = GC;

        // CO2 emissions in kg/m2/year associated with cooking
        var cooking_CO2 = (119 + 24 * data.occupancy) / data.TFA;

        data.LAC.EC = GC * 0.024 * 365;

        if (data.use_LAC) {
            data.gains_W["Cooking"] = GC_monthly;
            if (GC>0) data.energy_requirements.cooking = {name: "Cooking", quantity: data.LAC.EC};
        }

        data.LAC.GC = data.LAC.EC;
    };

    var SHW = function (data)
    {
        add_defaults(data, {SHW:{}});
        /*
         if (data.SHW.A==undefined) data.SHW.A = 1.25;
         if (data.SHW.n0==undefined) data.SHW.n0 = 0.599;
         if (data.SHW.a1==undefined) data.SHW.a1 = 2.772;
         if (data.SHW.a2==undefined) data.SHW.a2 = 0.009;
         if (data.SHW.inclination==undefined) data.SHW.inclination = 35;
         if (data.SHW.orientation==undefined) data.SHW.orientation = 4;
         if (data.SHW.overshading==undefined) data.SHW.overshading = 1.0;
         */
        data.SHW.a = 0.892 * (data.SHW.a1 + 45 * data.SHW.a2);
        data.SHW.collector_performance_ratio = data.SHW.a / data.SHW.n0;
        data.SHW.annual_solar = annual_solar_rad(data.region,data.SHW.orientation,data.SHW.inclination);
        data.SHW.solar_energy_available = data.SHW.A * data.SHW.n0 * data.SHW.annual_solar * data.SHW.overshading;

        data.SHW.solar_load_ratio = data.SHW.solar_energy_available / data.water_heating.annual_energy_content;

        data.SHW.utilisation_factor = 0;
        if (data.SHW.solar_load_ratio > 0) data.SHW.utilisation_factor = 1 - Math.exp(-1/(data.SHW.solar_load_ratio));

        data.SHW.collector_performance_factor = 0;
        if (data.SHW.collector_performance_ratio < 20) {
            data.SHW.collector_performance_factor = 0.97 - 0.0367 * data.SHW.collector_performance_ratio + 0.0006 * Math.pow(data.SHW.collector_performance_ratio,2);
        } else {
            data.SHW.collector_performance_factor = 0.693 - 0.0108 * data.SHW.collector_performance_ratio;
        }
        if (data.SHW.collector_performance_factor<0) data.SHW.collector_performance_factor = 0;

        data.SHW.Veff = 0;
        if (data.SHW.combined_cylinder_volume>0) {
            data.SHW.Veff = data.SHW.Vs + 0.3 * (data.SHW.combined_cylinder_volume - data.SHW.Vs);
        } else {
            data.SHW.Veff = data.SHW.Vs;
        }

        data.SHW.volume_ratio = data.SHW.Veff / data.water_heating.Vd_average;
        data.SHW.f2 = 1 + 0.2 * Math.log(data.SHW.volume_ratio);
        if (data.SHW.f2>1) data.SHW.f2 = 1;
        data.SHW.Qs = data.SHW.solar_energy_available * data.SHW.utilisation_factor * data.SHW.collector_performance_factor * data.SHW.f2;


        // The solar input (in kWh) for month m is

        var sum = 0;
        for (var m=0; m<12; m++) sum += solar_rad(data.region,data.SHW.orientation,data.SHW.inclination,m);
        var annualAverageSolarIrradiance = sum / 12;

        data.SHW.Qs_monthly = [];
        for (m=0; m<12; m++)
        {
            var fm = solar_rad(data.region,data.SHW.orientation,data.SHW.inclination,m) / annualAverageSolarIrradiance;
            data.SHW.Qs_monthly[m] = - data.SHW.Qs * fm * datasets.table_1a[m] / 365;
        }
    };

    var water_heating = function(data)
    {
        add_defaults(data,
                     {water_heating: {combi_loss:[0,0,0,0,0,0,0,0,0,0,0,0],                              
                                      solar_water_heating:false,
                                      low_water_use_design: false,
                                      /// QUESTION: Should the pipework_insulated_fraction be being set to 1, or should the default be 1?
                                      ///           Previously this was being set to 1, so any user input value would be ignored.
                                      pipework_insulated_fraction: 1}});
        
        data.water_heating.Vd_average = (25 * data.occupancy) + 36;

        if (data.water_heating.low_water_use_design) data.water_heating.Vd_average *= 0.95;

        var Vd_m = [];
        var monthly_energy_content = [];
        var distribution_loss = [0,0,0,0,0,0,0,0,0,0,0,0];
        var energy_lost_from_water_storage = 0;
        var monthly_storage_loss = [0,0,0,0,0,0,0,0,0,0,0,0];
        var primary_circuit_loss = [0,0,0,0,0,0,0,0,0,0,0,0];
        var total_heat_required = [];
        var hot_water_heater_output = [];
        var heat_gains_from_water_heating = [];

        data.water_heating.annual_energy_content = 0;

        for (var m=0; m<12; m++) {
            Vd_m[m] = datasets.table_1c[m] * data.water_heating.Vd_average;
            monthly_energy_content[m] = (4.190 * Vd_m[m] * datasets.table_1a[m] * datasets.table_1d[m]) / 3600;
            data.water_heating.annual_energy_content += monthly_energy_content[m];
        }

        //----------------------------------------------------------------------------------------
        // Only calculate losses for storage and distribution if not instantaneous heating
        if (!data.water_heating.instantaneous_hotwater)
        {
            // STORAGE LOSS kWh/d
            if (data.water_heating.declared_loss_factor_known) {
                energy_lost_from_water_storage = data.water_heating.manufacturer_loss_factor * data.water_heating.temperature_factor_a;
            } else {
                energy_lost_from_water_storage = data.water_heating.storage_volume * data.water_heating.loss_factor_b * data.water_heating.volume_factor_b * data.water_heating.temperature_factor_b;
            }

            for (var m=0; m<12; m++) {

                // DISTRIBUTION LOSSES
                distribution_loss[m] = 0.15 * monthly_energy_content[m];

                // MONTHLY STORAGE LOSSES
                monthly_storage_loss[m] = datasets.table_1a[m] * energy_lost_from_water_storage;

                if (data.water_heating.contains_dedicated_solar_storage_or_WWHRS) {
                    monthly_storage_loss[m] = monthly_storage_loss[m] * ((data.water_heating.storage_volume-data.water_heating.Vs) / (data.water_heating.storage_volume));
                }

                var hours_per_day = 0;

                // PRIMARY CIRCUIT LOSSES
                if (m>=5 && m<=8) {
                    hours_per_day = 3;
                } else {
                    if (data.water_heating.hot_water_control_type == "no_cylinder_thermostat") hours_per_day = 11;
                    if (data.water_heating.hot_water_control_type == "cylinder_thermostat_without_timer") hours_per_day = 5;
                    if (data.water_heating.hot_water_control_type == "cylinder_thermostat_with_timer") hours_per_day = 3;
                    if (data.water_heating.community_heating) hours_per_day = 3;
                }

                if (data.water_heating.community_heating) data.water_heating.pipework_insulated_fraction = 1.0;

                primary_circuit_loss[m] = datasets.table_1a[m] * 14 * ((0.0091 * data.water_heating.pipework_insulated_fraction + 0.0245 * (1-data.water_heating.pipework_insulated_fraction)) * hours_per_day + 0.0263);

                if (data.water_heating.solar_water_heating) primary_circuit_loss[m] *= datasets.table_h4[m];

                total_heat_required[m] = 0.85 * monthly_energy_content[m] + distribution_loss[m] + monthly_storage_loss[m] + primary_circuit_loss[m] + data.water_heating.combi_loss[m];
            }
            //----------------------------------------------------------------------------------------
        }
        else
        {
            for (var m=0; m<12; m++) total_heat_required[m] = 0.85 * monthly_energy_content[m];
        }

        //----------------------------------------------------------------------------------------

        var waterheating_gains = [];
        var annual_waterheating_demand = 0;
        for (var m=0; m<12; m++) {

            if (data.water_heating.solar_water_heating && data.SHW!=undefined && data.SHW.Qs_monthly!=undefined) {
                hot_water_heater_output[m] = total_heat_required[m] + data.SHW.Qs_monthly[m];
            } else {
                hot_water_heater_output[m] = total_heat_required[m];
            }

            if (hot_water_heater_output[m]<0) hot_water_heater_output[m] = 0;

            annual_waterheating_demand += hot_water_heater_output[m];

            if (data.water_heating.hot_water_store_in_dwelling || data.water_heating.community_heating) {
                heat_gains_from_water_heating[m] = 0.25 * (0.85*monthly_energy_content[m]+data.water_heating.combi_loss[m]) + 0.8*(distribution_loss[m]+monthly_storage_loss[m]+primary_circuit_loss[m]);
            } else {
                heat_gains_from_water_heating[m] = 0.25 * (0.85*monthly_energy_content[m]) + 0.8*(distribution_loss[m]+primary_circuit_loss[m]);
            }

            // Table 5 typical gains
            waterheating_gains[m] = (1000 * heat_gains_from_water_heating[m]) / (datasets.table_1a[m] * 24);
        }


        /*
         // Combi loss for each month from Table 3a, 3b or 3c (enter “0” if not a combi boiler)
         switch(combi_type)
         {
         case 'instantaneous_no_keephot':
         combi_loss[m] = 600 * fu * table_1a[m] / 365;
         break;
         case 'instantaneous_keephot_timeclock':
         combi_loss[m] = 600 * table_1a[m] / 365;
         break;
         case 'instantaneous_keephot_no_timeclock':
         combi_loss[m] = 900 * table_1a[m] / 365;
         break;
         case '
         }
         */

        if (data.use_water_heating) {
            data.gains_W["waterheating"] = waterheating_gains;
            if (annual_waterheating_demand>0) data.energy_requirements.waterheating = {name: "Water Heating", quantity: annual_waterheating_demand};
        }
    };


    var appliancelist = function(data)
    {
        add_defaults(data, {appliancelist:{list:[]}});
        // this default appliance cannot safely be added by add_defaults, because if there was a 0th appliance we don't want to set a default name, power or hours on it.
        if (data.appliancelist.list.length === 0) data.appliancelist.push({name: "LED Light", power: 6, hours: 12});

        data.appliancelist.totalwh = 0;
        data.appliancelist.annualkwh = 0;

        for (z in data.appliancelist.list) {
            data.appliancelist.list[z].energy = data.appliancelist.list[z].power * data.appliancelist.list[z].hours;
            data.appliancelist.totalwh += data.appliancelist.list[z].energy;
        }

        data.appliancelist.annualkwh = data.appliancelist.totalwh * 365 * 0.001;

        data.appliancelist.gains_W = data.appliancelist.totalwh / 24.0;
        data.appliancelist.gains_W_monthly = [];
        for (var m=0; m<12; m++) data.appliancelist.gains_W_monthly[m] = data.appliancelist.gains_W;

        if (data.use_appliancelist) {
            data.gains_W["Appliances"] = data.appliancelist.gains_W_monthly;
            if (data.appliancelist.annualkwh>0) data.energy_requirements.appliances = {name: "Appliances", quantity: data.appliancelist.annualkwh};
        }
    };


    var generation = function(data) {
        add_defaults(data, {generation: {
            solar_annual_kwh: 0,
            solar_fraction_used_onsite: 0.5,
            solar_FIT: 0,
            wind_annual_kwh: 0,
            wind_fraction_used_onsite: 0.5,
            wind_FIT: 0,
            hydro_annual_kwh: 0,
            hydro_fraction_used_onsite: 0.5,
            hydro_FIT: 0,

            solarpv_orientation: 4,
            solarpv_kwp_installed: 0,
            solarpv_inclination: 35,
            solarpv_overshading: 1,
            solarpv_fraction_used_onsite: 0.5,
            solarpv_FIT: 0
        }});

        var kWp = data.generation.solarpv_kwp_installed;
        // 0:North, 1:NE/NW, 2:East/West, 3:SE/SW, 4:South
        var orient = data.generation.solarpv_orientation;

        var p = data.generation.solarpv_inclination;
        var overshading_factor = data.generation.solarpv_overshading;

        // annual_solar_radiation
        // U3.3 in Appendix U for the applicable climate and orientation and tilt of the PV
        // Z PV is the overshading factor from Table H2.
        // p: tilt
        var annual_solar_radiation = annual_solar_rad(data.region,orient,p)
        data.generation.solarpv_annual_kwh = 0.8 * kWp * annual_solar_radiation * overshading_factor;

        // ----------


        data.generation.total_energy_income = 0;

        if (data.use_generation == true)
        {
            if (data.generation.solar_annual_kwh>0)
            {
                data.energy_requirements.solarpv = {name: "Solar PV", quantity: -data.generation.solar_annual_kwh * data.generation.solar_fraction_used_onsite};
                data.energy_systems.solarpv = [];
                data.energy_systems.solarpv[0] = {system: "electric", fraction: 1, efficiency: 1};
                data.total_income += data.generation.solar_annual_kwh * data.generation.solar_FIT;
            }

            if (data.generation.wind_annual_kwh>0)
            {
                data.energy_requirements.wind = {name: "Wind", quantity: -data.generation.wind_annual_kwh * data.generation.wind_fraction_used_onsite};
                data.energy_systems.wind = [];
                data.energy_systems.wind[0] = {system: "electric", fraction: 1, efficiency: 1};
                data.total_income += data.generation.wind_annual_kwh * data.generation.wind_FIT;
            }

            if (data.generation.wind_annual_kwh>0)
            {
                data.energy_requirements.hydro = {name: "Hydro", quantity: -data.generation.hydro_annual_kwh * data.generation.hydro_fraction_used_onsite};
                data.energy_systems.hydro = [];
                data.energy_systems.hydro[0] = {system: "electric", fraction: 1, efficiency: 1};
                data.total_income += data.generation.hydro_annual_kwh * data.generation.hydro_FIT;
            }

            if (data.generation.solarpv_annual_kwh>0)
            {
                data.energy_requirements.solarpv2 = {name: "Solar PV", quantity: -data.generation.solarpv_annual_kwh * data.generation.solarpv_fraction_used_onsite};
                if (data.energy_systems.solarpv2==undefined) {
                    data.energy_systems.solarpv2 = [{system: "electric", fraction: 1, efficiency: 1}];
                }
                data.total_income += data.generation.solarpv_annual_kwh * data.generation.solarpv_FIT;
            }
        }
    }

    var currentenergy = function(data)
    {
        var defaults = {
            'electric': { name: "Electricity", note:"",
                          quantity:0, units: "kWh", kwh: 1.0, co2: 0.512, primaryenergy: 2.4, unitcost:0.15, standingcharge:0.0},

            'electric-heating': { name: "Electricity for direct heating", note:"e.g: Storage Heaters",
                                  quantity:0, units: "kWh", kwh: 1.0, co2: 0.512, primaryenergy: 2.4, unitcost:0.15, standingcharge:0.0},

            'electric-heatpump': { name: "Electricity for heatpump", note:"annual electricity input to the heatpump",
                                   quantity:0, units: "kWh", kwh: 1.0, co2: 0.512, primaryenergy: 2.4, unitcost:0.15, standingcharge:0.0},

            'electric-waterheating': { name: "Electricity for water heating", note:"",
                                       quantity:0, units: "kWh", kwh: 1.0, co2: 0.512, primaryenergy: 2.4, unitcost:0.15, standingcharge:0.0},

            'electric-car': { name: "Electric car", note: "",
                              quantity:0, units: "kWh", kwh: 1.0, co2: 0.512, primaryenergy: 2.4, unitcost:0.15, standingcharge:0.0},


            'wood-logs': { name:"Wood Logs", note:"",
                           quantity:0, units: "m3", kwh: 1380, co2: 0.00, primaryenergy: 1.1, unitcost:69, standingcharge:0.00},
            'wood-pellets': { name:"Wood Pellets", note:"",
                              quantity:0, units: "m3", kwh: 4800, co2: 0.00, primaryenergy: 1.1, unitcost:240, standingcharge:0.00},
            'oil': { name:"Oil", note:"",
                     quantity:0, units: "L", kwh: 10.27, co2: 2.518, primaryenergy: 1.1, unitcost:0.55, standingcharge:0.00},
            'gas': { name:"Mains gas", note:"",
                     quantity:0, units: "m3", kwh: 9.8, co2: 2.198, primaryenergy: 1.1, unitcost:0.4214, standingcharge:0.00},
            'lpg': { name:"LPG", note:"",
                     quantity:0, units: "kWh", kwh: 11.0, co2: 1.5, primaryenergy: 1.1, unitcost:0.55, standingcharge:0.00},
            'bottledgas': { name:"Bottled gas", note:"",
                            quantity:0, units: "kg", kwh: 13.9, co2: 2.198, primaryenergy: 1.1, unitcost:1.8, standingcharge:0.00},


            //'electric-car-miles': { name: "Electric car (miles)", note: "miles not included in home electricty above, assuming 100% green electricity",
            //    quantity:0, units: "miles", kwh: 0.25, co2: 0.02, primaryenergy: 2.4, unitcost:0.00, standingcharge:0.00},

            'car1': { name: "Car 1", note:"",
                      quantity:0, units: "miles", mpg: 35.0, kwh: 9.7*4.5, co2: 2.31*4.5, primaryenergy: 1.1, unitcost:0.00, standingcharge:0.00},

            'car2': { name: "Car 2", note:"",
                      quantity:0, units: "miles", mpg: 35.0, kwh: 9.7*4.5, co2: 2.31*4.5, primaryenergy: 1.1, unitcost:0.00, standingcharge:0.00},

            'car3': { name: "Car 3", note:"",
                      quantity:0, units: "miles", mpg: 35.0, kwh: 9.7*4.5, co2: 2.31*4.5, primaryenergy: 1.1, unitcost:0.00, standingcharge:0.00},

            'motorbike': { name: "Motorbike", note:"",
                           quantity:0, units: "miles", mpg: 35.0, kwh: 9.7*4.5, co2: 2.31*4.5, primaryenergy: 1.1, unitcost:0.00, standingcharge:0.00},

            'bus': { name: "Bus", note:"",
                     quantity:0, units: "miles", kwh: 0.53, co2: 0.176, primaryenergy: 1.1, unitcost:0.00, standingcharge:0.00},

            'train': { name: "Train", note:"",
                       quantity:0, units: "miles", kwh: 0.096, co2: 0.096, primaryenergy: 1.1, unitcost:0.00, standingcharge:0.00},

            'boat': { name: "Boat", note:"",
                      quantity:0, units: "miles", kwh: 1.0, co2: 0.192, primaryenergy: 1.1, unitcost:0.00, standingcharge:0.00},

            'plane': { name: "Plane", note:"",
                       quantity:0, units: "miles", kwh: 0.69, co2: 0.43, primaryenergy: 1.1, unitcost:0.00, standingcharge:0.00}
        };

        add_defaults(data, {currentenergy: defaults});
        
        var energy = data.currentenergy.energyitems;

        for (var z in defaults) {
            energy[z].name = defaults[z].name;
            energy[z].units = defaults[z].units;
            energy[z].kwh = defaults[z].kwh;
            energy[z].co2 = defaults[z].co2;
            energy[z].primaryenergy = defaults[z].primaryenergy;
        }

        var electrictags = ['electric','electric-heating','electric-heatpump','electric-waterheating','electric-car'];
        for (var z in electrictags) {
            var tag = electrictags[z];
            if (data.currentenergy.greenenergy) {
                energy[tag].co2 = 0.02;
                energy[tag].primaryenergy = 1.3;
            } else {
                energy[tag].co2 = 0.512;
                energy[tag].primaryenergy = 2.4;
            }
        }


        for (var item in energy)
        {
            if (energy[item].mpg==undefined ) {
                energy[item].annual_kwh = energy[item].quantity * energy[item].kwh;
            } else {
                energy[item].annual_kwh = (energy[item].quantity / energy[item].mpg) * energy[item].kwh;
            }
            energy[item].kwhd = energy[item].annual_kwh / 365.0;

            if (energy[item].mpg==undefined ) {
                energy[item].annual_co2 = energy[item].quantity * energy[item].co2;
            } else {
                energy[item].annual_co2 = (energy[item].quantity / energy[item].mpg) * energy[item].co2;
            }

            energy[item].annual_cost = (energy[item].quantity * energy[item].unitcost) + (365*energy[item].standingcharge);


        }

        var spaceheatingtags = ['electric-heating','electric-heatpump','wood-logs','wood-pellets','oil','gas','lpg','bottledgas'];

        var spaceheating_annual_kwh = 0;
        for (z in spaceheatingtags) {
            spaceheating_annual_kwh += energy[spaceheatingtags[z]].annual_kwh
        }

        var primaryenergytags = ['electric', 'electric-heating','electric-waterheating', 'electric-heatpump','wood-logs','wood-pellets','oil','gas','lpg','bottledgas'];
        var total_co2 = 0;
        var total_cost = 0;
        var primaryenergy_annual_kwh = 0;
        for (z in primaryenergytags) {
            var item = primaryenergytags[z];
            primaryenergy_annual_kwh += energy[item].annual_kwh * energy[item].primaryenergy;
            total_co2 += energy[item].annual_co2;
            total_cost += energy[item].annual_cost;
        }

        data.currentenergy.energyitems = energy;

        data.currentenergy.spaceheating_annual_kwh = spaceheating_annual_kwh;
        data.currentenergy.primaryenergy_annual_kwh = primaryenergy_annual_kwh;
        data.currentenergy.total_co2 = total_co2;
        data.currentenergy.total_cost = total_cost;

        data.currentenergy.spaceheating_annual_kwhm2 = spaceheating_annual_kwh/data.TFA;
        data.currentenergy.primaryenergy_annual_kwhm2 = primaryenergy_annual_kwh/data.TFA;
        data.currentenergy.total_co2m2 = total_co2/data.TFA;
        data.currentenergy.total_costm2 = total_cost/data.TFA;
    };



    //---------------------------------------------------------------------------------------------
    // SEPERATED MODEL FUNCTIONS
    //---------------------------------------------------------------------------------------------

    // U3.2 Solar radiation on vertical and inclined surfaces
    var solar_rad = function(region,orient,p,m)
    {
        var k = datasets.k;
        // convert degrees into radians
        var radians = (p/360.0)*2.0*Math.PI;

        var sinp = Math.sin(radians);
        var sin2p = sinp * sinp;
        var sin3p = sinp * sinp * sinp;

        var A = k[1][orient] * sin3p + k[2][orient] * sin2p + k[3][orient] * sinp;
        var B = k[4][orient] * sin3p + k[5][orient] * sin2p + k[6][orient] * sinp;
        var C = k[7][orient] * sin3p + k[8][orient] * sin2p + k[9][orient] * sinp + 1;

        var latitude = (datasets.table_u4[region]/360)*2*Math.PI; // get latitude in degrees and convert to radians
        var sol_dec = (datasets.solar_declination[m]/360)*2*Math.PI; // get solar_declination in degrees and convert to radians
        var cos1 = Math.cos(latitude - sol_dec);
        var cos2 = cos1 * cos1;

        // Rh-inc(orient, p, m) = A × cos2(φ - δ) + B × cos(φ - δ) + C
        var Rh_inc = A * cos2 + B * cos1 + C;

        return datasets.table_u3[region][m] * Rh_inc;
    }

    // Annual solar radiation on a surface
    var annual_solar_rad = function(region,orient,p)
    {
        // month 0 is january, 11: december
        var sum = 0;
        for (var m=0; m<12; m++)
        {
            sum += datasets.table_1a[m] * solar_rad(region,orient,p,m);
        }
        return 0.024 * sum;
    }


    var calc_solar_gains_from_windows = function(windows,region)
    {
        var gains = [0,0,0,0,0,0,0,0,0,0,0,0];

        for (var z in windows)
        {
            var orientation = windows[z]['orientation'];
            var area = windows[z]['area'];
            var overshading = windows[z]['overshading'];
            var g = windows[z]['g'];
            var ff = windows[z]['ff'];

            // The gains for a given window are calculated for each month
            // the result of which needs to be put in a bin for totals for jan, feb etc..
            for (var month=0; month<12; month++)
            {
                // Access factor table: first dimention is shading factor, 2nd in winter, summer.
                var table_6d = [[0.3,0.5],[0.54,0.7],[0.77,0.9],[1.0,1.0]];

                // access factor is time of year dependent
                // Summer months: 5:June, 6:July, 7:August and 8:September (where jan = month 0)
                var summer = 0; if (month>=5 && month<=8) summer = 1;
                var access_factor = table_6d[overshading][summer];

                // Map orientation code from window to solar rad orientation codes.
                if (orientation == 5) orientation = 3; // SE/SW
                if (orientation == 6) orientation = 2; // East/West
                if (orientation == 7) orientation = 1; // NE/NW

                gains[month] += access_factor * area * solar_rad(region,orientation,90,month) * 0.9 * g * ff;
            }
        }
        return gains;
    }

    // Calculation of mean internal temperature for heating
    // Calculation of mean internal temperature is based on the heating patterns defined in Table 9.

    var calc_utilisation_factor = function(TMP,HLP,H,Ti,Te,G)
    {
        /*
         Symbols and units
         H = heat transfer coefficient, (39)m (W/K)
         G = total gains, (84)m (W)
         Ti = internal temperature (°C)
         Te = external temperature, (96)m (°C)
         TMP = Thermal Mass Parameter, (35), (kJ/m2K) (= Cm for building / total floor area)
         HLP = Heat Loss Parameter, (40)m (W/m2K)
         τ = time constant (h)
         η = utilisation factor
         L = heat loss rate (W)
         */

        // Calculation of utilisation factor

        // TMP = thermal Mass / Total floor area
        // HLP = heat transfer coefficient (H) / Total floor area

        var tau = TMP / (3.6 * HLP);
        var a = 1.0 + tau / 15.0;

        // calc losses
        var L = H * (Ti - Te);

        // ratio of gains to losses
        var y = G / L;

        // Note: to avoid instability when γ is close to 1 round γ to 8 decimal places
        // y = y.toFixed(8);
        y = Math.round(y*100000000.0) / 100000000.0;

        var n = 0.0;
        if (y>0.0 && y!=1.0) n = (1.0 - Math.pow(y,a)) / (1.0 - Math.pow(y,a+1.0));
        if (y == 1.0) n = a / (a + 1.0);

        if (isNaN(n)) n = 0;
        return n;
    }

    var calc_temperature_reduction = function(TMP,HLP,H,Ti,Te,G, R,Th,toff)
    {
        // Calculation of utilisation factor
        var tau = TMP / (3.6 * HLP);
        var a = 1.0 + tau / 15.0;
        var L = H * (Ti - Te);
        var y = G / L;

        // Note: to avoid instability when γ is close to 1 round γ to 8 decimal places
        // y = y.toFixed(8);
        y = Math.round(y*100000000.0) / 100000000.0;
        var n = 0.0;
        if (y>0.0 && y!=1.0) n = (1.0 - Math.pow(y,a)) / (1.0 - Math.pow(y,a+1.0));
        if (y == 1.0) n = a / (a + 1.0);

        var tc = 4.0 + 0.25 * tau;

        var Tsc = (1.0 - R) * (Th - 2.0) + R * (Te + n * G / H);

        var u;
        if (toff <= tc) u = 0.5 * toff * toff * (Th - Tsc) / (24 * tc);
        if (toff > tc) u = (Th - Tsc) * (toff - 0.5 * tc) / 24;


        if (isNaN(u)) u = 0;
        return u;
    }

    return {run: run};
}();




