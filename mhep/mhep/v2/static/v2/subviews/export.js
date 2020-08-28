console.log('Debug export.js');

$('#openbem').on('click', '#import-data', function () {
    project = JSON.parse($('#import').val());
    project.master.imagegallery = [];

    update();
    mhep_helper.set(projectid, project, function (result) {
        alertifnotlogged(result);
    });
    redraw_scenario_menu();
});

$('#openbem').on('click', '#show-project-data', function () {
    $('#export').val(JSON.stringify(project, null, 4));
});

$('#openbem').on('click', '#download-project-data', function () {
    var data = JSON.stringify(project, null, 4);
    var d = new Date();
    var filename = p.name + '-' + d.toLocaleString() + '.json';

    var element = document.createElement('a');
    element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(data));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    setTimeout(() => {
        document.body.removeChild(element);
    }, 150);
});

$('#upload_project').submit(function (e) {
    e.preventDefault();

    var file = $('#file_to_upload')[0].files[0];
    var fr = new FileReader();
    var file_text = '';

    fr.onload = receivedText;
    fr.readAsText(file);

    function receivedText() {
        try {
            var project_to_load = JSON.parse(fr.result); // I was worried about code injection here, but it seems that using JSON.parse is safe enough: //https://www.whitehatsec.com/blog/handling-untrusted-json-safely/
            try {
                for (scenario in project_to_load) {
                    calc.run(project_to_load[scenario]);
                } // Running all the scenarios we check if the JSON string is a valid MHEP project, if it is not we catch the exception
                project = project_to_load;
                project.master.imagegallery = [];
                update();
                $('#upload-result').css('color', 'black').html('Project uploaded and imported');
                redraw_scenario_menu();
            } catch (e) {
                $('#upload-result').css('color', 'red').html('The uploaded project is corrupted');
            }
        } catch (e) {
            $('#upload-result').css('color', 'red').html('The uploaded file is not valid (not a JSON string)');
        }
        console.log(project_to_load);
    }
});

$('#openbem').on('click', '#file_to_upload', function () {
    $('#upload-result').css('color', 'black').html('');
});

function export_initUI() {
}
