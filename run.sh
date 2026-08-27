#!/bin/bash
# ==============================================================================
# ScribeStudio Launcher
# ==============================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "🖋️ Starting ScribeStudio on http://127.0.0.1:8000 ..."
python3 app.py "$@"
