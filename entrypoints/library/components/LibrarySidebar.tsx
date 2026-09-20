import React from 'react';
import type { HighlightTag, SourceRecord, DocumentRecord } from '../../../src/db';
import { TAG_COLORS } from '../../../src/features/web-highlighter/anchoring';
import { 
  FileText, 
  Globe, 
  Layers, 
  ShieldCheck, 
  HardDrive,
  PenTool,
  Plus
} from 'lucide-react';
import { useStoragePersistence, formatBytes } from '../../../src/db/persistence';

export type WorkspaceMode = 'highlights' | 'editor';

interface LibrarySidebarProps {
  mode: WorkspaceMode;
  onSelectMode: (mode: WorkspaceMode) => void;
  currentTag: HighlightTag | 'all';
  onSelectTag: (tag: HighlightTag | 'all') => void;
  tagCounts: { all: number; amber: number; violet: number; teal: number; coral: number };
  sourceType: 'all' | 'pdf' | 'web';
  onSelectSourceType: (type: 'all' | 'pdf' | 'web') => void;
  sources: SourceRecord[];
  selectedSourceFingerprint: string | null;
  onSelectSource: (fingerprint: string | null) => void;
  documents: DocumentRecord[];
  activeDocId: string | null;
  onSelectDocument: (docId: string) => void;
  onCreateDocument: () => void;
}

const TAG_ITEMS: Array<{ tag: HighlightTag; label: string }> = [
  { tag: 'amber', label: 'General / Unsorted' },
  { tag: 'violet', label: 'Argument / Thesis' },
  { tag: 'teal', label: 'Open Question' },
  { tag: 'coral', label: 'Critique / Disagree' },
];

export const LibrarySidebar: React.FC<LibrarySidebarProps> = ({
  mode,
  onSelectMode,
  currentTag,
  onSelectTag,
  tagCounts,
  sourceType,
  onSelectSourceType,
  sources,
  selectedSourceFingerprint,
  onSelectSource,
  documents,
  activeDocId,
  onSelectDocument,
  onCreateDocument,
}) => {
  const { status: persistence } = useStoragePersistence();

  return (
    <aside className="w-64 bg-canvas border-r border-ink/10 flex flex-col h-full shrink-0 select-none">
      {/* Header */}
      <div className="p-4 border-b border-ink/10 flex items-center justify-between">
        <div>
          <h1 className="font-serif italic font-bold text-xl text-ink tracking-tight">Corpus</h1>
          <p className="text-[11px] text-slate font-sans">Research Workspace</p>
        </div>
        <span className="text-[10px] font-medium bg-focus-start/10 text-focus-start px-2 py-0.5 rounded-full border border-focus-start/20">
          Local DB
        </span>
      </div>

      {/* Mode Switcher Pills (Finley / Harbor Style) */}
      <div className="p-3 border-b border-ink/5">
        <div className="grid grid-cols-2 gap-1 bg-paper p-1 rounded-xl border border-ink/5 text-xs font-medium">
          <button
            onClick={() => onSelectMode('highlights')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
              mode === 'highlights'
                ? 'bg-canvas text-ink font-semibold shadow-xs'
                : 'text-slate hover:text-ink'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-focus-start" />
            <span>Highlights</span>
          </button>
          <button
            onClick={() => onSelectMode('editor')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
              mode === 'editor'
                ? 'bg-canvas text-ink font-semibold shadow-xs'
                : 'text-slate hover:text-ink'
            }`}
          >
            <PenTool className="w-3.5 h-3.5 text-focus-end" />
            <span>Draft Canvas</span>
          </button>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-5 text-xs font-sans">
        {mode === 'highlights' ? (
          <>
            {/* Highlight Categories */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-slate uppercase tracking-wider px-2">
                Categories
              </span>

              <button
                onClick={() => onSelectTag('all')}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors ${
                  currentTag === 'all'
                    ? 'bg-focus-start/10 text-focus-start font-semibold'
                    : 'text-slate hover:text-ink hover:bg-paper'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" />
                  <span>All Highlights</span>
                </div>
                <span className="text-[11px] font-mono opacity-80">{tagCounts.all}</span>
              </button>

              {TAG_ITEMS.map(({ tag, label }) => {
                const isSelected = currentTag === tag;
                const color = TAG_COLORS[tag];
                return (
                  <button
                    key={tag}
                    onClick={() => onSelectTag(tag)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors ${
                      isSelected
                        ? 'bg-focus-start/10 text-focus-start font-semibold'
                        : 'text-slate hover:text-ink hover:bg-paper'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span>{label}</span>
                    </div>
                    <span className="text-[11px] font-mono opacity-80">{tagCounts[tag]}</span>
                  </button>
                );
              })}
            </div>

            {/* Source Type Filter */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-slate uppercase tracking-wider px-2">
                Format
              </span>
              <div className="grid grid-cols-3 gap-1 bg-paper/60 p-1 rounded-lg border border-ink/5">
                <button
                  onClick={() => onSelectSourceType('all')}
                  className={`py-1 text-[11px] rounded font-medium transition-all ${
                    sourceType === 'all' ? 'bg-canvas text-ink shadow-xs' : 'text-slate hover:text-ink'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => onSelectSourceType('pdf')}
                  className={`py-1 text-[11px] rounded font-medium flex items-center justify-center gap-1 transition-all ${
                    sourceType === 'pdf' ? 'bg-canvas text-ink shadow-xs' : 'text-slate hover:text-ink'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  PDF
                </button>
                <button
                  onClick={() => onSelectSourceType('web')}
                  className={`py-1 text-[11px] rounded font-medium flex items-center justify-center gap-1 transition-all ${
                    sourceType === 'web' ? 'bg-canvas text-ink shadow-xs' : 'text-slate hover:text-ink'
                  }`}
                >
                  <Globe className="w-3 h-3" />
                  Web
                </button>
              </div>
            </div>

            {/* Sources List */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-semibold text-slate uppercase tracking-wider">
                  Sources ({sources.length})
                </span>
                {selectedSourceFingerprint && (
                  <button
                    onClick={() => onSelectSource(null)}
                    className="text-[10px] text-focus-start hover:underline font-medium"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5">
                {sources.map((src) => {
                  const isSelected = selectedSourceFingerprint === src.fingerprint;
                  return (
                    <button
                      key={src.id}
                      onClick={() => onSelectSource(isSelected ? null : src.fingerprint)}
                      className={`px-2.5 py-1.5 rounded-md text-left flex items-start gap-2 transition-colors ${
                        isSelected
                          ? 'bg-ink text-white font-medium'
                          : 'text-slate hover:text-ink hover:bg-paper'
                      }`}
                      title={src.title}
                    >
                      {src.type === 'pdf' ? (
                        <FileText className="w-3 h-3 shrink-0 mt-0.5" />
                      ) : (
                        <Globe className="w-3 h-3 shrink-0 mt-0.5" />
                      )}
                      <span className="truncate text-[11px]">{src.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* Documents Section */
          <div className="flex flex-col gap-3">
            {/* Primary Ink Pill Button (Design Doc §5) */}
            <button
              onClick={onCreateDocument}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-ink text-white rounded-full font-medium text-xs hover:bg-ink/90 transition-all shadow-sm active:scale-98"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New document</span>
            </button>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-slate uppercase tracking-wider px-2">
                Documents ({documents.length})
              </span>

              <div className="flex flex-col gap-0.5">
                {documents.map((doc) => {
                  const isSelected = activeDocId === doc.id;
                  return (
                    <button
                      key={doc.id}
                      onClick={() => onSelectDocument(doc.id)}
                      className={`px-2.5 py-2 rounded-lg text-left flex flex-col gap-0.5 transition-colors ${
                        isSelected
                          ? 'bg-focus-start/10 text-focus-start font-semibold border border-focus-start/20'
                          : 'text-slate hover:text-ink hover:bg-paper'
                      }`}
                    >
                      <span className="truncate text-xs font-medium text-ink">{doc.title}</span>
                      <span className="text-[10px] text-slate/70 font-mono">
                        {new Date(doc.updatedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Storage Durability Trust Caption */}
      <div className="p-3 border-t border-ink/10 bg-paper/40 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-ink font-medium">
            <HardDrive className="w-3.5 h-3.5 text-focus-start" />
            <span>IndexedDB</span>
          </div>
          {persistence.persisted ? (
            <span className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              <ShieldCheck className="w-3 h-3" />
              Persisted
            </span>
          ) : (
            <span className="text-[10px] text-slate font-mono">
              {formatBytes(persistence.usageBytes)}
            </span>
          )}
        </div>
        <p className="text-[10px] text-slate italic leading-tight">
          Stored only on this device. No external servers.
        </p>
      </div>
    </aside>
  );
};
