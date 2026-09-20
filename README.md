# Corpus

> **Local-first PDF & Web Highlighter with Modular Block Document Editor.**  
> Read, highlight, synthesize, and draft research papers without your data ever leaving your device.

[![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?logo=google-chrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Framework](https://img.shields.io/badge/Built_with-WXT_%2B_React_19-61DAFB?logo=react&logoColor=white)](https://wxt.dev/)
[![Storage](https://img.shields.io/badge/Storage-IndexedDB_%2B_OPFS-10B981)](https://dexie.org/)
[![Privacy](https://img.shields.io/badge/Privacy-100%25_Local--Only-8B5CF6)](#privacy--trust-boundaries)

---

## Overview

Corpus bridges the gap between digital reading and academic drafting. Instead of switching back and forth between separate highlighting extensions, PDF viewers, and external writing tools, Corpus provides an integrated, offline-first workflow built entirely within Chrome:

```
┌─────────────────────────┐       ┌────────────────────────┐
│     Web Highlighter     │       │     PDF Highlighter    │
│  (MV3 Shadow DOM Engine)│       │  (Bundled PDF.js v4)   │
└────────────┬────────────┘       └───────────┬────────────┘
             │                                │
             └───────────────┬────────────────┘
                             ▼
              ┌─────────────────────────────┐
              │  Local Persistence Layer    │
              │  • Dexie IndexedDB (Records)│
              │  • OPFS (Binary PDF Storage)│
              │  • Persistent Storage Grant │
              └──────────────┬──────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                 Three-Column Research Workspace             │
│                                                             │
│  ┌────────────────┐   ┌─────────────────┐   ┌────────────┐  │
│  │   Navigation   │   │  Block Canvas   │   │   Insert   │  │
│  │ • All / Tags   │   │ • Newsreader H1 │   │ Highlights │  │
│  │ • PDF / Web    │   │ • Headings      │   │ • Search   │  │
│  │ • Sources List │   │ • Paragraphs    │   │ • + Quote  │  │
│  │ • Drafts List  │   │ • Linked Quotes │   │ •+Citation │  │
│  │ • Durability   │   │ • Citations     │   │ • Badges   │  │
│  └────────────────┘   └────────┬────────┘   └────────────┘  │
└────────────────────────────────┼────────────────────────────┘
                                 ▼
                    ┌────────────────────────┐
                    │     Markdown Export    │
                    │ (.md with attributions)│
                    └────────────────────────┘
```

---

## Key Features

### 1. Dual-Engine Capture (Web + PDF)
- **Web Content Highlighter**:
  - Injects via Chrome MV3 content scripts into any webpage.
  - **Shadow DOM Isolation**: UI elements run inside an isolated Shadow DOM (`createShadowRootUi`), impervious to page CSS resets or styling collisions.
  - **Robust Context Anchoring (`WebAnchor`)**: Captures exact selection plus preceding and following 48-character prefix/suffix strings to rehydrate highlights accurately across dynamic DOM shifts.
- **Bundled PDF Viewer**:
  - Full-page virtualized PDF viewer powered by `pdfjs-dist` with real-time text-selection layers.
  - Content-based SHA-256 fingerprinting so files retain their annotations even if moved or renamed on disk.
  - Origin Private File System (OPFS) binary storage.
  - Scanned PDF detection notice when documents lack a selectable text layer.

### 2. Functional 4-Tag Synthesis Palette
Highlights are categorized purposefully using four curated functional tags:
- 🟡 **Amber** (`#F5C64C`): General / unsorted observation (default)
- 🟣 **Violet** (`#8B7CF6`): Key argument / thesis statement
- 🟢 **Teal** (`#4FB0A5`): Open question / needs follow-up
- 🔴 **Coral** (`#E8785A`): Disagree / critique

### 3. Cross-Source Highlight Library & Search
- Live reactivity powered by `dexie-react-hooks`.
- Real-time search across highlighted excerpts, notes, source titles, authors, and year metadata.
- Compound filtering by tag, source format (Web vs. PDF), or specific document.
- One-click deep links: jumps straight to the exact page in the PDF viewer or opens the original webpage.
- In-place note editing and quick tag reclassification.

### 4. Modular Block Document Canvas
- Draft papers on an elevated, distraction-free canvas (16px radius, soft shadow).
- **Typography**: Editorial display headlines set in **Newsreader** serif; UI and body text in clean **Geist**.
- **Block Types**:
  - **Heading Blocks**: H1, H2, and H3 with level selectors.
  - **Text Blocks**: Distraction-free auto-growing drafting paragraphs.
  - **Quote Blocks**: Styled blockquotes with Focus left border, linked highlight badge, and source attributions.
  - **Citation Blocks**: Academic citations with formal author, year, title, page, and source reference link formatting.
- Reorder blocks up/down and insert blocks in-between on hover.

### 5. Connective Highlight Loop
- Open the collapsible **Insert Highlights** drawer right next to the drafting canvas.
- Search saved highlights and click **`+ Quote`** or **`+ Citation`** to insert evidence immediately into your active draft.
- **Duplicate Prevention**: Highlights already present in the draft display a green `✓ Included` badge to prevent accidental double imports.

### 6. Markdown Export
- Export drafts into clean, standard Markdown (`.md`) formatted for Obsidian, Notion, Logseq, or Pandoc.
- Hero indigo→violet gradient CTA button per the design system.
- Includes safety-net JSON backup export for highlight archives.

---

## Design Philosophy

Based on the **Finley** (editorial serif, indigo gradient, warm consumer polish) and **Harbor** (monochrome paper/ink, restrained pill UI, trust boundary signals) design systems:
- **Base Surface**: Warm Paper (`#F6F3EC`) easy on the eyes across long reading sessions.
- **Editorial Typography**: Newsreader serif for document titles and empty-state invitations; Geist Sans for functional UI.
- **Card Hierarchy**: 8px hairline border for dense lists; 16px elevated soft-shadow canvas for drafting.
- **Plain-Language Trust Boundary**: Every save and export displays a clear local-only confirmation (*"Stored only on this device. Nothing was uploaded to create this file."*).

---

## Project Structure

```
Corpus/
├── entrypoints/
│   ├── background.ts                    # MV3 Service Worker (Storage & Message Bridge)
│   ├── content.tsx                      # Web Content Script (Shadow DOM Overlay)
│   ├── popup/                           # Extension Popup (Durability, Quick Launch)
│   ├── viewer/                          # PDF.js Document Viewer
│   └── library/                         # 3-Column Workspace (Library + Block Canvas)
├── src/
│   ├── db/                              # Dexie Schema, OPFS, Storage Persistence
│   ├── features/
│   │   ├── pdf-viewer/                  # PDF.js worker & document loader
│   │   ├── web-highlighter/             # Anchoring algorithm, WebToolbar, Popover
│   │   ├── library/                     # useHighlightLibrary hook
│   │   └── editor/                      # useDocumentEditor hook & Markdown Exporter
│   └── utils/
│       └── hasher.ts                    # SHA-256 PDF fingerprinting & validation
├── wxt.config.ts                        # WXT extension configuration & permissions
├── tailwind.config.js                   # Tailored Paper/Ink/Focus/Tag color tokens
└── package.json
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation
```bash
# Clone the repository
git clone https://github.com/<your-username>/Corpus.git
cd Corpus

# Install dependencies
npm install
```

### Development Mode
```bash
# Start WXT development server with hot module replacement
npm run dev
```

### Production Build
```bash
# Typecheck with TypeScript
npm run compile

# Build the production Chrome MV3 extension
npm run build
```
The production bundle will be generated in `.output/chrome-mv3`.

---

## Loading Unpacked in Google Chrome

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** using the toggle in the upper-right corner.
3. Click **Load unpacked** in the top-left.
4. Select the directory:
   ```
   path/to/Corpus/.output/chrome-mv3
   ```
5. Pin **Corpus** to your Chrome toolbar.

---

## Privacy & Trust Boundaries

- **No Remote Servers**: Corpus has no backend, no telemetry, and no account requirements.
- **100% Local Storage**: All highlights, sources, documents, and blocks reside exclusively in your browser's IndexedDB and Origin Private File System (OPFS).
- **Offline Capable**: Fully functional without an active internet connection.

---

## License

MIT License. Built for independent researchers, students, and writers.
