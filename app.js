/**
 * ScribeStudio — Frontend Application Logic
 * Comprehensive Transcription & Segmentation Annotation Tool
 */

class ScribeStudio {
  constructor() {
    // Application State
    this.documents = [];
    this.currentDoc = null;
    this.imageLoaded = false;
    this.originalXmlRaw = "";
    this.currentXmlSource = "corrected"; // "corrected" | "transkribus" | "alto" | "custom"

    // Data Model: Regions and Lines
    this.metadata = {};
    this.imageDimensions = { width: 0, height: 0 };
    this.xmlDimensions = { width: 0, height: 0 };
    this.coordScale = { scaleX: 1.0, scaleY: 1.0 };
    this.lines = []; // Array of Line objects: { id, regionId, coords: [[x,y]...], baseline: [[x,y]...], text: "", order: 0, custom: "" }
    this.regions = []; // Array of Region objects: { id, coords: [[x,y]...], order: 0 }
    this.selectedLineIndex = -1;
    this.selectedVertexIndex = -1;
    this.isDirty = false;

    // Viewport & Transform State
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.panStartX = 0;
    this.panStartY = 0;

    // Tool Modes: "select", "vertices", "draw"
    this.currentTool = "select";
    this.isDrawingBox = false;
    this.drawStartPoint = null;
    this.tempDrawPolygon = null;

    // Layers Visibility & Image Filters
    this.showPolygons = true;
    this.showBaselines = true;
    this.showBadges = true;
    this.showTextOverlay = false;
    this.imageFilters = {
      brightness: 100,
      contrast: 100,
      opacity: 35,
      invert: false
    };

    // Undo / Redo History
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = 50;

    // DOM Elements Cache
    this.cacheDomElements();
    this.bindEvents();
    this.init();
  }

  cacheDomElements() {
    // Header & Document Selectors
    this.docSelect = document.getElementById("docSelect");
    this.prevDocBtn = document.getElementById("prevDocBtn");
    this.nextDocBtn = document.getElementById("nextDocBtn");
    this.sourceSelect = document.getElementById("sourceSelect");
    this.imageSizeSelect = document.getElementById("imageSizeSelect");
    this.saveStatusIndicator = document.getElementById("saveStatusIndicator");
    this.openCustomFilesBtn = document.getElementById("openCustomFilesBtn");
    this.saveBtn = document.getElementById("saveBtn");
    this.exportMenuBtn = document.getElementById("exportMenuBtn");
    this.exportDropdown = document.getElementById("exportDropdown");
    this.exportPageXmlBtn = document.getElementById("exportPageXmlBtn");
    this.exportAltoXmlBtn = document.getElementById("exportAltoXmlBtn");
    this.exportTxtBtn = document.getElementById("exportTxtBtn");
    this.exportCsvBtn = document.getElementById("exportCsvBtn");
    this.undoBtn = document.getElementById("undoBtn");
    this.redoBtn = document.getElementById("redoBtn");
    this.shortcutsBtn = document.getElementById("shortcutsBtn");
    this.themeToggleBtn = document.getElementById("themeToggleBtn");

    // Canvas & Viewport
    this.canvasViewport = document.getElementById("canvasViewport");
    this.canvasTransformWrapper = document.getElementById("canvasTransformWrapper");
    this.letterImage = document.getElementById("letterImage");
    this.vectorOverlay = document.getElementById("vectorOverlay");
    this.canvasLoadingOverlay = document.getElementById("canvasLoadingOverlay");
    this.zoomLevelDisplay = document.getElementById("zoomLevelDisplay");
    this.zoomInBtn = document.getElementById("zoomInBtn");
    this.zoomOutBtn = document.getElementById("zoomOutBtn");
    this.fitWidthBtn = document.getElementById("fitWidthBtn");
    this.fitPageBtn = document.getElementById("fitPageBtn");
    this.resetViewBtn = document.getElementById("resetViewBtn");

    // Canvas Tools
    this.toolSelectBtn = document.getElementById("toolSelectBtn");
    this.toolEditVerticesBtn = document.getElementById("toolEditVerticesBtn");
    this.toolDrawPolyBtn = document.getElementById("toolDrawPolyBtn");

    // Layer Controls & Filters
    this.togglePolygons = document.getElementById("togglePolygons");
    this.toggleBaselines = document.getElementById("toggleBaselines");
    this.toggleBadges = document.getElementById("toggleBadges");
    this.toggleTextOverlay = document.getElementById("toggleTextOverlay");
    this.imgFilterBtn = document.getElementById("imgFilterBtn");
    this.filterDropdown = document.getElementById("filterDropdown");
    this.filterBrightness = document.getElementById("filterBrightness");
    this.filterContrast = document.getElementById("filterContrast");
    this.filterOpacity = document.getElementById("filterOpacity");
    this.filterInvert = document.getElementById("filterInvert");
    this.resetFiltersBtn = document.getElementById("resetFiltersBtn");
    this.valBrightness = document.getElementById("valBrightness");
    this.valContrast = document.getElementById("valContrast");
    this.valOpacity = document.getElementById("valOpacity");

    // Focus Transcription Panel
    this.focusLineBadge = document.getElementById("focusLineBadge");
    this.focusLineId = document.getElementById("focusLineId");
    this.focusLineCoords = document.getElementById("focusLineCoords");
    this.prevLineBtn = document.getElementById("prevLineBtn");
    this.nextLineBtn = document.getElementById("nextLineBtn");
    this.deleteCurrentLineBtn = document.getElementById("deleteCurrentLineBtn");
    this.lineCropCanvas = document.getElementById("lineCropCanvas");
    this.cropPlaceholder = document.getElementById("cropPlaceholder");
    this.focusTranscriptInput = document.getElementById("focusTranscriptInput");
    this.charCountDisplay = document.getElementById("charCountDisplay");

    // Sidebar
    this.sidebarLineCount = document.getElementById("sidebarLineCount");
    this.lineSearchInput = document.getElementById("lineSearchInput");
    this.lineFilterSelect = document.getElementById("lineFilterSelect");
    this.linesListContainer = document.getElementById("linesListContainer");
    this.sidebarAddNewLineBtn = document.getElementById("sidebarAddNewLineBtn");

    // Modals
    this.customFilesModal = document.getElementById("customFilesModal");
    this.modalDropZone = document.getElementById("modalDropZone");
    this.modalImagePicker = document.getElementById("modalImagePicker");
    this.modalXmlPicker = document.getElementById("modalXmlPicker");
    this.modalImageSelectedName = document.getElementById("modalImageSelectedName");
    this.modalXmlSelectedName = document.getElementById("modalXmlSelectedName");
    this.modalLoadConfirmBtn = document.getElementById("modalLoadConfirmBtn");
    this.shortcutsModal = document.getElementById("shortcutsModal");
    this.toastContainer = document.getElementById("toastContainer");
  }

  async init() {
    this.showLoading("Scanning workspace documents...");
    await this.fetchDocumentList();
    if (this.documents.length > 0) {
      await this.loadDocument(this.documents[0].id);
    } else {
      this.hideLoading();
      this.showToast("No documents found in workspace. Open custom files to begin.", "info");
    }
  }

  // =========================================================================
  // Document Loading & API Communications
  // =========================================================================

  async fetchDocumentList() {
    try {
      const resp = await fetch("/api/documents");
      if (!resp.ok) throw new Error("Failed to fetch documents");
      const data = await resp.json();
      this.documents = data.documents || [];
      this.renderDocumentDropdown();
    } catch (e) {
      console.warn("Could not connect to backend server. Running in client-only mode:", e);
      this.documents = [];
    }
  }

  renderDocumentDropdown() {
    this.docSelect.innerHTML = "";
    if (this.documents.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No workspace docs found";
      this.docSelect.appendChild(opt);
      return;
    }

    this.documents.forEach((doc) => {
      const opt = document.createElement("option");
      opt.value = doc.id;
      const status = doc.has_corrected ? "✓ (Corrected)" : (doc.has_transkribus ? "• (Original)" : "○ (Image only)");
      opt.textContent = `${doc.id} ${status}`;
      this.docSelect.appendChild(opt);
    });
  }

  async loadDocument(docId, preferredSource = null) {
    this.showLoading(`Loading document ${docId}...`);
    this.currentDoc = this.documents.find(d => d.id === docId) || { id: docId };
    this.docSelect.value = docId;
    const imageSize = this.imageSizeSelect ? this.imageSizeSelect.value : "resized";

    try {
      const resp = await fetch(`/api/document?id=${encodeURIComponent(docId)}&size=${imageSize}`);
      if (!resp.ok) throw new Error("Document load failed");
      const docData = await resp.json();

      // Configure source selector
      this.sourceSelect.innerHTML = "";
      if (docData.has_corrected) {
        this.sourceSelect.appendChild(new Option("Manually Corrected", "corrected"));
      }
      if (docData.has_transkribus) {
        this.sourceSelect.appendChild(new Option("Transkribus Original", "transkribus"));
      }
      if (docData.has_alto) {
        this.sourceSelect.appendChild(new Option("ALTO XML (Kraken)", "alto"));
      }
      if (this.sourceSelect.options.length === 0) {
        this.sourceSelect.appendChild(new Option("No XML available", "none"));
      }

      const activeSource = preferredSource || docData.xml_source || "transkribus";
      this.sourceSelect.value = activeSource;
      this.currentXmlSource = activeSource;

      // Load Image first so dimensions are known
      if (docData.image_url) {
        await this.loadImage(docData.image_url);
      } else {
        this.clearImage();
      }

      // Parse XML with automatic coordinate scaling to match image
      if (docData.xml_content) {
        this.originalXmlRaw = docData.xml_content;
        this.parseXmlContent(docData.xml_content);
      } else {
        this.originalXmlRaw = "";
        this.lines = [];
        this.regions = [];
        this.xmlDimensions = { ...this.imageDimensions };
        this.coordScale = { scaleX: 1.0, scaleY: 1.0 };
      }

      this.resetHistory();
      this.setDirty(false);
      this.hideLoading();

      // Initial View Setup
      this.fitToPage();
      this.renderCanvas();
      this.renderSidebarList();

      if (this.lines.length > 0) {
        this.selectLine(0);
      } else {
        this.selectLine(-1);
      }

      this.showToast(`Loaded ${docId} (${this.lines.length} lines)`, "success");
    } catch (e) {
      this.hideLoading();
      this.showToast(`Error loading document: ${e.message}`, "error");
      console.error(e);
    }
  }

  async reloadCurrentXmlSource() {
    if (!this.currentDoc) return;
    const source = this.sourceSelect.value;
    if (source === "none") return;

    this.showLoading(`Loading ${source} XML...`);
    try {
      const resp = await fetch(`/api/xml?id=${encodeURIComponent(this.currentDoc.id)}&source=${source}`);
      if (!resp.ok) throw new Error("Failed to load XML");
      const data = await resp.json();
      this.currentXmlSource = source;
      this.originalXmlRaw = data.content;
      this.parseXmlContent(data.content);
      this.resetHistory();
      this.setDirty(false);
      this.renderCanvas();
      this.renderSidebarList();
      if (this.lines.length > 0) this.selectLine(0);
      this.hideLoading();
      this.showToast(`Loaded ${source} version`, "info");
    } catch (e) {
      this.hideLoading();
      this.showToast(`Error: ${e.message}`, "error");
    }
  }

  loadImage(src) {
    return new Promise((resolve, reject) => {
      this.letterImage.onload = () => {
        this.imageDimensions = {
          width: this.letterImage.naturalWidth,
          height: this.letterImage.naturalHeight
        };
        this.vectorOverlay.setAttribute("viewBox", `0 0 ${this.imageDimensions.width} ${this.imageDimensions.height}`);
        this.vectorOverlay.setAttribute("width", this.imageDimensions.width);
        this.vectorOverlay.setAttribute("height", this.imageDimensions.height);
        this.imageLoaded = true;
        resolve();
      };
      this.letterImage.onerror = () => {
        this.imageLoaded = false;
        reject(new Error("Failed to load letter scan image"));
      };
      this.letterImage.src = src;
    });
  }

  clearImage() {
    this.letterImage.src = "";
    this.imageLoaded = false;
    this.imageDimensions = { width: 1000, height: 1400 };
    this.vectorOverlay.setAttribute("viewBox", "0 0 1000 1400");
  }

  // =========================================================================
  // XML Parsing (PAGE-XML & ALTO-XML with Auto Coordinate Scaling)
  // =========================================================================

  parseXmlContent(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");

    const parseError = xmlDoc.querySelector("parsererror");
    if (parseError) {
      throw new Error("Invalid XML document: " + parseError.textContent);
    }

    this.lines = [];
    this.regions = [];

    if (xmlDoc.querySelector("PcGts") || xmlDoc.querySelector("Page")) {
      this.parsePageXml(xmlDoc);
    } else if (xmlDoc.querySelector("alto")) {
      this.parseAltoXml(xmlDoc);
    } else {
      throw new Error("Unrecognized XML format (expected PAGE-XML or ALTO)");
    }
  }

  parsePageXml(xmlDoc) {
    const metadataEl = xmlDoc.querySelector("Metadata");
    if (metadataEl) {
      this.metadata.creator = metadataEl.querySelector("Creator")?.textContent || "";
      this.metadata.created = metadataEl.querySelector("Created")?.textContent || "";
      this.metadata.lastChange = metadataEl.querySelector("LastChange")?.textContent || "";
    }

    const pageEl = xmlDoc.querySelector("Page");
    let xmlWidth = 0;
    let xmlHeight = 0;

    if (pageEl) {
      this.metadata.imageFilename = pageEl.getAttribute("imageFilename") || "";
      xmlWidth = parseInt(pageEl.getAttribute("imageWidth") || "0", 10);
      xmlHeight = parseInt(pageEl.getAttribute("imageHeight") || "0", 10);
      this.xmlDimensions = { width: xmlWidth, height: xmlHeight };

      if (!this.imageLoaded && xmlWidth > 0 && xmlHeight > 0) {
        this.imageDimensions = { width: xmlWidth, height: xmlHeight };
        this.vectorOverlay.setAttribute("viewBox", `0 0 ${xmlWidth} ${xmlHeight}`);
      }
    }

    // Determine scale factors if loaded image resolution differs from XML dimensions
    let scaleX = 1.0;
    let scaleY = 1.0;
    if (this.imageLoaded && xmlWidth > 0 && xmlHeight > 0) {
      scaleX = this.imageDimensions.width / xmlWidth;
      scaleY = this.imageDimensions.height / xmlHeight;
    }
    this.coordScale = { scaleX, scaleY };

    // Parse TextRegions
    const textRegions = xmlDoc.querySelectorAll("TextRegion");
    let lineOrderCounter = 1;

    textRegions.forEach((regionEl, rIdx) => {
      const regionId = regionEl.getAttribute("id") || `region_${rIdx + 1}`;
      const regionCoordsStr = regionEl.querySelector("Coords")?.getAttribute("points") || "";
      let regionCoords = this.parsePoints(regionCoordsStr);
      if (scaleX !== 1.0 || scaleY !== 1.0) {
        regionCoords = regionCoords.map(([x, y]) => [x * scaleX, y * scaleY]);
      }

      this.regions.push({
        id: regionId,
        coords: regionCoords,
        order: rIdx
      });

      // Parse TextLines
      const textLines = regionEl.querySelectorAll("TextLine");
      textLines.forEach((lineEl) => {
        const lineId = lineEl.getAttribute("id") || `tl_${lineOrderCounter}`;
        const coordsStr = lineEl.querySelector("Coords")?.getAttribute("points") || "";
        const baselineStr = lineEl.querySelector("Baseline")?.getAttribute("points") || "";
        const unicodeEl = lineEl.querySelector("TextEquiv > Unicode") || lineEl.querySelector("Unicode");
        const text = unicodeEl ? unicodeEl.textContent : "";
        const custom = lineEl.getAttribute("custom") || "";

        let coords = this.parsePoints(coordsStr);
        let baseline = this.parsePoints(baselineStr);

        // Apply scale if needed
        if (scaleX !== 1.0 || scaleY !== 1.0) {
          coords = coords.map(([x, y]) => [x * scaleX, y * scaleY]);
          baseline = baseline.map(([x, y]) => [x * scaleX, y * scaleY]);
        }

        this.lines.push({
          id: lineId,
          regionId: regionId,
          coords: coords,
          baseline: baseline,
          text: text,
          originalText: text,
          order: lineOrderCounter++,
          custom: custom
        });
      });
    });
  }

  parseAltoXml(xmlDoc) {
    const pageEl = xmlDoc.querySelector("Page");
    let xmlWidth = 0;
    let xmlHeight = 0;
    if (pageEl) {
      xmlWidth = parseFloat(pageEl.getAttribute("WIDTH") || "0");
      xmlHeight = parseFloat(pageEl.getAttribute("HEIGHT") || "0");
      this.xmlDimensions = { width: xmlWidth, height: xmlHeight };
    }

    let scaleX = 1.0;
    let scaleY = 1.0;
    if (this.imageLoaded && xmlWidth > 0 && xmlHeight > 0) {
      scaleX = this.imageDimensions.width / xmlWidth;
      scaleY = this.imageDimensions.height / xmlHeight;
    }
    this.coordScale = { scaleX, scaleY };

    const textLines = xmlDoc.querySelectorAll("TextLine");
    let lineOrderCounter = 1;

    textLines.forEach((lineEl, idx) => {
      const lineId = lineEl.getAttribute("ID") || `tl_${idx + 1}`;
      const hpos = parseFloat(lineEl.getAttribute("HPOS") || "0");
      const vpos = parseFloat(lineEl.getAttribute("VPOS") || "0");
      const width = parseFloat(lineEl.getAttribute("WIDTH") || "0");
      const height = parseFloat(lineEl.getAttribute("HEIGHT") || "0");

      let coords = [];
      const polygonPoints = lineEl.querySelector("Polygon")?.getAttribute("POINTS");
      if (polygonPoints) {
        coords = this.parseAltoPoints(polygonPoints);
      } else {
        coords = [
          [hpos, vpos],
          [hpos + width, vpos],
          [hpos + width, vpos + height],
          [hpos, vpos + height]
        ];
      }

      if (scaleX !== 1.0 || scaleY !== 1.0) {
        coords = coords.map(([x, y]) => [x * scaleX, y * scaleY]);
      }

      const strings = lineEl.querySelectorAll("String");
      const textParts = [];
      strings.forEach(s => {
        const content = s.getAttribute("CONTENT");
        if (content !== null) textParts.push(content);
      });
      const text = textParts.join(" ");

      this.lines.push({
        id: lineId,
        regionId: "region_1",
        coords: coords,
        baseline: [],
        text: text,
        originalText: text,
        order: lineOrderCounter++,
        custom: ""
      });
    });
  }

  parsePoints(pointsStr) {
    if (!pointsStr) return [];
    return pointsStr.trim().split(/\s+/).map(pair => {
      const [x, y] = pair.split(",").map(Number);
      return [isNaN(x) ? 0 : x, isNaN(y) ? 0 : y];
    });
  }

  parseAltoPoints(pointsStr) {
    if (!pointsStr) return [];
    const trimmed = pointsStr.trim();
    if (trimmed.includes(",")) {
      return this.parsePoints(trimmed);
    }
    const numbers = trimmed.split(/\s+/).map(Number);
    const coords = [];
    for (let i = 0; i < numbers.length; i += 2) {
      if (i + 1 < numbers.length) {
        coords.push([numbers[i], numbers[i + 1]]);
      }
    }
    return coords;
  }

  // =========================================================================
  // XML Serialization (Preserving Original Coordinate Systems)
  // =========================================================================

  serializeToPageXml() {
    const imgFilename = (this.currentDoc && this.currentDoc.id ? `${this.currentDoc.id}.jpg` : "image.jpg");
    const width = this.xmlDimensions.width || this.imageDimensions.width || 1000;
    const height = this.xmlDimensions.height || this.imageDimensions.height || 1400;
    const nowIso = new Date().toISOString();

    const scaleX = this.coordScale.scaleX || 1.0;
    const scaleY = this.coordScale.scaleY || 1.0;

    const unscaleCoords = (pts) => pts.map(([x, y]) => [x / scaleX, y / scaleY]);

    // Group lines by region
    const regionMap = new Map();
    this.lines.forEach(line => {
      const rId = line.regionId || "tr_1";
      if (!regionMap.has(rId)) {
        regionMap.set(rId, []);
      }
      regionMap.get(rId).push(line);
    });

    let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
    xml += `<PcGts xmlns="http://schema.primaresearch.org/PAGE/gts/pagecontent/2013-07-15">\n`;
    xml += `    <Metadata>\n`;
    xml += `        <Creator>${this.escapeXml(this.metadata.creator || "ScribeStudio Ground-Truth Editor")}</Creator>\n`;
    xml += `        <Created>${this.metadata.created || nowIso}</Created>\n`;
    xml += `        <LastChange>${nowIso}</LastChange>\n`;
    xml += `    </Metadata>\n`;
    xml += `    <Page imageFilename="${this.escapeXml(imgFilename)}" imageWidth="${width}" imageHeight="${height}">\n`;

    // Reading Order section
    xml += `        <ReadingOrder>\n`;
    xml += `            <OrderedGroup id="ro_${Date.now()}" caption="Regions reading order">\n`;
    let regionIdx = 0;
    regionMap.forEach((_, rId) => {
      xml += `                <RegionRefIndexed index="${regionIdx++}" regionRef="${rId}"/>\n`;
    });
    xml += `            </OrderedGroup>\n`;
    xml += `        </ReadingOrder>\n`;

    // TextRegions
    regionIdx = 0;
    regionMap.forEach((linesInRegion, rId) => {
      let rCoordsStr = "";
      const existingRegion = this.regions.find(r => r.id === rId);
      if (existingRegion && existingRegion.coords && existingRegion.coords.length > 0) {
        const unscaledRegion = unscaleCoords(existingRegion.coords);
        rCoordsStr = unscaledRegion.map(p => `${Math.round(p[0])},${Math.round(p[1])}`).join(" ");
      } else {
        rCoordsStr = this.calculateBoundingBoxPoints(linesInRegion, scaleX, scaleY);
      }

      xml += `        <TextRegion orientation="0.0" id="${rId}" custom="readingOrder {index:${regionIdx++};}">\n`;
      xml += `            <Coords points="${rCoordsStr}"/>\n`;

      linesInRegion.forEach((line, lIdx) => {
        const unscaledLineCoords = unscaleCoords(line.coords);
        const coordsStr = unscaledLineCoords.map(p => `${Math.round(p[0])},${Math.round(p[1])}`).join(" ");
        
        let baselineStr = "";
        if (line.baseline && line.baseline.length > 0) {
          const unscaledBaseline = unscaleCoords(line.baseline);
          baselineStr = unscaledBaseline.map(p => `${Math.round(p[0])},${Math.round(p[1])}`).join(" ");
        }

        xml += `            <TextLine id="${line.id}" custom="readingOrder {index:${lIdx};}">\n`;
        xml += `                <Coords points="${coordsStr}"/>\n`;
        if (baselineStr) {
          xml += `                <Baseline points="${baselineStr}"/>\n`;
        }
        xml += `                <TextEquiv>\n`;
        xml += `                    <Unicode>${this.escapeXml(line.text)}</Unicode>\n`;
        xml += `                </TextEquiv>\n`;
        xml += `            </TextLine>\n`;
      });

      xml += `            <TextEquiv>\n`;
      xml += `                <Unicode></Unicode>\n`;
      xml += `            </TextEquiv>\n`;
      xml += `        </TextRegion>\n`;
    });

    xml += `    </Page>\n`;
    xml += `</PcGts>\n`;

    return xml;
  }

  serializeToAltoXml() {
    const width = this.xmlDimensions.width || this.imageDimensions.width || 1000;
    const height = this.xmlDimensions.height || this.imageDimensions.height || 1400;
    const scaleX = this.coordScale.scaleX || 1.0;
    const scaleY = this.coordScale.scaleY || 1.0;

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<alto xmlns="http://www.loc.gov/standards/alto/ns-v4#">\n`;
    xml += `    <Description>\n`;
    xml += `        <MeasurementUnit>pixel</MeasurementUnit>\n`;
    xml += `    </Description>\n`;
    xml += `    <Layout>\n`;
    xml += `        <Page WIDTH="${width}" HEIGHT="${height}" PHYSICAL_IMG_NR="0" ID="page_0">\n`;
    xml += `            <PrintSpace HPOS="0" VPOS="0" WIDTH="${width}" HEIGHT="${height}">\n`;
    xml += `                <TextBlock ID="textblock_1">\n`;

    this.lines.forEach(line => {
      const unscaledCoords = line.coords.map(([x, y]) => [x / scaleX, y / scaleY]);
      const bbox = this.getPointsBoundingBox(unscaledCoords);
      const pointsStr = unscaledCoords.map(p => `${Math.round(p[0])} ${Math.round(p[1])}`).join(" ");

      xml += `                    <TextLine ID="${line.id}" HPOS="${bbox.x}" VPOS="${bbox.y}" WIDTH="${bbox.w}" HEIGHT="${bbox.h}">\n`;
      xml += `                        <Shape>\n`;
      xml += `                            <Polygon POINTS="${pointsStr}"/>\n`;
      xml += `                        </Shape>\n`;
      xml += `                        <String CONTENT="${this.escapeXml(line.text)}"/>\n`;
      xml += `                    </TextLine>\n`;
    });

    xml += `                </TextBlock>\n`;
    xml += `            </PrintSpace>\n`;
    xml += `        </Page>\n`;
    xml += `    </Layout>\n`;
    xml += `</alto>\n`;

    return xml;
  }

  calculateBoundingBoxPoints(lines, scaleX = 1.0, scaleY = 1.0) {
    if (!lines || lines.length === 0) return "0,0 0,100 100,100 100,0";
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    lines.forEach(l => {
      l.coords.forEach(p => {
        const ux = p[0] / scaleX;
        const uy = p[1] / scaleY;
        minX = Math.min(minX, ux);
        minY = Math.min(minY, uy);
        maxX = Math.max(maxX, ux);
        maxY = Math.max(maxY, uy);
      });
    });
    return `${Math.round(minX)},${Math.round(minY)} ${Math.round(minX)},${Math.round(maxY)} ${Math.round(maxX)},${Math.round(maxY)} ${Math.round(maxX)},${Math.round(minY)}`;
  }

  getLineBoundingBox(line) {
    return this.getPointsBoundingBox(line.coords);
  }

  getPointsBoundingBox(coords) {
    if (!coords || coords.length === 0) return { x: 0, y: 0, w: 100, h: 20 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    coords.forEach(p => {
      minX = Math.min(minX, p[0]);
      minY = Math.min(minY, p[1]);
      maxX = Math.max(maxX, p[0]);
      maxY = Math.max(maxY, p[1]);
    });
    return {
      x: Math.round(minX),
      y: Math.round(minY),
      w: Math.round(maxX - minX),
      h: Math.round(maxY - minY)
    };
  }

  escapeXml(unsafe) {
    if (!unsafe) return "";
    return unsafe.replace(/[<>&'"]/g, c => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
      }
    });
  }

  // =========================================================================
  // Canvas Rendering & Vector Overlays
  // =========================================================================

  renderCanvas() {
    this.vectorOverlay.innerHTML = "";
    if (this.lines.length === 0) return;

    // 1. Render Polygons
    if (this.showPolygons) {
      this.lines.forEach((line, idx) => {
        if (!line.coords || line.coords.length < 3) return;
        const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        const pointsStr = line.coords.map(p => `${p[0]},${p[1]}`).join(" ");
        polygon.setAttribute("points", pointsStr);
        polygon.setAttribute("class", `svg-polygon ${idx === this.selectedLineIndex ? "selected" : ""}`);
        polygon.dataset.index = idx;

        polygon.addEventListener("click", (e) => {
          if (this.currentTool === "draw") return;
          e.stopPropagation();
          this.selectLine(idx);
        });

        this.vectorOverlay.appendChild(polygon);
      });
    }

    // 2. Render Baselines
    if (this.showBaselines) {
      this.lines.forEach((line) => {
        if (!line.baseline || line.baseline.length < 2) return;
        const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        const pointsStr = line.baseline.map(p => `${p[0]},${p[1]}`).join(" ");
        polyline.setAttribute("points", pointsStr);
        polyline.setAttribute("class", "svg-baseline");
        this.vectorOverlay.appendChild(polyline);
      });
    }

    // 3. Render Badges & Text Overlay
    this.lines.forEach((line, idx) => {
      const isSelected = idx === this.selectedLineIndex;
      if (!line.coords || line.coords.length === 0) return;

      const firstPoint = line.coords[0];
      const posX = firstPoint[0];
      const posY = Math.max(15, firstPoint[1] - 4);

      if (this.showBadges) {
        const badgeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        badgeGroup.setAttribute("transform", `translate(${posX}, ${posY})`);
        badgeGroup.style.cursor = "pointer";
        badgeGroup.addEventListener("click", (e) => {
          if (this.currentTool === "draw") return;
          e.stopPropagation();
          this.selectLine(idx);
        });

        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", "-12");
        rect.setAttribute("y", "-14");
        rect.setAttribute("width", "24");
        rect.setAttribute("height", "16");
        rect.setAttribute("rx", "3");
        rect.setAttribute("class", "svg-badge-bg");
        if (isSelected) rect.style.fill = "var(--accent-blue)";

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", "0");
        text.setAttribute("y", "-6");
        text.setAttribute("class", "svg-badge-text");
        text.textContent = line.order || idx + 1;
        if (isSelected) text.style.fill = "#0b0f19";

        badgeGroup.appendChild(rect);
        badgeGroup.appendChild(text);
        this.vectorOverlay.appendChild(badgeGroup);
      }

      // Text Overlay
      if (this.showTextOverlay && line.text) {
        const textSvg = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textSvg.setAttribute("x", posX + 16);
        textSvg.setAttribute("y", posY);
        textSvg.setAttribute("class", "svg-text-overlay");
        textSvg.textContent = line.text;
        this.vectorOverlay.appendChild(textSvg);
      }
    });

    // 4. Render Editable Vertices for selected line in Vertex Mode
    if (this.currentTool === "vertices" && this.selectedLineIndex >= 0) {
      const activeLine = this.lines[this.selectedLineIndex];
      if (activeLine && activeLine.coords) {
        activeLine.coords.forEach((point, vIdx) => {
          const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          circle.setAttribute("cx", point[0]);
          circle.setAttribute("cy", point[1]);
          circle.setAttribute("class", "svg-vertex");
          circle.dataset.vertexIndex = vIdx;

          circle.addEventListener("mousedown", (e) => {
            e.stopPropagation();
            this.startDraggingVertex(vIdx, e);
          });

          this.vectorOverlay.appendChild(circle);
        });
      }
    }

    // Apply Overlay Opacity
    this.vectorOverlay.style.opacity = this.imageFilters.opacity / 100;
  }

  // =========================================================================
  // Focused Line Cropping & Transcription View
  // =========================================================================

  selectLine(index) {
    if (index < 0 || index >= this.lines.length) {
      this.selectedLineIndex = -1;
      this.focusLineBadge.textContent = "No line selected";
      this.focusLineId.textContent = "";
      this.focusLineCoords.textContent = "";
      this.focusTranscriptInput.value = "";
      this.focusTranscriptInput.disabled = true;
      this.clearLineCrop();
      this.renderCanvas();
      this.updateSidebarActiveState();
      return;
    }

    this.selectedLineIndex = index;
    const line = this.lines[index];

    this.focusLineBadge.textContent = `Line #${line.order || index + 1}`;
    this.focusLineId.textContent = line.id;
    this.focusLineCoords.textContent = `Region: ${line.regionId || "Default"}`;
    this.focusTranscriptInput.disabled = false;
    this.focusTranscriptInput.value = line.text || "";
    this.updateCharStats();

    this.renderCanvas();
    this.renderLineCrop(line);
    this.updateSidebarActiveState();

    this.focusTranscriptInput.focus();
    this.focusTranscriptInput.select();
  }

  renderLineCrop(line) {
    if (!this.imageLoaded || !line.coords || line.coords.length === 0) {
      this.clearLineCrop();
      return;
    }

    const bbox = this.getLineBoundingBox(line);
    const paddingX = Math.max(10, bbox.w * 0.05);
    const paddingY = Math.max(6, bbox.h * 0.15);

    const cropX = Math.max(0, bbox.x - paddingX);
    const cropY = Math.max(0, bbox.y - paddingY);
    const cropW = Math.min(this.imageDimensions.width - cropX, bbox.w + paddingX * 2);
    const cropH = Math.min(this.imageDimensions.height - cropY, bbox.h + paddingY * 2);

    if (cropW <= 0 || cropH <= 0) return;

    this.lineCropCanvas.width = cropW;
    this.lineCropCanvas.height = cropH;
    const ctx = this.lineCropCanvas.getContext("2d");

    ctx.drawImage(
      this.letterImage,
      cropX, cropY, cropW, cropH,
      0, 0, cropW, cropH
    );

    this.cropPlaceholder.style.display = "none";
    this.lineCropCanvas.style.display = "block";
  }

  clearLineCrop() {
    this.lineCropCanvas.style.display = "none";
    this.cropPlaceholder.style.display = "block";
  }

  updateCharStats() {
    const text = this.focusTranscriptInput.value || "";
    const charCount = text.length;
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    this.charCountDisplay.textContent = `${charCount} chars (${wordCount} words)`;
  }

  // =========================================================================
  // Line Operations: Edit, Delete, Reorder, Add
  // =========================================================================

  saveCurrentLineTranscript() {
    if (this.selectedLineIndex < 0) return;
    const line = this.lines[this.selectedLineIndex];
    const newText = this.focusTranscriptInput.value;

    if (line.text !== newText) {
      this.pushHistory("Edit transcript");
      line.text = newText;
      this.setDirty(true);
      this.renderSidebarList();
      if (this.showTextOverlay) this.renderCanvas();
    }
  }

  goToNextLine() {
    this.saveCurrentLineTranscript();
    if (this.selectedLineIndex + 1 < this.lines.length) {
      this.selectLine(this.selectedLineIndex + 1);
    } else {
      this.showToast("Reached last line of document", "info");
    }
  }

  goToPrevLine() {
    this.saveCurrentLineTranscript();
    if (this.selectedLineIndex > 0) {
      this.selectLine(this.selectedLineIndex - 1);
    }
  }

  deleteSelectedLine() {
    if (this.selectedLineIndex < 0) return;
    this.pushHistory("Delete line");

    const deletedLine = this.lines.splice(this.selectedLineIndex, 1)[0];
    this.setDirty(true);

    this.lines.forEach((l, idx) => { l.order = idx + 1; });
    this.showToast(`Deleted line ${deletedLine.id}`, "info");

    const newIndex = Math.min(this.selectedLineIndex, this.lines.length - 1);
    this.renderSidebarList();
    this.selectLine(newIndex);
  }

  addNewLineBox(coords) {
    this.pushHistory("Add line box");
    const newOrder = this.lines.length + 1;
    const newLineId = `tl_new_${Date.now().toString().slice(-4)}`;

    const newLine = {
      id: newLineId,
      regionId: "region_1",
      coords: coords,
      baseline: [],
      text: "",
      originalText: "",
      order: newOrder,
      custom: ""
    };

    this.lines.push(newLine);
    this.setDirty(true);
    this.renderSidebarList();
    this.selectLine(this.lines.length - 1);
    this.showToast("New line added. Type transcription below.", "success");
  }

  // =========================================================================
  // Sidebar List Rendering & Search
  // =========================================================================

  renderSidebarList() {
    this.sidebarLineCount.textContent = `${this.lines.length} lines`;
    const filter = this.lineFilterSelect.value;
    const query = this.lineSearchInput.value.toLowerCase().trim();

    this.linesListContainer.innerHTML = "";

    this.lines.forEach((line, idx) => {
      if (filter === "empty" && line.text.trim() !== "") return;
      if (filter === "edited" && line.text === line.originalText) return;
      if (query && !line.text.toLowerCase().includes(query) && !line.id.toLowerCase().includes(query)) return;

      const card = document.createElement("div");
      card.className = `line-card ${idx === this.selectedLineIndex ? "active" : ""}`;
      card.dataset.index = idx;

      const orderBadge = document.createElement("div");
      orderBadge.className = "line-order-badge";
      orderBadge.textContent = line.order || idx + 1;

      const content = document.createElement("div");
      content.className = "line-content-preview";

      const textPreview = document.createElement("div");
      textPreview.className = `line-text-preview ${line.text ? "" : "is-empty"}`;
      textPreview.textContent = line.text || "(empty line)";

      const meta = document.createElement("div");
      meta.className = "line-meta-preview";
      meta.textContent = `${line.id} • ${line.text.length} chars`;

      content.appendChild(textPreview);
      content.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = "line-actions";

      const delBtn = document.createElement("button");
      delBtn.className = "line-del-btn";
      delBtn.title = "Delete line";
      delBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path></svg>`;
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.selectedLineIndex = idx;
        this.deleteSelectedLine();
      });

      actions.appendChild(delBtn);

      card.appendChild(orderBadge);
      card.appendChild(content);
      card.appendChild(actions);

      card.addEventListener("click", () => {
        this.selectLine(idx);
      });

      this.linesListContainer.appendChild(card);
    });
  }

  updateSidebarActiveState() {
    const cards = this.linesListContainer.querySelectorAll(".line-card");
    cards.forEach(card => {
      const idx = parseInt(card.dataset.index, 10);
      card.classList.toggle("active", idx === this.selectedLineIndex);
      if (idx === this.selectedLineIndex) {
        card.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  }

  // =========================================================================
  // Viewport Pan, Zoom & Transform Engine
  // =========================================================================

  applyTransform() {
    this.canvasTransformWrapper.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
    this.zoomLevelDisplay.textContent = `${Math.round(this.zoom * 100)}%`;
  }

  zoomAt(factor, clientX, clientY) {
    const rect = this.canvasViewport.getBoundingClientRect();
    const viewportX = clientX - rect.left;
    const viewportY = clientY - rect.top;

    const newZoom = Math.min(Math.max(0.1, this.zoom * factor), 8.0);
    const zoomRatio = newZoom / this.zoom;

    this.panX = viewportX - (viewportX - this.panX) * zoomRatio;
    this.panY = viewportY - (viewportY - this.panY) * zoomRatio;
    this.zoom = newZoom;

    this.applyTransform();
  }

  fitToPage() {
    const viewportW = this.canvasViewport.clientWidth;
    const viewportH = this.canvasViewport.clientHeight;
    const imgW = this.imageDimensions.width || 1000;
    const imgH = this.imageDimensions.height || 1400;

    const scaleX = (viewportW - 40) / imgW;
    const scaleY = (viewportH - 40) / imgH;
    this.zoom = Math.min(scaleX, scaleY, 1.0);

    this.panX = (viewportW - imgW * this.zoom) / 2;
    this.panY = Math.max(20, (viewportH - imgH * this.zoom) / 2);
    this.applyTransform();
  }

  fitToWidth() {
    const viewportW = this.canvasViewport.clientWidth;
    const imgW = this.imageDimensions.width || 1000;
    this.zoom = (viewportW - 40) / imgW;
    this.panX = 20;
    this.panY = 20;
    this.applyTransform();
  }

  resetView() {
    this.zoom = 1.0;
    this.panX = 20;
    this.panY = 20;
    this.applyTransform();
  }

  screenToCanvasCoords(screenX, screenY) {
    const rect = this.canvasViewport.getBoundingClientRect();
    const x = (screenX - rect.left - this.panX) / this.zoom;
    const y = (screenY - rect.top - this.panY) / this.zoom;
    return [Math.round(x), Math.round(y)];
  }

  // =========================================================================
  // Vertex Dragging & Polygon Creation Tools
  // =========================================================================

  startDraggingVertex(vIdx, mouseDownEvent) {
    this.pushHistory("Move vertex");
    const activeLine = this.lines[this.selectedLineIndex];
    if (!activeLine) return;

    const onMouseMove = (e) => {
      const [canvasX, canvasY] = this.screenToCanvasCoords(e.clientX, e.clientY);
      activeLine.coords[vIdx] = [canvasX, canvasY];
      this.renderCanvas();
      this.renderLineCrop(activeLine);
      this.setDirty(true);
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  // =========================================================================
  // Undo / Redo & State Management
  // =========================================================================

  pushHistory(actionName) {
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    const state = JSON.stringify(this.lines);
    this.history.push({ action: actionName, lines: state });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    this.historyIndex = this.history.length - 1;
    this.updateUndoRedoButtons();
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const snapshot = JSON.parse(this.history[this.historyIndex].lines);
      this.lines = snapshot;
      this.renderCanvas();
      this.renderSidebarList();
      if (this.selectedLineIndex >= this.lines.length) {
        this.selectLine(this.lines.length - 1);
      } else if (this.selectedLineIndex >= 0) {
        this.selectLine(this.selectedLineIndex);
      }
      this.updateUndoRedoButtons();
      this.showToast("Undo", "info");
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const snapshot = JSON.parse(this.history[this.historyIndex].lines);
      this.lines = snapshot;
      this.renderCanvas();
      this.renderSidebarList();
      if (this.selectedLineIndex >= this.lines.length) {
        this.selectLine(this.lines.length - 1);
      } else if (this.selectedLineIndex >= 0) {
        this.selectLine(this.selectedLineIndex);
      }
      this.updateUndoRedoButtons();
      this.showToast("Redo", "info");
    }
  }

  resetHistory() {
    this.history = [{ action: "Initial state", lines: JSON.stringify(this.lines) }];
    this.historyIndex = 0;
    this.updateUndoRedoButtons();
  }

  updateUndoRedoButtons() {
    this.undoBtn.disabled = this.historyIndex <= 0;
    this.redoBtn.disabled = this.historyIndex >= this.history.length - 1;
  }

  setDirty(isDirty) {
    this.isDirty = isDirty;
    if (isDirty) {
      this.saveStatusIndicator.textContent = "Unsaved";
      this.saveStatusIndicator.className = "status-badge status-unsaved";
    } else {
      this.saveStatusIndicator.textContent = "Synced";
      this.saveStatusIndicator.className = "status-badge status-synced";
    }
  }

  // =========================================================================
  // Save & Export Operations
  // =========================================================================

  async saveToServer() {
    this.saveCurrentLineTranscript();
    if (!this.currentDoc || !this.currentDoc.id) {
      this.exportPageXml();
      return;
    }

    const pageXml = this.serializeToPageXml();
    this.showLoading("Saving XML to transkribus_manually_corrected...");

    try {
      const resp = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: this.currentDoc.id,
          xml_content: pageXml,
          destination: "corrected"
        })
      });

      if (!resp.ok) throw new Error("Save request failed");
      await resp.json();

      this.hideLoading();
      this.setDirty(false);
      this.showToast(`Saved ${this.currentDoc.id}.xml to manually corrected!`, "success");

      if (this.currentDoc) this.currentDoc.has_corrected = true;
    } catch (e) {
      this.hideLoading();
      this.showToast(`Server save failed: ${e.message}. Downloading file instead.`, "error");
      this.exportPageXml();
    }
  }

  exportPageXml() {
    const xml = this.serializeToPageXml();
    const filename = `${(this.currentDoc && this.currentDoc.id) || "transcription"}.xml`;
    this.downloadFile(xml, filename, "application/xml");
  }

  exportAltoXml() {
    const xml = this.serializeToAltoXml();
    const filename = `${(this.currentDoc && this.currentDoc.id) || "transcription"}_alto.xml`;
    this.downloadFile(xml, filename, "application/xml");
  }

  exportPlainText() {
    const linesText = this.lines.map(l => l.text).join("\n");
    const filename = `${(this.currentDoc && this.currentDoc.id) || "transcription"}.txt`;
    this.downloadFile(linesText, filename, "text/plain");
  }

  exportCsv() {
    let csv = "order,line_id,region_id,text,points_count\n";
    this.lines.forEach(l => {
      const escaped = `"${(l.text || "").replace(/"/g, '""')}"`;
      csv += `${l.order},${l.id},${l.regionId},${escaped},${l.coords.length}\n`;
    });
    const filename = `${(this.currentDoc && this.currentDoc.id) || "transcription"}.csv`;
    this.downloadFile(csv, filename, "text/csv");
  }

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast(`Downloaded ${filename}`, "success");
  }

  // =========================================================================
  // UI & Event Handlers Binding
  // =========================================================================

  bindEvents() {
    this.docSelect.addEventListener("change", (e) => {
      if (e.target.value) this.loadDocument(e.target.value);
    });

    this.prevDocBtn.addEventListener("click", () => {
      const currentIdx = this.documents.findIndex(d => d.id === (this.currentDoc && this.currentDoc.id));
      if (currentIdx > 0) this.loadDocument(this.documents[currentIdx - 1].id);
    });

    this.nextDocBtn.addEventListener("click", () => {
      const currentIdx = this.documents.findIndex(d => d.id === (this.currentDoc && this.currentDoc.id));
      if (currentIdx >= 0 && currentIdx + 1 < this.documents.length) {
        this.loadDocument(this.documents[currentIdx + 1].id);
      }
    });

    this.sourceSelect.addEventListener("change", () => this.reloadCurrentXmlSource());

    if (this.imageSizeSelect) {
      this.imageSizeSelect.addEventListener("change", () => {
        if (this.currentDoc && this.currentDoc.id) {
          this.loadDocument(this.currentDoc.id, this.sourceSelect.value);
        }
      });
    }

    // Save & Export
    this.saveBtn.addEventListener("click", () => this.saveToServer());
    this.exportMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.exportDropdown.classList.toggle("show");
    });
    document.addEventListener("click", () => this.exportDropdown.classList.remove("show"));

    this.exportPageXmlBtn.addEventListener("click", () => this.exportPageXml());
    this.exportAltoXmlBtn.addEventListener("click", () => this.exportAltoXml());
    this.exportTxtBtn.addEventListener("click", () => this.exportPlainText());
    this.exportCsvBtn.addEventListener("click", () => this.exportCsv());

    // Undo / Redo
    this.undoBtn.addEventListener("click", () => this.undo());
    this.redoBtn.addEventListener("click", () => this.redo());

    // Theme Toggle
    this.themeToggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("light-theme");
      document.body.classList.toggle("dark-theme");
    });

    // Modals
    this.shortcutsBtn.addEventListener("click", () => this.shortcutsModal.classList.add("show"));
    this.openCustomFilesBtn.addEventListener("click", () => this.customFilesModal.classList.add("show"));

    document.querySelectorAll(".modal-close-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.shortcutsModal.classList.remove("show");
        this.customFilesModal.classList.remove("show");
      });
    });

    // Custom File Picker Handlers
    this.modalImagePicker.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        this.modalImageSelectedName.textContent = file.name;
        this.modalLoadConfirmBtn.disabled = false;
      }
    });

    this.modalXmlPicker.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) this.modalXmlSelectedName.textContent = file.name;
    });

    this.modalLoadConfirmBtn.addEventListener("click", () => this.loadCustomFilesFromPickers());

    // Drag & Drop to Modal Drop Zone
    this.modalDropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      this.modalDropZone.classList.add("dragover");
    });
    this.modalDropZone.addEventListener("dragleave", () => this.modalDropZone.classList.remove("dragover"));
    this.modalDropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      this.modalDropZone.classList.remove("dragover");
      const files = Array.from(e.dataTransfer.files);
      const imgFile = files.find(f => f.type.startsWith("image/"));
      const xmlFile = files.find(f => f.name.endsWith(".xml") || f.type.includes("xml"));

      if (imgFile) {
        this.modalImagePicker.files = e.dataTransfer.files;
        this.modalImageSelectedName.textContent = imgFile.name;
        this.modalLoadConfirmBtn.disabled = false;
      }
      if (xmlFile) {
        this.modalXmlSelectedName.textContent = xmlFile.name;
      }
    });

    // Canvas Pan & Zoom Mouse Events
    this.canvasViewport.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      this.zoomAt(zoomFactor, e.clientX, e.clientY);
    }, { passive: false });

    this.canvasViewport.addEventListener("mousedown", (e) => {
      // 1. Draw Tool: Left-click anywhere on the image/canvas starts drawing a box immediately
      if (this.currentTool === "draw" && e.button === 0) {
        e.preventDefault();
        e.stopPropagation();
        this.startDrawingBox(e);
        return;
      }

      // 2. Pan: Middle-click, Right-click, or Left-click in select mode
      if (e.button === 1 || e.button === 2 || (this.currentTool === "select" && e.button === 0)) {
        this.isPanning = true;
        this.panStartX = e.clientX - this.panX;
        this.panStartY = e.clientY - this.panY;
        this.canvasViewport.classList.add("is-dragging");
      }
    });

    window.addEventListener("mousemove", (e) => {
      if (this.isPanning) {
        this.panX = e.clientX - this.panStartX;
        this.panY = e.clientY - this.panStartY;
        this.applyTransform();
      } else if (this.isDrawingBox) {
        this.updateDrawingBox(e);
      }
    });

    window.addEventListener("mouseup", (e) => {
      if (this.isPanning) {
        this.isPanning = false;
        this.canvasViewport.classList.remove("is-dragging");
      } else if (this.isDrawingBox) {
        this.finishDrawingBox(e);
      }
    });

    this.canvasViewport.addEventListener("contextmenu", e => e.preventDefault());

    // Zoom Buttons
    this.zoomInBtn.addEventListener("click", () => this.zoomAt(1.2, window.innerWidth / 2, window.innerHeight / 2));
    this.zoomOutBtn.addEventListener("click", () => this.zoomAt(0.8, window.innerWidth / 2, window.innerHeight / 2));
    this.fitWidthBtn.addEventListener("click", () => this.fitToWidth());
    this.fitPageBtn.addEventListener("click", () => this.fitToPage());
    this.resetViewBtn.addEventListener("click", () => this.resetView());

    // Canvas Tool Switchers
    this.toolSelectBtn.addEventListener("click", () => this.setTool("select"));
    this.toolEditVerticesBtn.addEventListener("click", () => this.setTool("vertices"));
    this.toolDrawPolyBtn.addEventListener("click", () => this.setTool("draw"));
    this.sidebarAddNewLineBtn.addEventListener("click", () => this.setTool("draw"));

    // Layers & Overlay Toggles
    this.togglePolygons.addEventListener("change", (e) => {
      this.showPolygons = e.target.checked;
      this.renderCanvas();
    });
    this.toggleBaselines.addEventListener("change", (e) => {
      this.showBaselines = e.target.checked;
      this.renderCanvas();
    });
    this.toggleBadges.addEventListener("change", (e) => {
      this.showBadges = e.target.checked;
      this.renderCanvas();
    });
    this.toggleTextOverlay.addEventListener("change", (e) => {
      this.showTextOverlay = e.target.checked;
      this.renderCanvas();
    });

    // Image Filters
    this.imgFilterBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.filterDropdown.classList.toggle("show");
    });

    this.filterBrightness.addEventListener("input", (e) => {
      this.imageFilters.brightness = e.target.value;
      this.valBrightness.textContent = `${e.target.value}%`;
      this.applyImageFilters();
    });
    this.filterContrast.addEventListener("input", (e) => {
      this.imageFilters.contrast = e.target.value;
      this.valContrast.textContent = `${e.target.value}%`;
      this.applyImageFilters();
    });
    this.filterOpacity.addEventListener("input", (e) => {
      this.imageFilters.opacity = e.target.value;
      this.valOpacity.textContent = `${e.target.value}%`;
      this.vectorOverlay.style.opacity = e.target.value / 100;
    });
    this.filterInvert.addEventListener("change", (e) => {
      this.imageFilters.invert = e.target.checked;
      this.applyImageFilters();
    });
    this.resetFiltersBtn.addEventListener("click", () => {
      this.filterBrightness.value = 100;
      this.filterContrast.value = 100;
      this.filterOpacity.value = 35;
      this.filterInvert.checked = false;
      this.valBrightness.textContent = "100%";
      this.valContrast.textContent = "100%";
      this.valOpacity.textContent = "35%";
      this.imageFilters = { brightness: 100, contrast: 100, opacity: 35, invert: false };
      this.applyImageFilters();
      this.vectorOverlay.style.opacity = 0.35;
    });

    // Focus Panel Navigation & Input
    this.prevLineBtn.addEventListener("click", () => this.goToPrevLine());
    this.nextLineBtn.addEventListener("click", () => this.goToNextLine());
    this.deleteCurrentLineBtn.addEventListener("click", () => this.deleteSelectedLine());

    this.focusTranscriptInput.addEventListener("input", () => {
      this.saveCurrentLineTranscript();
      this.updateCharStats();
    });

    // Diacritic / Special Char Buttons
    document.querySelectorAll(".char-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const char = btn.dataset.char;
        this.insertCharacterAtCursor(char);
      });
    });

    // Sidebar Search & Filter
    this.lineSearchInput.addEventListener("input", () => this.renderSidebarList());
    this.lineFilterSelect.addEventListener("change", () => this.renderSidebarList());

    // Global Keyboard Shortcuts
    window.addEventListener("keydown", (e) => this.handleGlobalKeyDown(e));
  }

  setTool(tool) {
    this.currentTool = tool;
    this.toolSelectBtn.classList.toggle("active", tool === "select");
    this.toolEditVerticesBtn.classList.toggle("active", tool === "vertices");
    this.toolDrawPolyBtn.classList.toggle("active", tool === "draw");

    this.canvasViewport.classList.toggle("tool-draw", tool === "draw");
    this.renderCanvas();

    if (tool === "draw") {
      this.showToast("Click & drag on canvas to create a new text line box", "info");
    }
  }

  startDrawingBox(e) {
    this.isDrawingBox = true;
    this.drawStartPoint = this.screenToCanvasCoords(e.clientX, e.clientY);

    if (this.tempDrawPolygon) {
      this.tempDrawPolygon.remove();
    }

    this.tempDrawPolygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    this.tempDrawPolygon.setAttribute("class", "svg-polygon selected");
    this.tempDrawPolygon.style.pointerEvents = "none";
    this.vectorOverlay.appendChild(this.tempDrawPolygon);
  }

  updateDrawingBox(e) {
    if (!this.isDrawingBox || !this.drawStartPoint || !this.tempDrawPolygon) return;
    const currentPoint = this.screenToCanvasCoords(e.clientX, e.clientY);

    const x1 = Math.min(this.drawStartPoint[0], currentPoint[0]);
    const y1 = Math.min(this.drawStartPoint[1], currentPoint[1]);
    const x2 = Math.max(this.drawStartPoint[0], currentPoint[0]);
    const y2 = Math.max(this.drawStartPoint[1], currentPoint[1]);

    const pointsStr = `${x1},${y1} ${x2},${y1} ${x2},${y2} ${x1},${y2}`;
    this.tempDrawPolygon.setAttribute("points", pointsStr);
  }

  finishDrawingBox(e) {
    if (!this.isDrawingBox || !this.drawStartPoint) return;
    this.isDrawingBox = false;

    const currentPoint = this.screenToCanvasCoords(e.clientX, e.clientY);
    const x1 = Math.min(this.drawStartPoint[0], currentPoint[0]);
    const y1 = Math.min(this.drawStartPoint[1], currentPoint[1]);
    const x2 = Math.max(this.drawStartPoint[0], currentPoint[0]);
    const y2 = Math.max(this.drawStartPoint[1], currentPoint[1]);

    if (this.tempDrawPolygon) {
      this.tempDrawPolygon.remove();
      this.tempDrawPolygon = null;
    }

    if (x2 - x1 > 10 && y2 - y1 > 5) {
      const coords = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
      this.addNewLineBox(coords);
      this.setTool("select");
    }
  }

  insertCharacterAtCursor(char) {
    const input = this.focusTranscriptInput;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;

    input.value = text.substring(0, start) + char + text.substring(end);
    input.selectionStart = input.selectionEnd = start + char.length;
    input.focus();

    this.saveCurrentLineTranscript();
    this.updateCharStats();
  }

  applyImageFilters() {
    const b = this.imageFilters.brightness;
    const c = this.imageFilters.contrast;
    const inv = this.imageFilters.invert ? "invert(100%)" : "invert(0%)";
    this.letterImage.style.filter = `brightness(${b}%) contrast(${c}%) ${inv}`;
  }

  handleGlobalKeyDown(e) {
    const isEditing = document.activeElement === this.focusTranscriptInput;

    if (isEditing) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.goToNextLine();
      } else if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        this.goToPrevLine();
      } else if (e.key === "Tab") {
        e.preventDefault();
        if (e.shiftKey) this.goToPrevLine();
        else this.goToNextLine();
      }
      return;
    }

    // Canvas shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      this.saveToServer();
    } else if ((e.ctrlKey || e.metaKey) && e.key === "z") {
      e.preventDefault();
      if (e.shiftKey) this.redo();
      else this.undo();
    } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
      e.preventDefault();
      this.redo();
    } else if (e.key === "Delete" || ((e.ctrlKey || e.metaKey) && e.key === "Backspace")) {
      e.preventDefault();
      this.deleteSelectedLine();
    } else if (e.key === "v" || e.key === "V") {
      this.setTool("select");
    } else if (e.key === "e" || e.key === "E") {
      this.setTool("vertices");
    } else if (e.key === "d" || e.key === "D") {
      this.setTool("draw");
    } else if (e.key === "f" || e.key === "F") {
      this.fitToPage();
    } else if (e.key === "w" || e.key === "W") {
      this.fitToWidth();
    } else if (e.key === "0") {
      this.resetView();
    } else if (e.key === "ArrowDown" || e.key === "j") {
      this.goToNextLine();
    } else if (e.key === "ArrowUp" || e.key === "k") {
      this.goToPrevLine();
    }
  }

  async loadCustomFilesFromPickers() {
    const imgFile = this.modalImagePicker.files[0];
    const xmlFile = this.modalXmlPicker.files[0];

    if (!imgFile) {
      this.showToast("Please select an image file first", "error");
      return;
    }

    this.showLoading("Loading custom files...");
    this.customFilesModal.classList.remove("show");

    const imgUrl = URL.createObjectURL(imgFile);
    await this.loadImage(imgUrl);

    this.currentDoc = { id: imgFile.name.replace(/\.[^/.]+$/, "") };
    this.docSelect.innerHTML = `<option value="${this.currentDoc.id}">${this.currentDoc.id} (Custom)</option>`;
    this.sourceSelect.innerHTML = `<option value="custom">Custom File</option>`;

    if (xmlFile) {
      const xmlText = await xmlFile.text();
      this.originalXmlRaw = xmlText;
      this.parseXmlContent(xmlText);
    } else {
      this.lines = [];
      this.regions = [];
    }

    this.resetHistory();
    this.setDirty(false);
    this.hideLoading();
    this.fitToPage();
    this.renderCanvas();
    this.renderSidebarList();
    if (this.lines.length > 0) this.selectLine(0);

    this.showToast(`Loaded ${imgFile.name} with ${this.lines.length} lines`, "success");
  }

  showLoading(text) {
    this.canvasLoadingOverlay.querySelector("p").textContent = text;
    this.canvasLoadingOverlay.style.display = "flex";
  }

  hideLoading() {
    this.canvasLoadingOverlay.style.display = "none";
  }

  showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
  }
}

// Initialize Application when DOM is ready
window.addEventListener("DOMContentLoaded", () => {
  window.scribeStudio = new ScribeStudio();
});
