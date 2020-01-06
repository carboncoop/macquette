console.log('debug libraries_manager.js');

var library_helper = new libraryHelper('', $('#openbem'));

function librariesmanager_UpdateUI() {
    //library_helper.init();
    $('#libraries-table').html('');

    const libraries_by_type = library_helper.library_list;

    var templateTable = $('#libraries-manager-table-template');
    var templateRow = $('#libraries-manager-row-template');

    for (let type of Object.keys(libraries_by_type).sort()) {
        let name = LIBRARY_NAMES[type];
        let libraries = libraries_by_type[type];

        var table = templateTable.clone();
        table.removeAttr('id');

        table.find('.library-type-name').html(name);

        for (let library of libraries) {
            var row = templateRow.clone();
            row.removeAttr('id');

            row.find('.library-name').html(library.name);
            row.find('[data-library-id=""]').attr('data-library-id', library.id);
            row.find('[data-owner-id=""]').attr('data-owner-id', library.owner.id);
            row.find('[data-library-name=""]').attr('data-library-name', library.name);

            var access = 'Write';
            if (!library.permissions.can_write) {
                access = 'Read';
                row.find('.if-write-access[data-library-id="' + library.id + '"]').hide();
            }

            if (!library.permissions.can_share) {
                row.find('.if-share-access[data-library-id="' + library.id + '"]').hide();
            }

            row.find('.library-access').html(access);
            row.find('.library-owner').html(library.owner.name);

            if (library.owner.type != 'organisation') {
                row.find('.share-library').hide();
            }

            row.show();
            table.find('tbody').append(row);
        }

        table.find('[data-library-type=""]').attr('data-library-type', type);

        table.show();
        $('#libraries-table').append(table);

    }
}
