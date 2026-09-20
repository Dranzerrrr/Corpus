import React, { useRef, useEffect, useState } from 'react';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { pdfjsLib } from '../../../src/features/pdf-viewer/pdfLoader';
import { type HighlightRecord } from '../../../src/db/schema';

interface PdfPageProps {
  doc: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  highlights: HighlightRecord[];
  onTextSelected: (selectionData: {
    text: string;
    pageNumber: number;
    rect: DOMRect;
  }) => void;
  onHasTextChecked?: (hasText: boolean) => void;
}

const TAG_COLOR_MAP: Record<string, string> = {
  amber: 'rgba(245, 198, 76, 0.45)',
  violet: 'rgba(139, 124, 246, 0.45)',
  teal: 'rgba(79, 176, 165, 0.45)',
  coral: 'rgba(232, 120, 90, 0.45)',
};

export const PdfPage: React.FC<PdfPageProps> = ({
  doc,
  pageNumber,
  scale,
  highlights,
  onTextSelected,
  onHasTextChecked,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number }>({
    width: 612 * scale,
    height: 792 * scale,
  });

  // 1. Virtualization via IntersectionObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Keep active when within 300px of viewport (prefetch buffer)
          setIsVisible(entry.isIntersecting || entry.intersectionRatio > 0);
        });
      },
      { rootMargin: '300px 0px 300px 0px', threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 2. Render Canvas & Text Layer when visible
  useEffect(() => {
    if (!isVisible) return;

    let pageProxy: PDFPageProxy | null = null;
    let isCancelled = false;

    async function renderPage() {
      try {
        pageProxy = await doc.getPage(pageNumber);
        if (isCancelled) return;

        const viewport = pageProxy.getViewport({ scale });
        setPageDimensions({ width: viewport.width, height: viewport.height });

        // A. Render Canvas
        const canvas = canvasRef.current;
        if (canvas) {
          const context = canvas.getContext('2d', { alpha: false });
          if (context) {
            const outputScale = window.devicePixelRatio || 1;
            canvas.width = Math.floor(viewport.width * outputScale);
            canvas.height = Math.floor(viewport.height * outputScale);
            canvas.style.width = `${Math.floor(viewport.width)}px`;
            canvas.style.height = `${Math.floor(viewport.height)}px`;

            const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

            await pageProxy.render({
              canvasContext: context,
              viewport,
              transform,
            }).promise;
          }
        }

        // B. Render Text Layer for native browser selection
        const textLayerDiv = textLayerRef.current;
        if (textLayerDiv && !isCancelled) {
          textLayerDiv.innerHTML = '';
          textLayerDiv.style.width = `${Math.floor(viewport.width)}px`;
          textLayerDiv.style.height = `${Math.floor(viewport.height)}px`;

          const textContent = await pageProxy.getTextContent();
          if (isCancelled) return;

          const hasText = textContent.items.length > 0;
          onHasTextChecked?.(hasText);

          // Use modern PDF.js TextLayer class
          const textLayer = new pdfjsLib.TextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport,
          });
          await textLayer.render();
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn(`Failed to render page ${pageNumber}`, err);
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
      if (pageProxy) {
        pageProxy.cleanup();
      }
    };
  }, [doc, pageNumber, scale, isVisible, onHasTextChecked]);

  // 3. Selection Listener on mouseup
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString().trim();
    if (!text) return;

    // Verify selection is within this page's text layer
    if (textLayerRef.current && textLayerRef.current.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      onTextSelected({
        text,
        pageNumber,
        rect,
      });
    }
  };

  return (
    <div
      ref={containerRef}
      id={`pdf-page-${pageNumber}`}
      className="relative mx-auto my-4 bg-canvas rounded-lg shadow-soft overflow-hidden transition-all select-text"
      style={{
        width: `${pageDimensions.width}px`,
        height: `${pageDimensions.height}px`,
      }}
      onMouseUp={handleMouseUp}
    >
      {isVisible ? (
        <>
          {/* Canvas Layer */}
          <canvas ref={canvasRef} className="block absolute inset-0 z-0 pointer-events-none" />

          {/* Text Layer for Selection */}
          <div
            ref={textLayerRef}
            className="textLayer absolute inset-0 z-10 leading-none overflow-hidden opacity-30 select-text"
            style={{
              // CSS Variables expected by PDF.js textLayer
              // @ts-expect-error - Custom CSS property
              '--scale-factor': scale,
            }}
          />

          {/* Persistent Highlights Layer */}
          <div className="absolute inset-0 z-20 pointer-events-none">
            {highlights.map((hl) => {
              const color = TAG_COLOR_MAP[hl.tag] || TAG_COLOR_MAP.amber;
              return (
                <div
                  key={hl.id}
                  title={`${hl.tag.toUpperCase()}: ${hl.selectedText}`}
                  className="rounded-sm"
                  style={{
                    backgroundColor: color,
                  }}
                />
              );
            })}
          </div>

          {/* Page number watermark badge */}
          <div className="absolute bottom-2 right-3 z-30 pointer-events-none text-[10px] text-slate/50 font-mono bg-paper/60 px-1.5 py-0.5 rounded">
            p. {pageNumber}
          </div>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-paper/30 text-slate/40 text-xs font-mono">
          Page {pageNumber}
        </div>
      )}
    </div>
  );
};
