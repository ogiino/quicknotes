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

        // Add Note button
        let addNoteItem = new PopupMenu.PopupMenuItem('Add Note');
        addNoteItem.connect('activate', () => {
            let dialog = new NewNoteDialog((title) => {
                this._createNewNote(title);
            });
            dialog.open();
        });
        this.menu.addMenuItem(addNoteItem);

        // Add separator
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Add test item
        let testItem = new PopupMenu.PopupMenuItem('Test Item');
        testItem.connect('activate', () => {
            log('Test item clicked');
        });
        this.menu.addMenuItem(testItem);
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
