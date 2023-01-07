# Quick Notes GNOME Shell Extension

A simple and efficient note-taking extension for GNOME Shell that allows you to create, edit, and manage your notes directly from the top bar.

## Features

- 📝 Create new notes with custom titles
- 🔍 Search through your notes in real-time
- ✏️ Edit notes in your default text editor
- 🗑️ Delete notes with a single click
- 📁 Open notes folder directly
- 📋 Markdown format support
- 🎯 Clean and intuitive interface

## Installation

### From extensions.gnome.org
*(Coming soon)*

### Manual Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/dsabolo/quicknotes.git
   ```

2. Copy the extension to GNOME Shell's extensions directory:
   ```bash
   cp -r quicknotes ~/.local/share/gnome-shell/extensions/quicknotes@dsabolo.github.io
   ```

3. Restart GNOME Shell:
   - On X11: Press Alt+F2, type 'r' and press Enter
   - On Wayland: Log out and log back in

4. Enable the extension:
   ```bash
   gnome-extensions enable quicknotes@dsabolo.github.io
   ```

## Usage

1. Click the Quick Notes icon in the top bar (looks like a text editor)
2. To create a new note:
   - Click "Add Note"
   - Enter a title for your note
   - Click "Create"

3. To edit a note:
   - Click the edit (pencil) icon next to the note
   - Your default text editor will open with the note

4. To delete a note:
   - Click the delete (trash) icon next to the note

5. To search notes:
   - Type in the search box
   - Notes will be filtered in real-time as you type

6. To access your notes folder:
   - Click "Open Notes Folder"

## Storage

Notes are stored as markdown files in the `~/.quicknotes` directory. Each note is saved with the `.md` extension, making them easily readable and editable with any text editor.

## Requirements

- GNOME Shell 42
- A text editor for editing notes (the system default will be used)

## Development

To contribute to Quick Notes:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This extension is released under the MIT License. See the LICENSE file for more details.

## Author

Diego Sabolo
- GitHub: [@dsabolo](https://github.com/dsabolo)

## Acknowledgments

- GNOME Shell development team for their excellent documentation
- The GNOME Shell extensions community for inspiration and examples

## Support

If you encounter any issues or have suggestions, please file them in the [GitHub Issues](https://github.com/dsabolo/quicknotes/issues) section.
