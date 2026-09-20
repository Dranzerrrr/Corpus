import React, { useState, useMemo } from 'react';
import type { HighlightRecord, SourceRecord, HighlightTag } from '../../../src/db';
import { TAG_COLORS } from '../../../src/features/web-highlighter/anchoring';
import { 
  Search, 
  Quote, 
  BookMarked, 
  CheckCircle2, 
  X,
  FileText,
  Globe
} from 'lucide-react';

interface InsertHighlightDrawerProps {
  highlights: HighlightRecord[];
  sourceMap: Map<string, SourceRecord>;
  insertedHighlightIds: Set<string>;
  onInsertQuote: (highlight: HighlightRecord, source?: SourceRecord) => void;
  onInsertCitation: (highlight: HighlightRecord, source?: SourceRecord) => void;
  onClose?: () => void;
}

export const InsertHighlightDrawer: React.FC<InsertHighlightDrawerProps> = ({
  highlights,
  sourceMap,
  insertedHighlightIds,
  onInsertQuote,
  onInsertCitation,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<HighlightTag | 'all'>('all');

  const filteredHighlights = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return highlights.filter((hl) => {
      if (selectedTag !== 'all' && hl.tag !== selectedTag) return false;
      if (q) {
        const matchText = hl.selectedText.toLowerCase().includes(q);
        const matchNote = hl.note ? hl.note.toLowerCase().includes(q) : false;
        const matchTitle = hl.sourceTitle ? hl.sourceTitle.toLowerCase().includes(q) : false;
        if (!matchText && !matchNote && !matchTitle) return false;
      }
      return true;
    });
  }, [highlights, searchQuery, selectedTag]);

  return (
    <aside className="w-80 bg-canvas border-l border-ink/10 flex flex-col h-full shrink-0 select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-ink/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookMarked className="w-4 h-4 text-focus-start" />
          <h2 className="font-sans font-semibold text-xs text-ink">Insert Highlight</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate hover:text-ink p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search & Tag Filter */}
      <div className="p-3 border-b border-ink/5 flex flex-col gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter highlights..."
            className="w-full pl-8 pr-7 py-1.5 bg-paper/60 border border-ink/10 rounded-lg text-xs outline-none focus:border-focus-start focus:bg-canvas transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate hover:text-ink"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 4-Tag Dot Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <button
            onClick={() => setSelectedTag('all')}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
              selectedTag === 'all'
                ? 'bg-ink text-white'
                : 'bg-paper text-slate hover:text-ink'
            }`}
          >
            All ({highlights.length})
          </button>
          {(['amber', 'violet', 'teal', 'coral'] as HighlightTag[]).map((tag) => {
            const count = highlights.filter((h) => h.tag === tag).length;
            const color = TAG_COLORS[tag];
            return (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? 'all' : tag)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] transition-all ${
                  selectedTag === tag
                    ? 'bg-ink text-white font-medium'
                    : 'bg-paper text-slate hover:text-ink'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: color.hex }}
                />
                <span className="capitalize">{tag}</span>
                <span className="opacity-70 font-mono text-[9px]">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Highlights List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
        {filteredHighlights.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center p-4">
            <p className="text-xs text-slate italic">No highlights found matching search.</p>
          </div>
        ) : (
          filteredHighlights.map((hl) => {
            const source = sourceMap.get(hl.sourceFingerprint);
            const isAlreadyInserted = insertedHighlightIds.has(hl.id);
            const palette = TAG_COLORS[hl.tag] || TAG_COLORS.amber;

            return (
              <div
                key={hl.id}
                className={`bg-paper/50 border rounded-lg p-3 flex flex-col gap-2 transition-all ${
                  isAlreadyInserted
                    ? 'border-ink/10 opacity-75'
                    : 'border-ink/10 hover:border-ink/25 bg-canvas shadow-xs'
                }`}
              >
                {/* Source & Duplicate Indicator */}
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1 text-slate truncate max-w-[170px]">
                    {source?.type === 'pdf' ? (
                      <FileText className="w-3 h-3 shrink-0" />
                    ) : (
                      <Globe className="w-3 h-3 shrink-0" />
                    )}
                    <span className="truncate font-medium">{hl.sourceTitle}</span>
                  </div>

                  {isAlreadyInserted && (
                    <span className="flex items-center gap-0.5 text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-medium">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                      Included
                    </span>
                  )}
                </div>

                {/* Excerpt Quote */}
                <p
                  className="text-xs text-ink line-clamp-3 leading-snug border-l-2 pl-2 italic"
                  style={{ borderColor: palette.hex }}
                >
                  "{hl.selectedText}"
                </p>

                {/* Insertion Action Buttons */}
                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-ink/5">
                  <button
                    onClick={() => onInsertQuote(hl, source)}
                    className="flex items-center gap-1 px-2 py-1 bg-paper hover:bg-ink hover:text-white text-ink rounded text-[11px] font-medium transition-all"
                    title="Insert as Quote block"
                  >
                    <Quote className="w-3 h-3 text-focus-start" />
                    <span>+ Quote</span>
                  </button>

                  <button
                    onClick={() => onInsertCitation(hl, source)}
                    className="flex items-center gap-1 px-2 py-1 bg-ink text-white hover:bg-ink/90 rounded text-[11px] font-medium transition-all shadow-xs"
                    title="Insert as Citation block"
                  >
                    <BookMarked className="w-3 h-3 text-focus-end" />
                    <span>+ Citation</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 border-t border-ink/10 bg-paper/30 text-center">
        <span className="text-[10px] text-slate italic">
          Clicking insert places block directly into active draft
        </span>
      </div>
    </aside>
  );
};
