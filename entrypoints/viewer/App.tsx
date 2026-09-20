import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type HighlightTag, type HighlightRecord } from '../../src/db';
import { loadPdfDocument, type LoadedPdfDoc } from '../../src/features/pdf-viewer/pdfLoader';
import { PdfPage } from './components/PdfPage';
import { ViewerHeader } from './components/ViewerHeader';
import { FloatingToolbar } from './components/FloatingToolbar';
import { ScannedPdfNotice } from './components/ScannedPdfNotice';
import { computePdfIdentityHash } from '../../src/utils/hasher';
import { savePdfToOpfs } from '../../src/db/opfs';
import { UploadCloud, AlertTriangle, Loader2 } from 'lucide-react';

export default function ViewerApp() {
  const [docProxy, setDocProxy] = useState<LoadedPdfDoc | null>(null);
  const [scale, setScale] = useState(1.15);
  const [currentPage, setCurrentPage] = useState(1);
  const [title, setTitle] = useState('Document Viewer');
  const [isScannedPdf, setIsScannedPdf] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active floating toolbar state
  const [activeSelection, setActiveSelection] = useState<{
    text: string;
    pageNumber: number;
    position: { x: number; y: number };
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Read fingerprint from URL params e.g. ?hash=...
  const searchParams = new URLSearchParams(window.location.search);
  const fingerprintParam = searchParams.get('hash');

  // Live query for highlights matching current document
  const highlights = useLiveQuery<HighlightRecord[]>(
    async () => {
      if (!docProxy?.fingerprint) return [];
      return await db.highlights.where('sourceFingerprint').equals(docProxy.fingerprint).toArray();
    },
    [docProxy?.fingerprint]
  );

  // Ingest from file if opened directly
  const handleFileDrop = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const hashResult = await computePdfIdentityHash(file);
      await savePdfToOpfs(hashResult.sha256, file);

      // Register source in DB
      await db.sources.put({
        id: 'src-' + crypto.randomUUID(),
        type: 'pdf',
        fingerprint: hashResult.sha256,
        title: file.name.replace(/\.pdf$/i, ''),
        url: file.name,
        fileSizeBytes: file.size,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
      });

      setTitle(file.name.replace(/\.pdf$/i, ''));
      const loaded = await loadPdfDocument(file);
      setDocProxy(loaded);
      setIsLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setIsLoading(false);
    }
  };

  useEffect(() => {
    async function initViewer() {
      if (!fingerprintParam) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const sourceRecord = await db.sources.where('fingerprint').equals(fingerprintParam).first();
        if (sourceRecord) {
          setTitle(sourceRecord.title);
        }

        const loaded = await loadPdfDocument(fingerprintParam);
        setDocProxy(loaded);
        setIsLoading(false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
        setIsLoading(false);
      }
    }

    initViewer();
  }, [fingerprintParam]);

  // Handle text selection from page
  const handleTextSelected = (selection: { text: string; pageNumber: number; rect: DOMRect }) => {
    setActiveSelection({
      text: selection.text,
      pageNumber: selection.pageNumber,
      position: {
        x: selection.rect.left + selection.rect.width / 2,
        y: selection.rect.top,
      },
    });
  };

  // Save highlight action
  const handleSaveHighlight = async (tag: HighlightTag, note?: string) => {
    if (!activeSelection || !docProxy) return;

    const source = await db.sources.where('fingerprint').equals(docProxy.fingerprint).first();
    const highlightRecord: HighlightRecord = {
      id: 'hl-' + crypto.randomUUID(),
      sourceId: source?.id || 'src-unknown',
      sourceFingerprint: docProxy.fingerprint,
      sourceTitle: title,
      selectedText: activeSelection.text,
      tag,
      note,
      pageNumber: activeSelection.pageNumber,
      anchor: {
        exact: activeSelection.text,
        pageIndex: activeSelection.pageNumber,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.highlights.add(highlightRecord);
    setActiveSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  // Scroll to page
  const scrollToPage = (page: number) => {
    setCurrentPage(page);
    const el = document.getElementById(`pdf-page-${page}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-paper text-ink overflow-hidden font-sans">
      <ViewerHeader
        title={title}
        currentPage={currentPage}
        totalPages={docProxy?.numPages || 1}
        scale={scale}
        onScaleChange={setScale}
        onPageJump={scrollToPage}
      />

      {/* Floating Toolbar when selection is active */}
      {activeSelection && (
        <FloatingToolbar
          position={activeSelection.position}
          onSelectTag={handleSaveHighlight}
          onDismiss={() => {
            setActiveSelection(null);
            window.getSelection()?.removeAllRanges();
          }}
        />
      )}

      {/* Main Viewport */}
      <main
        ref={containerRef}
        className="flex-1 overflow-y-auto relative p-4 flex flex-col items-center"
      >
        {isLoading && (
          <div className="my-auto flex flex-col items-center gap-3 text-slate">
            <Loader2 className="w-8 h-8 animate-spin text-focus-start" />
            <span className="text-xs font-medium">Rendering PDF Document...</span>
          </div>
        )}

        {error && (
          <div className="my-auto max-w-md bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-700 shadow-soft">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <span className="font-semibold block text-sm">Failed to Open PDF</span>
              {error}
            </div>
          </div>
        )}

        {!isLoading && !docProxy && !error && (
          <div className="my-auto max-w-md w-full bg-canvas p-6 rounded-2xl border border-ink/10 shadow-soft text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-focus-start/10 text-focus-start flex items-center justify-center">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h2 className="font-serif italic font-semibold text-lg text-ink">Open a PDF Document</h2>
            <p className="text-xs text-slate max-w-xs leading-relaxed">
              Drop any local research paper or literature review reading to highlight with Corpus.
            </p>
            <label className="mt-2 px-4 py-2 bg-ink text-white font-medium text-xs rounded-full hover:bg-ink/90 cursor-pointer shadow-sm transition-transform active:scale-95">
              <span>Choose File</span>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileDrop}
                className="hidden"
              />
            </label>
            <span className="text-[11px] text-slate/70 mt-2 italic">
              Stored only on this device. Never uploaded to external servers.
            </span>
          </div>
        )}

        {/* Scanned Document Warning */}
        {isScannedPdf && <ScannedPdfNotice />}

        {/* Render Virtualized Pages */}
        {docProxy && (
          <div className="flex flex-col items-center w-full">
            {Array.from({ length: docProxy.numPages }, (_, i) => i + 1).map((pageNum) => (
              <PdfPage
                key={pageNum}
                doc={docProxy.doc}
                pageNumber={pageNum}
                scale={scale}
                highlights={highlights?.filter((h) => h.pageNumber === pageNum) || []}
                onTextSelected={handleTextSelected}
                onHasTextChecked={(hasText) => {
                  if (!hasText && pageNum === 1) {
                    setIsScannedPdf(true);
                  }
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
