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

var openFUVC_helper = new openFUVC();

$(document).ready(function () {
    openFUVC_helper.add_modal_to_DOM();
    openFUVC_helper.add_events();
    openFUVC_helper.ini_modal();

    // Development
    /*$('#launch-calculator').click();*/
    /*$('#type-of-floor select').val('suspended_floor').change();
    $('#area input').val(75.6);
    $('#perimeter input').val(35.4);
    $('#wall_thickness input').val(0.3);
    $('#height input').val(0.3);
    $('#wall_uvalue select').val(1.7);
    $('#area_ventilation_openings input').val(0.002);
    $('#wind_shielding_factor select').val(0.05);
    $('#depth_of_basement_floor input').val(0.3);
    $('#wind_speed_annual_average input').val(4);
    $('#external_temperature_annual_average input').val(10);*/
    
    /*$('#add-layer').click();
     $('[layer="1"] .thickness').val(0.10);
     $('[layer="1"] .spacing').val(1);
     $('[layer="1"] .length-material2').val(0.2);
     $('[layer="2"] .thickness').val(0);
     $('[layer="2"] .spacing').val(1);
     $('[layer="2"] .length-material2').val(0.2);
     $('[layer="1"] .material1').val("unventilated");
     $('#openFUVC-calculate').click();*/
     
});

openFUVC.prototype.add_modal_to_DOM = function () {
    var src = '';
    var scripts = document.getElementsByTagName('script');
    for(var i = 0; i < scripts.length;i++){
        var pos = scripts[i].src.indexOf('openFUVC-ui-helper.js');
        if(pos != -1) {
            src = scripts[i].src.slice(0,pos);
        }
    }
    //console.log (src);
    $.ajax({
        url: src + 'openFUVC.html',
        async: false,
        success: function (data) {
            $('body').append(data);
        }
    });
};

openFUVC.prototype.ini_modal = function () {
    //Fill up selects with options defined in this.dataset
    this.add_options_to_select('#thermal_conductivity_ug select', this.dataset.thermal_conductivity_ug);
    this.add_options_to_select('#base_insulation_thermal_conductivity select', this.dataset.insulation_conductivity);
    this.add_options_to_select('#edge_insulation_thermal_conductivity select', this.dataset.insulation_conductivity);
    this.add_options_to_select('#edge_insulation_underfloor_space select', this.dataset.edge_insulation_underfloor_space);
    this.add_options_to_select('#wall_uvalue select', this.dataset.wall_uvalue);
    this.add_options_to_select('#ventilation_type select', this.dataset.ventilation_type);
    this.add_options_to_select('#wind_shielding_factor select', this.dataset.wind_shielding_factor);
    this.add_options_to_select('select#regions', this.dataset.regions);
    this.add_options_floor_deck_material1('[layer="template"] select.material1');
    this.add_options_to_select('[layer="template"] select.material2', this.dataset.floor_deck.structural_elements);
    this.add_options_to_select('#unheated_space_thermal_resistance select', this.dataset.unheated_space_thermal_resistance);

    // Remove 'none' option from 'Edge insulation type' as it is already in 'Edge insulation'
    $('tr#edge_insulation_thermal_conductivity option[value="none"]').remove();
    
    // Initialize some inputs/selects
    $('#type-of-floor select').val('slab_on_ground').change();
    $('#base_insulation_thermal_conductivity select').val('none').change();
    $('#wall_uvalue select').val('2.1').change();
    $('#edge_insulation_underfloor_space select').val('none').change();
    $('#add-layer').click();
    $('[layer=1] select.material1').val('0.18').change();
    $('[layer=1] select.material2').val('none').change();

    // Show the inputs according to which type of floor is selected
    this.show_require_floor_inputs($('tr#type-of-floor select').val());

    // Adjust modal height
    this.adjust_modal_height();
};

openFUVC.prototype.add_events = function () {
    var openFUVC_helper = this;
    $('#openFUVC-modal').on('change', '#type-of-floor select', function () {
        openFUVC_helper.show_require_floor_inputs($(this).val());
        openFUVC_helper.adjust_modal_height();
    });
    $('#openFUVC-modal').on('change', 'select', function () {
        if ($(this).find('option.other').is(':selected')) {
            $(this).siblings('p.other').show();
        } else {
            $(this).siblings('p.other').hide();
        }
    });
    $('#openFUVC-modal').on('change', 'select.material2', function () {
        var layer =  $(this).parent().parent().attr('layer');
        if ($(this).find('option[value=none]').is(':selected')){
            $('tr[layer='+layer+'] .length-material2').hide().attr('required', false);
            $('tr[layer='+layer+'] .spacing').hide().attr('required', false);            
        } else{
            $('tr[layer='+layer+'] .length-material2').show().attr('required', true);
            $('tr[layer='+layer+'] .spacing').show().attr('required', true);            
        }      
    });
    $('#openFUVC-modal').on('change', 'p.other input', function () {
        // Copy value of the input to the option in select
        $(this).parent().siblings('select').find('option.other')[0].value = $(this).val();
    });
    $('#openFUVC-modal').on('change', '#base_insulation_thermal_conductivity select', function () {
        if ($(this).val() != 'none') {
            $('tr#base_insulation_thickness').show();
            $('tr#base_insulation_thickness input').attr('required', true);
        } else {
            $('tr#base_insulation_thickness').hide();
            $('tr#base_insulation_thickness input').attr('required', false);
        }
    });
    $('#openFUVC-modal').on('change', '#edge_insulation_underfloor_space select', function () {
        if ($(this).val() != 'none') {
            $('tr#edge_insulation_thermal_conductivity').show();
            $('tr#edge_insulation_thickness').show();
            $('tr#edge_insulation_length').show();
            $('tr#edge_insulation_thermal_conductivity input').attr('required', true);
            $('tr#edge_insulation_thickness input').attr('required', true);
            $('tr#edge_insulation_length input').attr('required', true);
        } else {
            $('tr#edge_insulation_thermal_conductivity').hide();
            $('tr#edge_insulation_thickness').hide();
            $('tr#edge_insulation_length').hide();
            $('tr#edge_insulation_thermal_conductivity input').attr('required', false);
            $('tr#edge_insulation_thickness input').attr('required', false);
            $('tr#edge_insulation_length input').attr('required', false);
        }
    });
    $('#openFUVC-modal').on('change', 'select#regions', function () {
        if ($(this).val() == 'manually') {
            $('#wind_speed_annual_average input').attr('disabled', false);
            $('#external_temperature_annual_average input').attr('disabled', false);
        } else {
            var index = $(this).val();
            $('#wind_speed_annual_average input').attr('disabled', true).val(openFUVC_helper.get_wind_speed_annual_average(index).toFixed(2));
            $('#external_temperature_annual_average input').attr('disabled', true).val(openFUVC_helper.get_external_temperature_annual_average(index).toFixed(2));
        }
    });
    $('#openFUVC-modal').on('change', '#ventilation_type select', function () {
        // Reset (hide and unrequire) all the inputs
        $('tr#area_ventilation_openings').hide().find('input').attr('required', false);
        $('tr#wind_shielding_factor').hide().find('input').attr('required', false);
        $('tr#ventilation_rate').hide().find('input').attr('required', false);
        $('tr#internal_temperature_annual_average').hide().find('input').attr('required', false);
        $('tr#ventilation_rate_unheated_basement').hide().find('input').attr('required', false);
        $('tr#basement_volume').hide().find('input').attr('required', false);
        //Show and require the relevant inputs according to the ventilation type
        switch ($('#ventilation_type select').val()) {
            case 'natural':
                $('tr#area_ventilation_openings').show().find('input').attr('required', true);
                $('tr#wind_shielding_factor').show().find('input').attr('required', true);
                break;
            case 'mechanical_from_inside':
                $('tr#ventilation_rate').show().find('input').attr('required', true);
                $('tr#internal_temperature_annual_average').show().find('input').attr('required', true);
                break;
            case 'mechanical_from_outside_to_heated_basement':
                $('tr#ventilation_rate').show().find('input').attr('required', true);
                break;
            case 'mechanical_from_outside_to_unheated_basement':
                $('tr#ventilation_rate_unheated_basement').show().find('input').attr('required', true);
                $('tr#basement_volume').show().find('input').attr('required', true);
                break;
            case 'none':
            default:
                break;
        }
    });
    $('#openFUVC-modal').on('change', '#area input, #perimeter input', function () {
        var B = openFUVC_helper.characteristic_dimension($('#area input').val(), $('#perimeter input').val());
        $('#characteristic-dimension').html(B.toFixed(2));
    });
    $('#openFUVC-modal').on('click', '#openFUVC-calculate', function () {
        if ($('#openFUVC-form')[0].checkValidity() === false) {
            // Trigger browser validation (shows errors in UI)
            $('<input type="submit" />').hide().appendTo('#openFUVC-form').click().remove();
        } else {
            var type_of_floor = $('#type-of-floor select').val();
            var data = openFUVC_helper.fetch_inputs(type_of_floor);
            var uvalue = openFUVC_helper.calc(type_of_floor, data);
            console.log(data);
            console.log(JSON.stringify(data));
            console.log('U-value: ' + uvalue);
            openFUVC_helper.callback(uvalue);
            $('#openFUVC-modal').modal('hide');
        }
    });
    $('#openFUVC-modal').on('change', 'select, #openFUVC-modal input', function () {
        openFUVC_helper.adjust_modal_height();
    });
    $('#openFUVC-modal').on('click', '#add-layer', function (e) {
        e.preventDefault();
        var layer_number = $('.layer').length;
        $('#floor-deck').append('<tr class="layer" layer="' + layer_number + '">' + $('[layer=template]').html() + '</tr>');
        $('#floor-deck [layer="' + layer_number + '"] .layer-number').html(layer_number);
        $('#floor-deck [layer="' + layer_number + '"] .actions').html('<i class="icon-trash" layer="' + layer_number + '" style="cursor:pointer" />');
        $('#floor-deck [layer="' + layer_number + '"] select.material2').val('none').change();
        //openFUVC_helper.add_events();

    });
    $('#openFUVC-modal .layer .icon-trash').on('click', function () {
        var layer_number = $(this).attr('layer');
        $('#openFUVC-modal tr.layer[layer="' + layer_number + '"]').remove();
    });
};

openFUVC.prototype.launch_calculator = function (callback) {
    $('#openFUVC-modal').modal('show');
    this.adjust_modal_height();
    this.callback = callback;
};

openFUVC.prototype.add_options_to_select = function (selector, source) {
    if (source.constructor === Array) {
        for (var index in source) {
            $(selector).append('<option value="' + index + '">' + source[index] + '</option>');
        }
    } else if (typeof (source) == 'object') {
        for (var field in source) {
            $(selector).prepend('<option value="' + source[field][1] + '">' + source[field][0] + '</option>');
        }
    }
};

openFUVC.prototype.add_options_floor_deck_material1 = function (selector) {
    elements = this.dataset.floor_deck.air_gaps;

    $(selector).prepend('</optgroup>');
    for (var index in elements) {
        $(selector).prepend('<option value="' + elements[index][1] + '">' + elements[index][0] + '</option>');
    }
    $(selector).prepend('<optgroup label="Air gaps">');

    elements = this.dataset.floor_deck.finishes;
    $(selector).prepend('</optgroup>');
    for (var index in elements) {
        $(selector).prepend('<option value="' + elements[index][1] + '">' + elements[index][0] + '</option>');
    }
    $(selector).prepend('<optgroup label="Finishes">');

    elements = this.dataset.floor_deck.insulation;
    $(selector).prepend('</optgroup>');
    for (var index in elements) {
        $(selector).prepend('<option value="' + elements[index][1] + '">' + elements[index][0] + '</option>');
    }
    $(selector).prepend('<optgroup label="Insulation">');

    var elements = this.dataset.floor_deck.structural_elements;
    $(selector).prepend('</optgroup>');
    for (var index in elements) {
        $(selector).prepend('<option value="' + elements[index][1] + '">' + elements[index][0] + '</option>');
    }
    $(selector).prepend('<optgroup label="Structural elements">');
};

openFUVC.prototype.fetch_inputs = function (type_of_floor) {
// Common inputs to all the floors
    var data = {
        area: $('#area input').val(),
        perimeter: $('#perimeter input').val(),
        thermal_conductivity_ug: $('#thermal_conductivity_ug select').val(),
        wall_thickness: $('#wall_thickness input').val()
    };
    // Specific inputs to floors
    switch (type_of_floor) {
        case'slab_on_ground':
            if ($('#base_insulation_thermal_conductivity select').val() != 'none') {
                data.base_insulation_thermal_conductivity = $('#base_insulation_thermal_conductivity select').val();
                data.base_insulation_thickness = $('#base_insulation_thickness input').val();
            }
            if ($('#edge_insulation_underfloor_space select').val() != 'none') {
                data.edge_insulation_underfloor_space = $('#edge_insulation_underfloor_space select').val();
                data.edge_insulation_thickness = $('#edge_insulation_thickness input').val();
                data.edge_insulation_thermal_conductivity = $('#edge_insulation_thermal_conductivity select').val();
                data.edge_insulation_length = $('#edge_insulation_length input').val();
            }
            break;
        case 'heated_basement':
            data.wall_uvalue = $('#wall_uvalue input').val();
            data.depth_of_basement_floor = $('#depth_of_basement_floor input').val();
            if ($('#base_insulation_thermal_conductivity select').val() != 'none') {
                data.base_insulation_thermal_conductivity = $('#base_insulation_thermal_conductivity select').val();
                data.base_insulation_thickness = $('#base_insulation_thickness input').val();
            }
            break;
        case 'suspended_floor':
            data.height = $('#height input').val();
            data.wall_uvalue = $('#wall_uvalue input').val();
            data.depth_of_basement_floor = $('#depth_of_basement_floor input').val();
            data.wind_speed_annual_average = $('#wind_speed_annual_average input').val();
            data.height == $('#height input').val();
            data.wall_uvalue = $('#wall_uvalue select').val();
            if ($('#base_insulation_thermal_conductivity select').val() != 'none') {
                data.base_insulation_thermal_conductivity = $('#base_insulation_thermal_conductivity select').val();
                data.base_insulation_thickness = $('#base_insulation_thickness input').val();
            }
            if ($('#edge_insulation_underfloor_space select').val() != 'none') {
                data.edge_insulation_underfloor_space = $('#edge_insulation_underfloor_space select').val();
                data.edge_insulation_thickness = $('#edge_insulation_thickness input').val();
                data.edge_insulation_thermal_conductivity = $('#edge_insulation_thermal_conductivity select').val();
                data.edge_insulation_length = $('#edge_insulation_length input').val();
            }
            data.external_temperature_annual_average = $('#external_temperature_annual_average input').val();
            data.internal_temperature_annual_average = $('#internal_temperature_annual_average input').val();
            data.ventilation_type = $('#ventilation_type select').val();
            switch (data.ventilation_type) {
                case 'natural':
                    data.area_ventilation_openings = $('#area_ventilation_openings input').val();
                    data.wind_shielding_factor = $('#wind_shielding_factor select').val();
                    break;
                case 'mechanical_from_inside':
                    data.ventilation_rate = $('#ventilation_rate input').val();
                    data.internal_temperature_annual_average = $('#internal_temperature_annual_average input').val();
                    break;
                case 'mechanical_from_outside_to_heated_basement':
                    data.ventilation_rate = $('#ventilation_rate input').val();
                    break;
                case 'mechanical_from_outside_to_unheated_basement':
                    data.ventilation_rate_unheated_basement = $('#ventilation_rate_unheated_basement input').val(); // carlos remember default to 3
                    data.basement_volume = $('#basement_volume input').val();
                    break;
                case 'none':
                default:
                    break;
            }
            data.floor_deck_layers = [];
            $('.layer').each(function () {
                if ($(this).attr('layer') !='template'){
                    var layer = {
                        thickness: $(this).find('.thickness').val(),
                        thermal_conductivity_1: $(this).find('.material1').val(),
                    };
                    if($(this).find('.material2').val() != 'none'){
                        layer.length_2 = $(this).find('.length-material2').val();
                        layer.thermal_conductivity_2 = $(this).find('.material2').val();
                        layer.spacing = $(this).find('.spacing').val();
                    } else{                    
                        layer.length_2 = 0;
                        layer.thermal_conductivity_2 = 1; // doesn't matter the value
                        layer.spacing = 1; // meaning meterial 1 has 100%
                    }
                    data.floor_deck_layers.push(layer);
                }
            });
        case 'exposed_floor_above_GL':
            data.unheated_space_thermal_resistance = $('#unheated_space_thermal_resistance select').val();
            data.floor_deck_layers = [];
            $('.layer').each(function () {
                if ($(this).attr('layer') !='template'){
                    var layer = {
                        thickness: $(this).find('.thickness').val(),
                        thermal_conductivity_1: $(this).find('.material1').val(),
                    };
                    if($(this).find('.material2').val() != 'none'){
                        layer.length_2 = $(this).find('.length-material2').val();
                        layer.thermal_conductivity_2 = $(this).find('.material2').val();
                        layer.spacing = $(this).find('.spacing').val();
                    } else{                    
                        layer.length_2 = 0;
                        layer.thermal_conductivity_2 = 1; // doesn't matter the value
                        layer.spacing = 1; // meaning meterial 1 has 100%
                    }
                    data.floor_deck_layers.push(layer);
                }
            });
    }
    return data;
};

openFUVC.prototype.show_require_floor_inputs = function (type_of_floor) {
    var selector = '#openFUVC-modal .modal-body';
    // Hide all inputs and selects, then show the ones for the type_of_floor
    $(selector + ' .suspended_floor').hide();
    $(selector + ' .heated_basement').hide();
    $(selector + ' .slab_on_ground').hide();
    $(selector + ' .exposed_floor_above_GL').hide();
    $(selector + ' .all').show();
    $(selector + ' .' + type_of_floor).show();
    // Remove required from all the inputs, then add required to all the inputs for the type_of_floor
    $(selector + ' input').prop('required', false);
    $(selector + ' .all input').prop('required', true);
    $(selector + ' .' + type_of_floor + ' input').prop('required', true);
    // Trigger the change event that will show/hide and add required according to their stage
    $(selector + ' .' + type_of_floor + ' select').change();
    $(selector + ' .' + type_of_floor + ' input').change();
};

openFUVC.prototype.adjust_modal_height = function () {
    var height = 25 + $('#openFUVC-modal .modal-header').height() + $('#openFUVC-modal .modal-body').height() + $('#openFUVC-modal .modal-footer').height();
    if (height > window.innerHeight - 115) {
        var height = window.innerHeight - 115;
        $('#openFUVC-modal .modal-body').height(height - 150);
    }
    $('#openFUVC-modal').height(height);
};
