function handleServerError(intendedAction) {
    /*
    pass this into $.ajax() as the error parameter for example
    ```
      $ajax({
        success: function(response) { ... },
        error: handleServerError('listing libraries'),
        ...
      })
    ```
    */

    return function(jqXHR, textStatus, errorThrown) {
        let msg = jqXHR.statusText;
        if (jqXHR.responseJSON) {
            msg += ': ' + JSON.stringify(jqXHR.responseJSON);
        }

        console.error('jqXHR:', jqXHR);
        console.error('textStatus:', textStatus);
        console.error('errorThrown:', errorThrown);
        console.error('responseJSON: ', jqXHR.responseJSON);
        console.error('error ' + intendedAction + ': server returned: HTTP ' + jqXHR.status + ': ' + msg);
        alert('Error ' + intendedAction + '. The server responded: HTTP ' + jqXHR.status + ': ' + msg);
    };
}
