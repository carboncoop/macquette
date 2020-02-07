console.log('debug commentary.js');

function commentary_initUI() {
    let scenarios = [];
    for (let scenario_name in project) {
        if (scenario_name == 'master') {
            continue;
        }
        scenarios.push(scenario_name);
    }
    scenarios.sort();

    // Add overviews
    for (let s of scenarios) {
        let scenario = project[s];
        $('#overviews').append('<div id="overview-' + s + '" class="overview"></div>');
        load_view('#overview-' + s, 'topgraphic');
        $('#overviews #overview-' + s + ' #scenario-name').html(s.charAt(0).toUpperCase() + s.slice(1) + ' - ' + scenario.scenario_name);
        draw_openbem_graphics('#overview-' + s);
    }

    // Add overviews
    for (let scenario_name of scenarios) {
        const scenario = project[scenario_name];
        const root = document.importNode(document.getElementById('scenario-template').content, true);

        for (let control of root.querySelectorAll('[key]')) {
            let key = control.getAttribute('key').replace('XXX', scenario_name);
            control.setAttribute('key', key);
        }

        let scenario_num = scenario_name.charAt(8);
        for (let text of root.querySelectorAll('.scenario_num')) {
            text.textContent = scenario_num;
        }

        // We have to set up the initial values because we're not using a key starting
        // with "data.".  We're using "project.XXX" instead, because data is an alias to
        // the current scenario and we want to edit multiple scenarios on the same page.
        // The current "key" attribute setup doesn't allow for this. Luckily, the logic
        // that sets the model value on change works, so we just have to set the initial
        // value manually.
        $(root, '.scenario_name').val(scenario.scenario_name);
        $(root, '.scenario_description').val(scenario.scenario_description);

        $(root).insertBefore('#scenario-template');
    }

    // commentary belongs to master
    data = project['master'];
}
