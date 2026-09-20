import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, FileText, Download } from 'lucide-react';

interface ViewerHeaderProps {
  title: string;
  currentPage: number;
  totalPages: number;
  scale: number;
  onScaleChange: (newScale: number) => void;
  onPageJump: (page: number) => void;
  onDownload?: () => void;
}

export const ViewerHeader: React.FC<ViewerHeaderProps> = ({
  title,
  currentPage,
  totalPages,
  scale,
  onScaleChange,
  onPageJump,
  onDownload,
}) => {
  return (
    <header className="h-14 bg-canvas border-b border-ink/10 px-4 flex items-center justify-between shadow-sm select-none z-40 sticky top-0">
      {/* Title and App Brand */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-serif italic font-semibold text-lg text-ink">Corpus</span>
          <span className="text-slate/40">/</span>
        </div>
        <div className="flex items-center gap-2 truncate">
          <FileText className="w-4 h-4 text-focus-start shrink-0" />
          <h1 className="text-xs font-medium text-ink truncate max-w-[280px]" title={title}>
            {title}
          </h1>
        </div>
      </div>

      {/* Center: Page Controls */}
      <div className="flex items-center gap-2 bg-paper px-2.5 py-1 rounded-full border border-ink/5">
        <input
          type="number"
          min={1}
          max={totalPages}
          value={currentPage}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val >= 1 && val <= totalPages) {
              onPageJump(val);
            }
          }}
          className="w-10 text-center text-xs font-mono bg-transparent text-ink focus:outline-none focus:bg-canvas rounded"
        />
        <span className="text-xs text-slate font-mono">/ {totalPages || 1}</span>
      </div>

      {/* Right: Zoom & Export Controls */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-paper px-1.5 py-1 rounded-full border border-ink/5">
          <button
            onClick={() => onScaleChange(Math.max(0.6, scale - 0.15))}
            className="p-1 text-slate hover:text-ink hover:bg-canvas rounded-full transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-slate px-1 w-10 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => onScaleChange(Math.min(2.5, scale + 0.15))}
            className="p-1 text-slate hover:text-ink hover:bg-canvas rounded-full transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onScaleChange(1.0)}
            className="p-1 text-slate hover:text-ink hover:bg-canvas rounded-full transition-colors"
            title="Reset Zoom (100%)"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>

        {onDownload && (
          <button
            onClick={onDownload}
            className="p-2 text-slate hover:text-ink hover:bg-paper rounded-full transition-colors"
            title="Download original PDF"
          >
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
