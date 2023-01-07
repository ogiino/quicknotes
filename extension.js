/* extension.js */
'use strict';

const { St, GObject, Gio, GLib } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const ModalDialog = imports.ui.modalDialog;

let quickNotes;

const NewNoteDialog = GObject.registerClass(
class NewNoteDialog extends ModalDialog.ModalDialog {
    _init(callback) {
        super._init();

        let content = new St.BoxLayout({
            style_class: 'note-dialog-content',
            vertical: true
        });

        let entry = new St.Entry({
            style_class: 'note-dialog-entry',
            hint_text: 'Enter note title...',
            can_focus: true
        });
        content.add_child(entry);

        this.contentLayout.add_child(content);

        this.addButton({
            label: 'Cancel',
            action: () => {
                this.close();
            }
        });

        this.addButton({
            label: 'Create',
            action: () => {
                let title = entry.get_text().trim();
                if (title) {
                    callback(title);
                }
                this.close();
            }
        });
    }
});

const QuickNotesIndicator = GObject.registerClass(
class QuickNotesIndicator extends PanelMenu.Button {
    _init() {
        super._init(0, "Quick Notes");

        let hbox = new St.BoxLayout({ style_class: 'panel-status-menu-box' });
        let icon = new St.Icon({
            icon_name: 'text-editor-symbolic',
            style_class: 'system-status-icon'
        });
        hbox.add_child(icon);
        this.add_child(hbox);

        // Create notes directory
        this._notesDir = GLib.build_filenamev([GLib.get_home_dir(), '.quicknotes']);
        let dir = Gio.File.new_for_path(this._notesDir);
        if (!dir.query_exists(null)) {
            dir.make_directory_with_parents(null);
        }

        this._buildMenu();
        this._refreshNotes();
    }

    _buildMenu() {
        // Add Note button
        let addNoteItem = new PopupMenu.PopupMenuItem('Add Note');
        addNoteItem.connect('activate', () => {
            let dialog = new NewNoteDialog((title) => {
                this._createNewNote(title);
            });
            dialog.open();
        });
        this.menu.addMenuItem(addNoteItem);

        // Separator
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Simple search entry
        let searchItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
            style_class: 'search-item'
        });
        
        this._searchEntry = new St.Entry({
            hint_text: 'Search notes...',
            track_hover: true,
            can_focus: true,
            style_class: 'note-search-entry',
            x_expand: true
        });
        
        this._searchEntry.clutter_text.connect('text-changed', () => {
            this._filterNotes();
        });
        
        searchItem.add_child(this._searchEntry);
        this.menu.addMenuItem(searchItem);

        // Separator
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Open Notes Folder
        let openFolderItem = new PopupMenu.PopupMenuItem('Open Notes Folder');
        openFolderItem.connect('activate', () => {
            let uri = `file://${this._notesDir}`;
            try {
                Gio.AppInfo.launch_default_for_uri(uri, null);
            } catch (e) {
                log(`Error opening folder: ${e.message}`);
            }
        });
        this.menu.addMenuItem(openFolderItem);

        // Separator
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Notes section
        this._notesSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._notesSection);
    }

    _refreshNotes() {
        // Clear existing items
        this._notesSection.removeAll();
        this._noteItems = [];  // Store note items for filtering
        
        let dir = Gio.File.new_for_path(this._notesDir);
        let enumerator = dir.enumerate_children('standard::*', Gio.FileQueryInfoFlags.NONE, null);
        
        let info;
        while ((info = enumerator.next_file(null))) {
            if (info.get_file_type() === Gio.FileType.REGULAR && 
                info.get_name().endsWith('.md')) {
                let filename = info.get_name();
                let title = this._getTitleFromFilename(filename);
                
                // Create menu item without label
                let noteItem = new PopupMenu.PopupMenuItem('');
                
                // Create a container for the title and buttons
                let itemBox = new St.BoxLayout({
                    x_expand: true,
                    style_class: 'note-item-box'
                });
                
                // Add the title
                let titleLabel = new St.Label({ 
                    text: title,
                    y_align: St.Align.MIDDLE
                });
                itemBox.add_child(titleLabel);

                // Add a expanding spacer
                let spacer = new St.Widget({
                    style_class: 'note-item-spacer',
                    x_expand: true
                });
                itemBox.add_child(spacer);

                // Add edit and delete buttons
                let buttonBox = new St.BoxLayout({
                    style_class: 'popup-menu-item-buttons',
                    x_align: St.Align.END
                });

                let editIcon = new St.Icon({
                    icon_name: 'document-edit-symbolic',
                    style_class: 'popup-menu-icon'
                });
                let editButton = new St.Button({
                    style_class: 'button',
                    child: editIcon
                });
                editButton.connect('clicked', () => {
                    this._editNote(filename);
                    this.menu.close();
                });

                let deleteIcon = new St.Icon({
                    icon_name: 'edit-delete-symbolic',
                    style_class: 'popup-menu-icon'
                });
                let deleteButton = new St.Button({
                    style_class: 'button',
                    child: deleteIcon
                });
                deleteButton.connect('clicked', () => {
                    this._deleteNote(filename);
                    this.menu.close();
                });

                buttonBox.add_child(editButton);
                buttonBox.add_child(deleteButton);
                itemBox.add_child(buttonBox);
                
                noteItem.add_child(itemBox);
                
                // Store the item with its title for filtering
                this._noteItems.push({
                    item: noteItem,
                    title: title.toLowerCase()
                });
                
                this._notesSection.addMenuItem(noteItem);
            }
        }
        
        // Apply current filter if search is active
        if (this._searchEntry && this._searchEntry.get_text() !== '') {
            this._filterNotes();
        }
    }

    _getTitleFromFilename(filename) {
        // Remove .md extension
        let title = filename.slice(0, -3);
        return decodeURIComponent(title);
    }

    _createNewNote(title) {
        let safeTitle = encodeURIComponent(title);
        let notePath = GLib.build_filenamev([this._notesDir, `${safeTitle}.md`]);
        let file = Gio.File.new_for_path(notePath);
        
        try {
            let stream = file.create(Gio.FileCreateFlags.NONE, null);
            stream.write_all(`# ${title}\n\n`, null);
            stream.close(null);
            this._editNote(`${safeTitle}.md`);
            this._refreshNotes();
        } catch (e) {
            log(`Error creating note: ${e.message}`);
        }
    }

    _editNote(filename) {
        let path = GLib.build_filenamev([this._notesDir, filename]);
        let uri = `file://${path}`;
        try {
            Gio.AppInfo.launch_default_for_uri(uri, null);
        } catch (e) {
            log(`Error opening note: ${e.message}`);
        }
    }

    _deleteNote(filename) {
        let file = Gio.File.new_for_path(GLib.build_filenamev([this._notesDir, filename]));
        try {
            file.delete(null);
            this._refreshNotes();
        } catch (e) {
            log(`Error deleting note: ${e.message}`);
        }
    }

    _filterNotes() {
        if (!this._noteItems) return;
        
        let searchText = this._searchEntry.get_text().toLowerCase();
        
        for (let noteData of this._noteItems) {
            let visible = searchText === '' || noteData.title.includes(searchText);
            noteData.item.actor.visible = visible;
        }
    }
});

function init() {
    log('initializing quick-notes extension');
}

function enable() {
    log('enabling quick-notes extension');
    quickNotes = new QuickNotesIndicator();
    Main.panel.addToStatusArea('quick-notes', quickNotes, 0, 'right');
}

function disable() {
    log('disabling quick-notes extension');
    if (quickNotes) {
        quickNotes.destroy();
        quickNotes = null;
    }
}
