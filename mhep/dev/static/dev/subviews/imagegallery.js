class ImageGallery {
    constructor({ root, id, data }) {
        this.root = root;
        this.element = {
            list: this.root.querySelector('.gallery-list'),
            fileControl: this.root.querySelector('.gallery-files'),
        };
        this.projectId = id;
        this.list = data;
        var featured_image = this.list.find(image => image.is_featured === true);
        if (featured_image) {
            this.featured_id = featured_image.id;
        }
        this.selected = [];
        this.currentlyEditing = null;

        this.setupHandlers();
        this.view();
    }

    // ----------------------------------------------------------------- //
    // Actions
    //
    // When mutating `this.list`, be careful not to assign to it.  This is
    // to maintain the invariant `this.list === project.images` (i.e. both
    // are references to the same object).
    //
    // If you assign to this.list rather than mutating then the equivalence
    // will not longer hold, and the state will be mismanaged - when you
    // navigate away from and then back to the gallery, whatever changes
    // were made (and which are made on the server) will be lost to the UI
    // and things will get very confusing for the user.
    // ----------------------------------------------------------------- //

    select(id) {
        if (!this.selected.includes(id)) {
            this.selected.push(id);
        }
    }

    deselect(id) {
        this.selected = this.selected.filter(selectedId => selectedId !== id);
    }

    startEditing(id) {
        this.currentlyEditing = id;
    }

    stopEditing() {
        this.currentlyEditing = null;
    }

    setNote(id, note) {
        mhep_helper
            .set_image_note(id, note)
            .then(newData => {
                const imageIndex = this.list.findIndex(elem => elem.id === id);
                this.list[imageIndex] = newData;
                this.view();
            });
    }

    addImage(new_image) {
        this.list.push(new_image);
        this.view();
    }

    removeImage(id) {
        const idxToRemove = this.list.findIndex(image => image.id === id);
        this.list.splice(idxToRemove, 1);

        this.selected = this.selected.filter(selectedID => selectedID != id);
        this.view();
    }

    setFeatured(id) {
        mhep_helper
            .set_featured_image(this.projectId, id)
            .then(_ => {
                this.featured_id = id;
                this.view();
            });
    }

    delete(ids) {
        for (let id of ids) {
            mhep_helper.delete_image(id).then(_ => this.removeImage(id));
        }
    }

    upload(fileList) {
        for (let file of fileList) {
            mhep_helper
                .upload_image(this.projectId, file)
                .then(newData => this.addImage(newData));
        }
    }

    // ----------------------------------------------------------------- //
    // Predicates
    // ----------------------------------------------------------------- //

    isFeatured(id) {
        return this.featured_id === id;
    }

    isSelected(id) {
        return this.selected.includes(id);
    }

    isEditing(id) {
        return this.currentlyEditing === id;
    }

    // ----------------------------------------------------------------- //
    // Views & event handlers
    // ----------------------------------------------------------------- //

    view() {
        const galleryItems = this.list.map(item => this.imageToHTML(item)).join('');
        const deleteDisabled = this.selected.length === 0 ? 'disabled' : '';

        this.element.list.innerHTML = `
            <h4>Gallery</h4>
            <button class="btn gallery-delete-many" ${deleteDisabled}>
                Delete selected images
            </button>

            <div id="delete_result" style="margin: 0 0 25px 25px"></div>
            ${galleryItems}
        `;
    }

    imageToHTML({ id, url, thumbnail_url, thumbnail_width, thumbnail_height, name, note }) {
        const cardClasses = this.isSelected(id) ? 'gallery-card--selected' : '';
        const isSelected = this.isSelected(id) ? 'checked' : '';

        let noteDisplay = note.replace(/</gi, '&lt;').replace(/\n/gi, '<br>');

        const noteHTML = this.isEditing(id)
            ? `<textarea rows="6" class="gallery-editor" name='${id}'>${note}</textarea>`
            : (note
                ? `<span>${noteDisplay}</span>`
                : "<span class='text-muted'>no note</span>");

        if (this.isEditing(id)) {
            var buttonHTML = `
                <button class='btn btn-primary gallery-save-note'>Save note</button>
                <button class='btn gallery-cancel-note'>Cancel</button>`;
        } else {
            var buttonHTML = `
                <button class="btn btn--icon gallery-edit" data-id="${id}">
                    <svg><use xlink:href="#iconset-edit" /></svg>
                    Edit note
                </button>
                <button class="btn btn--icon gallery-delete" data-id="${id}">
                    <svg><use xlink:href="#iconset-trash" /></svg>
                    Delete
                </button>
                ${this.isFeatured(id) ?
        "<span class='badge'>Cover image</span>" :
        `<button class='btn gallery-feature' data-id='${id}'>Use as cover image</button>`
}`;
        }

        return `
            <div class="gallery-card ${cardClasses}">
                <a class="gallery-head" href='${url}' target="_blank" rel="noopener">
                   <img src="${thumbnail_url}" width="${thumbnail_width}" height="${thumbnail_height}">
                </a>
                <div class="gallery-content d-flex justify-content-between" style="flex-direction: column;">
                    <div class="d-flex justify-content-between" style="margin-bottom: 1rem">
                        ${noteHTML}
                    </div>

                    <div class="d-flex justify-content-between">
                        <span>
                            ${buttonHTML}
                        </span>
                        <input type='checkbox' class="gallery-checkbox" name="${id}" ${isSelected}>
                    </div>
                </div>
            </div>`;
    }

    setupHandlers() {
        const idFromEvent = evt => parseInt(evt.target.dataset.id, 10);

        $(this.root).on('change', '.gallery-checkbox', evt => {
            const checkbox = evt.target;
            const id = parseInt(checkbox.name, 10);
            if (checkbox.checked) {
                this.select(id);
            } else {
                this.deselect(id);
            }

            this.view();
        });

        $(this.root).on('click', '.gallery-feature', evt => {
            this.setFeatured(idFromEvent(evt));
            this.view();
        });

        $(this.root).on('click', '.gallery-edit', evt => {
            this.startEditing(idFromEvent(evt));
            this.view();
            $(this.root).find('.gallery-editor').focus();
        });

        const saveNote = () => {
            const input = this.root.querySelector('.gallery-editor');

            const id = parseInt(input.name, 10);
            const note = input.value;

            this.setNote(id, note);
            this.stopEditing();
            this.view();
        };

        $(this.root).on('click', '.gallery-save-note', saveNote);
        $(this.root).on('keydown', '.gallery-editor', evt => {
            if (evt.key === 'Esc' || evt.key === 'Escape') {
                this.stopEditing();
                this.view();
            }
        });

        $(this.root).on('click', '.gallery-cancel-note', evt => {
            this.stopEditing();
            this.view();
        });

        $(this.root).on('click', '.gallery-delete', evt => {
            if (window.confirm('Are you sure you want to delete this image?')) {
                this.delete([ idFromEvent(evt) ]);
                this.view();
            }
        });

        $(this.root).on('click', '.gallery-delete-many', evt => {
            const n = this.selected.length;
            if (window.confirm(`Are you sure you want to delete these ${n} images?`)) {
                this.delete(this.selected);
                this.view();
            }
        });

        $(this.root).on('click', '.gallery-upload', evt => {
            this.upload(this.element.fileControl.files);
        });
    }
}

let __imagegallery = null;

function imagegallery_initUI() {
    data = project['master'];

    __imagegallery = new ImageGallery({
        root: document.querySelector('.gallery'),
        id: p.id,
        data: p.images,
    });
}

function imagegallery_updateUI() {
    __imagegallery.view();
}
