/* extension.js */
"use strict";

const { St, GObject, Gio, GLib } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const ModalDialog = imports.ui.modalDialog;

let quickNotes;

/**
 * Dialog for creating a new note
 */
const NewNoteDialog = GObject.registerClass(
  class NewNoteDialog extends ModalDialog.ModalDialog {
    _init(callback) {
      super._init();

      let content = new St.BoxLayout({
        style_class: "note-dialog-content",
        vertical: true,
      });

      let entry = new St.Entry({
        style_class: "note-dialog-entry",
        hint_text: "Enter note title...",
        can_focus: true,
      });
      content.add_child(entry);

      this.contentLayout.add_child(content);

      this.addButton({
        label: "Cancel",
        action: () => {
          this.close();
        },
      });

      this.addButton({
        label: "Create",
        action: () => {
          let title = entry.get_text().trim();
          if (title) {
            callback(title);
          }
          this.close();
        },
      });
    }
  }
);

/**
 * Dialog for creating a new folder
 */
const NewFolderDialog = GObject.registerClass(
  class NewFolderDialog extends ModalDialog.ModalDialog {
    _init(callback) {
      super._init();

      let content = new St.BoxLayout({
        style_class: "note-dialog-content",
        vertical: true,
      });

      let entry = new St.Entry({
        style_class: "note-dialog-entry",
        hint_text: "Enter folder name...",
        can_focus: true,
      });
      content.add_child(entry);

      this.contentLayout.add_child(content);

      this.addButton({
        label: "Cancel",
        action: () => {
          this.close();
        },
      });

      this.addButton({
        label: "Create",
        action: () => {
          let name = entry.get_text().trim();
          if (name) {
            callback(name);
          }
          this.close();
        },
      });
    }
  }
);

/**
 * Main extension class that handles the panel indicator and note management
 */
const QuickNotesIndicator = GObject.registerClass(
  class QuickNotesIndicator extends PanelMenu.Button {
    _init() {
      super._init(0, "Quick Notes");

      let hbox = new St.BoxLayout({ style_class: "panel-status-menu-box" });
      let icon = new St.Icon({
        icon_name: "text-editor-symbolic",
        style_class: "system-status-icon",
      });
      hbox.add_child(icon);
      this.add_child(hbox);

      // Create notes directory
      this._notesDir = GLib.build_filenamev([
        GLib.get_home_dir(),
        ".quicknotes",
      ]);
      let dir = Gio.File.new_for_path(this._notesDir);
      if (!dir.query_exists(null)) {
        dir.make_directory_with_parents(null);
      }

      this._buildMenu();
      this._refreshNotes();
    }

    _buildMenu() {
      // Add Note button with icon
      let addNoteItem = new PopupMenu.PopupMenuItem("Add Note");
      let addIcon = new St.Icon({
        icon_name: "document-new-symbolic",
        style_class: "popup-menu-icon",
      });
      addNoteItem.insert_child_at_index(addIcon, 1);
      addNoteItem.connect("activate", () => {
        let dialog = new NewNoteDialog((title) => {
          this._createNewNote(title);
        });
        dialog.open();
      });
      this.menu.addMenuItem(addNoteItem);

      // Separator
      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

      // Search entry with icon
      let searchItem = new PopupMenu.PopupBaseMenuItem({
        reactive: false,
        can_focus: false,
        style_class: "search-item",
      });

      let searchBox = new St.BoxLayout({
        style_class: "search-box",
        x_expand: true,
      });

      let searchIcon = new St.Icon({
        icon_name: "edit-find-symbolic",
        style_class: "popup-menu-icon",
      });
      searchBox.add_child(searchIcon);

      this._searchEntry = new St.Entry({
        hint_text: "Search notes...",
        track_hover: true,
        can_focus: true,
        x_expand: true,
        style_class: "search-entry",
      });

      this._searchEntry.clutter_text.connect("text-changed", () => {
        this._filterNotes();
      });

      searchBox.add_child(this._searchEntry);
      searchItem.add_child(searchBox);
      this.menu.addMenuItem(searchItem);

      // Separator
      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

      // Open folder item with icon
      let openFolderItem = new PopupMenu.PopupMenuItem("Open Notes Folder");
      let openFolderIcon = new St.Icon({
        icon_name: "folder-symbolic",
        style_class: "popup-menu-icon",
      });
      openFolderItem.insert_child_at_index(openFolderIcon, 1);
      openFolderItem.connect("activate", () => {
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
      this._noteItems = []; // Store note items for filtering

      let dir = Gio.File.new_for_path(this._notesDir);
      let enumerator = dir.enumerate_children(
        "standard::*",
        Gio.FileQueryInfoFlags.NONE,
        null
      );

      let info;
      while ((info = enumerator.next_file(null))) {
        let filename = info.get_name();
        if (
          info.get_file_type() === Gio.FileType.REGULAR &&
          filename.endsWith(".md")
        ) {
          let title = this._getTitleFromFilename(filename);
          this._createNoteMenuItem(
            this._notesSection,
            filename,
            title,
            this._notesDir
          );
        }
      }
    }

    _createNoteMenuItem(menu, filename, title, parentPath) {
      let noteItem = new PopupMenu.PopupMenuItem("");

      let itemBox = new St.BoxLayout({
        x_expand: true,
        style_class: "note-item-box",
      });

      let titleLabel = new St.Label({
        text: title,
        y_align: St.Align.MIDDLE,
      });
      itemBox.add_child(titleLabel);

      let spacer = new St.Widget({
        style_class: "note-item-spacer",
        x_expand: true,
      });
      itemBox.add_child(spacer);

      let buttonBox = new St.BoxLayout({
        style_class: "popup-menu-item-buttons",
        x_align: St.Align.END,
      });

      let editIcon = new St.Icon({
        icon_name: "document-edit-symbolic",
        style_class: "popup-menu-icon",
      });
      let editButton = new St.Button({
        style_class: "button",
        child: editIcon,
      });
      editButton.connect("clicked", () => {
        this._editNote(filename, parentPath);
        this.menu.close();
      });

      let deleteIcon = new St.Icon({
        icon_name: "edit-delete-symbolic",
        style_class: "popup-menu-icon",
      });
      let deleteButton = new St.Button({
        style_class: "button",
        child: deleteIcon,
      });
      deleteButton.connect("clicked", () => {
        this._deleteNote(filename, parentPath);
        this.menu.close();
      });

      buttonBox.add_child(editButton);
      buttonBox.add_child(deleteButton);
      itemBox.add_child(buttonBox);

      noteItem.add_child(itemBox);

      this._noteItems.push({
        item: noteItem,
        filename: filename.toLowerCase(),
      });

      menu.addMenuItem(noteItem);
    }

    _editNote(filename, parentPath) {
      let path = GLib.build_filenamev([parentPath, filename]);
      log(`Attempting to open file at path: ${path}`);
      let file = Gio.File.new_for_path(path);

      try {
        if (!file.query_exists(null)) {
          log(`File does not exist at path: ${path}`);
          return;
        }
        let uri = file.get_uri();
        log(`Opening URI: ${uri}`);
        Gio.AppInfo.launch_default_for_uri(uri, null);
      } catch (e) {
        log(`Error opening note: ${e.message}`);
        log(`Full error details: ${e}`);
      }
    }

    _deleteNote(filename, parentPath) {
      let file = Gio.File.new_for_path(
        GLib.build_filenamev([parentPath, filename])
      );
      try {
        file.delete(null);
        this._refreshNotes();
      } catch (e) {
        log(`Error deleting note: ${e.message}`);
      }
    }

    _getTitleFromFilename(filename) {
      // Remove .md extension and replace underscores with spaces
      let title = filename.slice(0, -3);
      return title.replace(/_/g, " ");
    }

    _createNewNote(title) {
      let safeTitle = title.replace(/ /g, "_"); // Replace spaces with underscores instead of encoding
      let notePath = GLib.build_filenamev([this._notesDir, `${safeTitle}.md`]);
      let file = Gio.File.new_for_path(notePath);

      try {
        let stream = file.create(Gio.FileCreateFlags.NONE, null);
        stream.write_all(`# ${title}\n\n`, null);
        stream.close(null);
        this._editNote(`${safeTitle}.md`, this._notesDir);
        this._refreshNotes();
      } catch (e) {
        log(`Error creating note: ${e.message}`);
      }
    }

    _filterNotes() {
      let searchText = this._searchEntry.get_text().toLowerCase();

      // Utiliser le tableau _noteItems qui contient les références aux éléments et leurs noms de fichiers
      for (let noteItem of this._noteItems) {
        noteItem.item.visible = noteItem.filename.includes(searchText);
      }
    }
  }
);

/**
 * Initialize the extension
 * @returns {QuickNotesIndicator} The extension's main indicator instance
 */
function init() {
  log("initializing quick-notes extension");
}

/**
 * Enable the extension
 */
function enable() {
  log("enabling quick-notes extension");
  quickNotes = new QuickNotesIndicator();
  Main.panel.addToStatusArea("quick-notes", quickNotes, 0, "right");
}

/**
 * Disable the extension and clean up resources
 */
function disable() {
  log("disabling quick-notes extension");
  if (quickNotes) {
    quickNotes.destroy();
    quickNotes = null;
  }
}
