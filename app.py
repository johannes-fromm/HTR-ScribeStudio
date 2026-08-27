#!/usr/bin/env python3
"""
ScribeStudio Backend Server
Zero-dependency HTTP server for the ScribeStudio transcription & segmentation tool.
GitHub Open-Source Release
"""

import os
import sys
import json
import urllib.parse
import mimetypes
import webbrowser
import argparse
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

# Base Paths
TOOL_DIR = Path(__file__).resolve().parent


class ScribeConfig:
    """Configurable directory paths for documents and annotations."""
    def __init__(self, images_dir=None, xml_dir=None, output_dir=None):
        self.tool_dir = TOOL_DIR
        
        # Smart Auto-Detection for directories
        project_dir = TOOL_DIR.parent
        
        # 1. Image directories (supports standalone and nested project layouts)
        if images_dir:
            self.image_dirs = [Path(images_dir).resolve()]
        else:
            self.image_dirs = []
            candidates = [
                TOOL_DIR / "sample_data" / "images",
                TOOL_DIR / "data" / "images",
                project_dir / "letters" / "image" / "resized",
                project_dir / "letters" / "image" / "resized_images_1024",
                project_dir / "letters" / "image",
                TOOL_DIR / "images"
            ]
            for c in candidates:
                if c.exists():
                    self.image_dirs.append(c.resolve())

        # 2. Original / Input XML directory
        if xml_dir:
            self.xml_dirs = [Path(xml_dir).resolve()]
        else:
            self.xml_dirs = []
            candidates = [
                TOOL_DIR / "sample_data" / "transkribus",
                TOOL_DIR / "data" / "transkribus",
                project_dir / "transkribus",
                project_dir / "letters" / "kraken_alto_xml_resized_images_1024",
                TOOL_DIR / "xml"
            ]
            for c in candidates:
                if c.exists():
                    self.xml_dirs.append(c.resolve())

        # 3. Output / Corrected XML directory
        if output_dir:
            self.output_dir = Path(output_dir).resolve()
        else:
            if (project_dir / "transkribus_manually_corrected").exists():
                self.output_dir = (project_dir / "transkribus_manually_corrected").resolve()
            elif (TOOL_DIR / "sample_data").exists():
                self.output_dir = (TOOL_DIR / "sample_data" / "transkribus_manually_corrected").resolve()
            else:
                self.output_dir = (TOOL_DIR / "corrected_xml").resolve()

        self.output_dir.mkdir(parents=True, exist_ok=True)


config = None


def find_image_file(doc_id, prefer_resized=True):
    """Finds image file prioritizing configured image search paths."""
    extensions = [".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"]
    
    dirs = config.image_dirs
    if not prefer_resized:
        dirs = list(reversed(config.image_dirs))

    for directory in dirs:
        if not directory.exists():
            continue
        for ext in extensions:
            candidate = directory / f"{doc_id}{ext}"
            if candidate.exists() and candidate.is_file():
                return candidate
    return None


class ScribeStudioHandler(SimpleHTTPRequestHandler):
    """Custom HTTP request handler with API endpoints for documents, images, and saving."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(TOOL_DIR), **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query = urllib.parse.parse_qs(parsed_url.query)

        if path == "/api/documents":
            self.handle_list_documents()
        elif path == "/api/document":
            doc_id = query.get("id", [""])[0]
            size = query.get("size", ["resized"])[0]
            self.handle_get_document(doc_id, size)
        elif path == "/api/image":
            file_path = query.get("path", [""])[0]
            doc_id = query.get("id", [""])[0]
            size = query.get("size", ["resized"])[0]
            self.handle_get_image(file_path, doc_id, size)
        elif path == "/api/xml":
            file_path = query.get("path", [""])[0]
            doc_id = query.get("id", [""])[0]
            source = query.get("source", ["transkribus"])[0]
            self.handle_get_xml(file_path, doc_id, source)
        else:
            super().do_GET()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        if path == "/api/save":
            self.handle_save_xml()
        else:
            self.send_error(404, "Endpoint not found")

    def _send_json(self, data, status_code=200):
        body = json.dumps(data, indent=2).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def handle_list_documents(self):
        """Scans the configured workspace directories and returns available documents."""
        docs = {}

        # 1. Check Images
        for img_dir in config.image_dirs:
            if img_dir.exists():
                for img_file in sorted(img_dir.iterdir()):
                    if img_file.is_file() and not img_file.name.startswith(".") and img_file.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"]:
                        base_id = img_file.stem
                        if base_id not in docs:
                            docs[base_id] = {
                                "id": base_id,
                                "image_filename": img_file.name,
                                "has_image": True,
                                "has_transkribus": False,
                                "has_corrected": False,
                                "has_alto": False,
                                "transkribus_path": None,
                                "corrected_path": None,
                                "alto_path": None
                            }

        # 2. Check XMLs
        for xml_dir in config.xml_dirs:
            if xml_dir.exists():
                for xml_file in sorted(xml_dir.iterdir()):
                    if xml_file.is_file() and not xml_file.name.startswith(".") and xml_file.suffix.lower() == ".xml":
                        base_id = xml_file.stem
                        if base_id not in docs:
                            docs[base_id] = {
                                "id": base_id,
                                "image_filename": f"{base_id}.jpg",
                                "has_image": find_image_file(base_id) is not None,
                                "has_transkribus": True,
                                "has_corrected": False,
                                "has_alto": False,
                                "transkribus_path": str(xml_file),
                                "corrected_path": None,
                                "alto_path": None
                            }
                        else:
                            docs[base_id]["has_transkribus"] = True
                            docs[base_id]["transkribus_path"] = str(xml_file)

        # 3. Check Corrected XML Directory
        if config.output_dir.exists():
            for xml_file in sorted(config.output_dir.iterdir()):
                if xml_file.is_file() and not xml_file.name.startswith(".") and xml_file.suffix.lower() == ".xml":
                    base_id = xml_file.stem
                    if base_id in docs:
                        docs[base_id]["has_corrected"] = True
                        docs[base_id]["corrected_path"] = str(xml_file)
                    else:
                        docs[base_id] = {
                            "id": base_id,
                            "image_filename": f"{base_id}.jpg",
                            "has_image": find_image_file(base_id) is not None,
                            "has_transkribus": False,
                            "has_corrected": True,
                            "has_alto": False,
                            "transkribus_path": None,
                            "corrected_path": str(xml_file),
                            "alto_path": None
                        }

        doc_list = sorted(list(docs.values()), key=lambda d: d["id"])
        self._send_json({"documents": doc_list, "count": len(doc_list)})

    def handle_get_document(self, doc_id, size="resized"):
        """Fetches metadata, image URL, and best available XML for a document ID."""
        if not doc_id:
            self._send_json({"error": "Missing 'id' parameter"}, 400)
            return

        prefer_resized = (size != "original")
        img_path = find_image_file(doc_id, prefer_resized=prefer_resized)

        corrected_xml = config.output_dir / f"{doc_id}.xml"
        orig_xml = None
        for xdir in config.xml_dirs:
            candidate = xdir / f"{doc_id}.xml"
            if candidate.exists():
                orig_xml = candidate
                break

        xml_source = None
        xml_content = None
        xml_path = None

        if corrected_xml.exists():
            xml_source = "corrected"
            xml_path = str(corrected_xml)
            xml_content = corrected_xml.read_text(encoding="utf-8", errors="replace")
        elif orig_xml and orig_xml.exists():
            xml_source = "transkribus"
            xml_path = str(orig_xml)
            xml_content = orig_xml.read_text(encoding="utf-8", errors="replace")

        response_data = {
            "id": doc_id,
            "has_image": img_path is not None and img_path.exists(),
            "image_url": f"/api/image?id={urllib.parse.quote(doc_id)}&size={size}" if img_path else None,
            "image_is_resized": img_path is not None and ("resized" in str(img_path)),
            "xml_source": xml_source,
            "xml_path": xml_path,
            "xml_content": xml_content,
            "has_corrected": corrected_xml.exists(),
            "has_transkribus": orig_xml is not None and orig_xml.exists(),
            "has_alto": False
        }
        self._send_json(response_data)

    def handle_get_image(self, file_path, doc_id, size="resized"):
        """Streams image bytes with proper content-type header."""
        target_path = None
        if file_path:
            target_path = Path(file_path).resolve()
        elif doc_id:
            prefer_resized = (size != "original")
            target_path = find_image_file(doc_id, prefer_resized=prefer_resized)

        if not target_path or not target_path.exists() or not target_path.is_file():
            self.send_error(404, "Image file not found")
            return

        mime_type, _ = mimetypes.guess_type(str(target_path))
        if not mime_type:
            mime_type = "image/jpeg"

        try:
            with open(target_path, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", mime_type)
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_error(500, f"Error reading image: {e}")

    def handle_get_xml(self, file_path, doc_id, source):
        """Fetches XML content by explicit path or doc_id."""
        target_path = None
        if file_path:
            target_path = Path(file_path).resolve()
        elif doc_id:
            if source == "corrected":
                target_path = config.output_dir / f"{doc_id}.xml"
            else:
                for xdir in config.xml_dirs:
                    cand = xdir / f"{doc_id}.xml"
                    if cand.exists():
                        target_path = cand
                        break

        if not target_path or not target_path.exists() or not target_path.is_file():
            self.send_error(404, "XML file not found")
            return

        try:
            content = target_path.read_text(encoding="utf-8", errors="replace")
            self._send_json({
                "doc_id": doc_id,
                "source": source,
                "path": str(target_path),
                "content": content
            })
        except Exception as e:
            self._send_json({"error": f"Failed to read XML: {e}"}, 500)

    def handle_save_xml(self):
        """Saves edited XML to output directory or custom path."""
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            data = json.loads(body)

            doc_id = data.get("id")
            xml_content = data.get("xml_content")
            destination = data.get("destination", "corrected")

            if not doc_id or not xml_content:
                self._send_json({"error": "Missing 'id' or 'xml_content' in payload"}, 400)
                return

            target_file = config.output_dir / f"{doc_id}.xml"
            target_file.parent.mkdir(parents=True, exist_ok=True)

            temp_file = target_file.with_suffix(".tmp")
            temp_file.write_text(xml_content, encoding="utf-8")
            temp_file.replace(target_file)

            self._send_json({
                "success": True,
                "message": f"Successfully saved XML for {doc_id}",
                "path": str(target_file),
                "saved_to": destination
            })
        except Exception as e:
            self._send_json({"error": f"Failed to save XML: {e}"}, 500)


def run_server(port=8000, host="127.0.0.1", open_browser=True, images_dir=None, xml_dir=None, output_dir=None):
    """Runs the HTTP server and opens the browser."""
    global config
    config = ScribeConfig(images_dir=images_dir, xml_dir=xml_dir, output_dir=output_dir)

    actual_port = port
    server = None
    for attempt in range(10):
        try:
            server = HTTPServer((host, actual_port), ScribeStudioHandler)
            break
        except OSError:
            actual_port += 1

    if not server:
        print(f"Error: Could not bind to any port in range {port}-{actual_port}", file=sys.stderr)
        sys.exit(1)

    url = f"http://{host}:{actual_port}/index.html"
    print("\n" + "=" * 60)
    print(" 🖋️  ScribeStudio — Transcription & Segmentation Tool")
    print("=" * 60)
    print(f" Server running locally at: {url}")
    print(f" Output directory: {config.output_dir}")
    print(" Press Ctrl+C to stop the server.")
    print("=" * 60 + "\n")

    if open_browser:
        try:
            webbrowser.open(url)
        except Exception:
            pass

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping ScribeStudio server...")
        server.server_close()
        print("Server stopped. Goodbye!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Start ScribeStudio Server")
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on (default: 8000)")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host to bind to (default: 127.0.0.1)")
    parser.add_argument("--images-dir", type=str, default=None, help="Custom path to images directory")
    parser.add_argument("--xml-dir", type=str, default=None, help="Custom path to PAGE-XML / ALTO directory")
    parser.add_argument("--output-dir", type=str, default=None, help="Custom path for saving corrected XMLs")
    parser.add_argument("--no-browser", action="store_true", help="Do not automatically open the browser")

    args = parser.parse_args()
    run_server(
        port=args.port,
        host=args.host,
        open_browser=not args.no_browser,
        images_dir=args.images_dir,
        xml_dir=args.xml_dir,
        output_dir=args.output_dir
    )
