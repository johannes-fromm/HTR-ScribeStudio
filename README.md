# 🖋️ ScribeStudio

<p align="center">
  <b>A fast, lightweight, and modern web application for handwritten text recognition (HTR) transcription correction and document segmentation ground-truthing.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.8+-3776AB?style=flat&logo=python&logoColor=white" alt="Python 3.8+"/>
  <img src="https://img.shields.io/badge/Dependencies-Zero-success?style=flat" alt="Zero Dependencies"/>
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"/>
  <img src="https://img.shields.io/badge/Format-PAGE--XML%20%7C%20ALTO%20%7C%20Surya%20JSON-orange" alt="Formats: PAGE-XML, ALTO, Surya JSON"/>
</p>

---

## 🌟 Why ScribeStudio?

Historical document transcription and ground-truth validation often suffer from heavy, bug-prone web frameworks, complex Docker setups, or sluggish polygon rendering. 

**ScribeStudio** is built as a zero-dependency, ultra-responsive tool designed specifically for:
- Rapid transcription verification and correction with automatic line focus snippets.
- Real-time segmentation geometry inspection and polygon vertex adjustments.
- **PAGE-XML**, **ALTO-XML**, and common **Surya JSON** output parsing, editing, and saving.
- Complete data privacy: runs 100% locally on your machine with no data transmitted over the network.

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.8+** (uses only standard libraries).
- Modern web browser (Chrome, Firefox, Safari, Edge).
- **No external pip packages, no npm/Node.js, no Docker needed!**

### Run ScribeStudio
Clone the repository and run:

```bash
# Clone the repository
git clone https://github.com/johannes-fromm/ScribeStudio.git
cd ScribeStudio

# Start the server (Option A)
./run.sh

# Or run with Python directly (Option B)
python3 app.py
```

ScribeStudio will automatically launch in your default web browser at `http://127.0.0.1:8000`.

---

## ✨ Features

### ⚡ 1. Rapid Transcription Mode
- **Focused Line Crop**: Magnified high-resolution snippet of the active text line displayed right above the input field.
- **Continuous Keyboard Workflow**:
  - Type text and press <kbd>Enter</kbd> or <kbd>Tab</kbd> to save and instantly advance to the next line.
  - Press <kbd>Shift + Enter</kbd> to jump back to the previous line.
  - Press <kbd>Delete</kbd> or <kbd>Ctrl + D</kbd> to delete redundant or unreadable lines.
- **Diacritics & Editorial Helpers**: 1-click toolbar for historical German/French characters and editorial marks (`ä`, `ö`, `ü`, `ß`, `«`, `»`, `–`, `°`, `§`, `[?]`, `[...]`).

### 🔍 2. Interactive Vector Canvas
- **Deep Zoom & Pan**: Smooth mouse-wheel/pinch zoom with pan navigation.
- **Auto Coordinate Scaling**: Seamlessly aligns segmentation overlays regardless of whether your scans are 1024px normalized or 5000px high-resolution raw scans.
- **Scan Enhancement Filters**: Real-time Brightness, Contrast, and Invert Scan filters to easily decipher faint historical ink.
- **Vector Layers**: Toggle polygon bounds, baselines, line numbers, and in-situ text overlay.

### ✏️ 3. Segmentation Editing
- **Select & Pan Mode** (<kbd>V</kbd>): Click on any line polygon to focus and edit.
- **Vertex Mode** (<kbd>E</kbd>): Click and drag polygon vertices to adjust bounding box bounds.
- **Draw Box Mode** (<kbd>D</kbd>): Click and drag directly on the scan to create new text lines.

### 💾 4. Saving & Export
- **1-Click Local Save** (<kbd>Ctrl + S</kbd> / <kbd>Cmd + S</kbd>): Saves directly to your output directory with complete PAGE-XML metadata and coordinate preservation.
- **Export Options**:
  - Download modified PAGE-XML
  - Download ALTO-XML
  - Export Full Text (`.txt`)
  - Export Line Segmentation Table (`.csv`)
- **Full Undo / Redo Stack** (<kbd>Ctrl + Z</kbd> / <kbd>Ctrl + Y</kbd>).

---

## ⚙️ CLI Options & Custom Directories

You can point ScribeStudio to any custom directories using command-line arguments:

```bash
python3 app.py --images-dir /path/to/scans \
               --xml-dir /path/to/xmls \
               --output-dir /path/to/corrected_xml \
               --port 8080
```

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--images-dir` | Path to directory containing document scans | Auto-detected |
| `--xml-dir` | Path to directory containing input XML or Surya JSON files | Auto-detected |
| `--output-dir` | Path where corrected XMLs will be saved | `./corrected_xml` |
| `--port` | Port to bind local HTTP server | `8000` |
| `--host` | Host address | `127.0.0.1` (Local loopback) |
| `--no-browser` | Do not automatically open browser on launch | `False` |

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Action |
| :--- | :--- |
| <kbd>Enter</kbd> / <kbd>Tab</kbd> | Save current line and jump to next line |
| <kbd>Shift + Enter</kbd> | Jump to previous line |
| <kbd>Delete</kbd> / <kbd>Ctrl + D</kbd> | Delete selected line |
| <kbd>Ctrl + S</kbd> / <kbd>Cmd + S</kbd> | Save XML to output directory |
| <kbd>Ctrl + Z</kbd> / <kbd>Cmd + Z</kbd> | Undo |
| <kbd>Ctrl + Y</kbd> / <kbd>Shift + Cmd + Z</kbd> | Redo |
| <kbd>Alt + Left</kbd> / <kbd>Alt + Right</kbd> | Navigate to Previous / Next document |
| <kbd>V</kbd> | Select & Pan tool |
| <kbd>E</kbd> | Edit polygon vertices tool |
| <kbd>D</kbd> | Draw new line box tool |
| <kbd>F</kbd> | Fit document scan to page |
| <kbd>W</kbd> | Fit document scan to width |
| <kbd>0</kbd> | Reset zoom (100% 1:1 view) |
| <kbd>?</kbd> | Open Keyboard Shortcuts Cheat Sheet |

---

## 🔒 Privacy & Local Security

- ScribeStudio strictly binds to `127.0.0.1` (the local loopback network interface).
- No telemetry, no tracking, and no internet communication. All files are loaded and saved directly to your local file system.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
