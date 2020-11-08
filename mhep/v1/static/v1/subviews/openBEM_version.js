console.log("debug openBEM_version.js");

function openBEM_version_UpdateUI()
{
}

function openBEM_version_initUI() {
    // TODO: Link this version of openBEM to the app, don't hard code it like this.
    openBEM_version = "10.1.1";
    $('#releases').append("<option value='" + openBEM_version + "'>" + openBEM_version + "</option>");
}


$('#openbem').on('click', '#apply-version', function () {
    p.openbem_version = $('#releases').val();
    mhep_helper.set_openBEM_version(p.id, p.openbem_version, function (result) {
        if (result != false) {
            location.reload();
        }
    });
});
