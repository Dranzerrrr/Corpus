import { useEffect, useState } from 'react';
import { useHighlightLibrary, type SortOrder } from '../../src/features/library/useHighlightLibrary';
import { useDocumentEditor } from '../../src/features/editor/useDocumentEditor';
import { LibrarySidebar, type WorkspaceMode } from './components/LibrarySidebar';
import { HighlightCard } from './components/HighlightCard';
import { DocumentEditor } from './components/DocumentEditor';
import { InsertHighlightDrawer } from './components/InsertHighlightDrawer';
import { 
  Search, 
  X, 
  Download, 
  ArrowDownUp, 
  FileText, 
  Sparkles,
  Inbox,
  Check
} from 'lucide-react';
import { initializeDatabase } from '../../src/db';

export default function LibraryApp() {
  const searchParams = new URLSearchParams(window.location.search);
  const initialMode = (searchParams.get('mode') as WorkspaceMode) || 'highlights';
  const initialDocId = searchParams.get('doc');

  const [mode, setMode] = useState<WorkspaceMode>(initialMode);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);

  // Highlights library state
  const {
    highlights,
    rawHighlights,
    sources,
    sourceMap,
    tagCounts,
    filters,
    setFilters,
    isLoading: isHighlightsLoading,
    updateHighlightTag,
    updateHighlightNote,
    deleteHighlight,
    exportToMarkdown,
    exportToJson,
  } = useHighlightLibrary();

  // Document editor state
  const {
    documents,
    activeDoc,
    activeDocId,
    setActiveDocId,
    blocks,
    insertedHighlightIds,
    createDocument,
    updateDocumentTitle,
    deleteDocument,
    addBlock,
    updateBlock,
    deleteBlock,
    moveBlock,
    importHighlight,
  } = useDocumentEditor(initialDocId);

  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    initializeDatabase();
  }, []);

  const handleExportMd = () => {
    exportToMarkdown(highlights);
    setIsExportMenuOpen(false);
    setExportNotice('Exported to Markdown');
    setTimeout(() => setExportNotice(null), 2500);
  };

  const handleExportJson = () => {
    exportToJson(highlights);
    setIsExportMenuOpen(false);
    setExportNotice('Exported JSON Backup');
    setTimeout(() => setExportNotice(null), 2500);
  };

  const activeSource = filters.sourceFingerprint ? sourceMap.get(filters.sourceFingerprint) : null;

  const handleCreateDocument = async () => {
    const newId = await createDocument();
    setMode('editor');
    setActiveDocId(newId);
  };

  const handleSelectDocument = (id: string) => {
    setActiveDocId(id);
    setMode('editor');
  };

  return (
    <div className="w-screen h-screen flex bg-paper text-ink overflow-hidden font-sans">
      {/* Finley-style Sidebar */}
      <LibrarySidebar
        mode={mode}
        onSelectMode={setMode}
        currentTag={filters.tag}
        onSelectTag={(tag) => setFilters({ ...filters, tag })}
        tagCounts={tagCounts}
        sourceType={filters.sourceType}
        onSelectSourceType={(sourceType) => setFilters({ ...filters, sourceType })}
        sources={sources}
        selectedSourceFingerprint={filters.sourceFingerprint}
        onSelectSource={(sourceFingerprint) => setFilters({ ...filters, sourceFingerprint })}
        documents={documents}
        activeDocId={activeDocId}
        onSelectDocument={handleSelectDocument}
        onCreateDocument={handleCreateDocument}
      />

      {/* Center Surface */}
      {mode === 'highlights' ? (
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Top Header & Search Bar */}
          <header className="p-4 border-b border-ink/10 bg-canvas flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between gap-4">
              {/* Search Input Box */}
              <div className="flex-1 max-w-xl relative">
                <Search className="w-4 h-4 text-slate absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={filters.searchQuery}
                  onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                  placeholder="Search highlighted quotes, synthesis notes, source titles, authors..."
                  className="w-full pl-9 pr-8 py-2 bg-paper/60 border border-ink/10 rounded-lg text-xs outline-none focus:border-focus-start focus:bg-canvas transition-all placeholder:text-slate/60"
                />
                {filters.searchQuery && (
                  <button
                    onClick={() => setFilters({ ...filters, searchQuery: '' })}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate hover:text-ink"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Utility Actions (Sort & Export) */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-paper/60 border border-ink/10 rounded-lg px-2 py-1 text-xs">
                  <ArrowDownUp className="w-3.5 h-3.5 text-slate" />
                  <select
                    value={filters.sortOrder}
                    onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value as SortOrder })}
                    className="bg-transparent border-none outline-none text-xs text-ink cursor-pointer"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-ink text-white rounded-lg text-xs font-medium hover:bg-ink/90 transition-all shadow-sm"
                    title="Export highlights safety net"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export</span>
                  </button>

                  {isExportMenuOpen && (
                    <div className="absolute right-0 mt-1.5 w-52 bg-canvas border border-ink/10 rounded-lg shadow-xl py-1.5 z-40 flex flex-col gap-0.5">
                      <div className="px-3 py-1 text-[10px] text-slate font-medium border-b border-ink/5">
                        Export {highlights.length} Highlights
                      </div>
                      <button
                        onClick={handleExportMd}
                        className="px-3 py-2 text-left text-xs hover:bg-paper flex items-center gap-2 text-ink"
                      >
                        <FileText className="w-3.5 h-3.5 text-focus-start" />
                        <span>Markdown (.md)</span>
                      </button>
                      <button
                        onClick={handleExportJson}
                        className="px-3 py-2 text-left text-xs hover:bg-paper flex items-center gap-2 text-ink"
                      >
                        <Download className="w-3.5 h-3.5 text-slate" />
                        <span>JSON Backup (.json)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Active Filter Pills Bar */}
            <div className="flex items-center justify-between text-xs text-slate">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-medium text-slate">
                  Showing {highlights.length} of {rawHighlights.length} highlights
                </span>

                {filters.tag !== 'all' && (
                  <span className="flex items-center gap-1 bg-paper px-2 py-0.5 rounded-full border border-ink/10 text-[11px] text-ink capitalize">
                    Tag: {filters.tag}
                    <button
                      onClick={() => setFilters({ ...filters, tag: 'all' })}
                      className="hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.sourceType !== 'all' && (
                  <span className="flex items-center gap-1 bg-paper px-2 py-0.5 rounded-full border border-ink/10 text-[11px] text-ink uppercase">
                    Format: {filters.sourceType}
                    <button
                      onClick={() => setFilters({ ...filters, sourceType: 'all' })}
                      className="hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {activeSource && (
                  <span className="flex items-center gap-1 bg-paper px-2 py-0.5 rounded-full border border-ink/10 text-[11px] text-ink max-w-[240px] truncate">
                    Source: {activeSource.title}
                    <button
                      onClick={() => setFilters({ ...filters, sourceFingerprint: null })}
                      className="hover:text-red-500 shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {(filters.tag !== 'all' || filters.sourceType !== 'all' || filters.sourceFingerprint || filters.searchQuery) && (
                  <button
                    onClick={() =>
                      setFilters({
                        searchQuery: '',
                        tag: 'all',
                        sourceType: 'all',
                        sourceFingerprint: null,
                        sortOrder: 'newest',
                      })
                    }
                    className="text-[11px] text-focus-start hover:underline font-medium ml-1"
                  >
                    Clear all filters
                  </button>
                )}
              </div>

              {exportNotice && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <Check className="w-3 h-3 text-emerald-600" />
                  {exportNotice}
                </span>
              )}
            </div>
          </header>

          {/* Highlight Cards Grid */}
          <section className="flex-1 overflow-y-auto p-5">
            {isHighlightsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-36 bg-canvas border border-ink/5 rounded-lg animate-pulse p-4 flex flex-col gap-3"
                  >
                    <div className="h-3 w-1/3 bg-slate/10 rounded" />
                    <div className="h-4 w-5/6 bg-slate/10 rounded" />
                    <div className="h-4 w-4/6 bg-slate/10 rounded" />
                  </div>
                ))}
              </div>
            ) : highlights.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto p-6">
                <div className="w-12 h-12 rounded-full bg-paper flex items-center justify-center text-slate mb-3 border border-ink/5">
                  {rawHighlights.length === 0 ? (
                    <Sparkles className="w-6 h-6 text-amber-500" />
                  ) : (
                    <Inbox className="w-6 h-6 text-slate" />
                  )}
                </div>
                <h3 className="font-serif italic font-semibold text-lg text-ink mb-1">
                  {rawHighlights.length === 0 ? 'No highlights yet' : 'No matching highlights'}
                </h3>
                <p className="text-xs text-slate leading-relaxed mb-4">
                  {rawHighlights.length === 0
                    ? 'Select text on any webpage or open a PDF in Corpus to capture your first highlight.'
                    : 'Try adjusting your search keywords or clearing tag and format filters.'}
                </p>
                {rawHighlights.length === 0 ? (
                  <button
                    onClick={() => {
                      chrome.tabs.create({ url: chrome.runtime.getURL('viewer.html') });
                    }}
                    className="px-4 py-2 bg-ink text-white rounded-full text-xs font-medium hover:bg-ink/90 transition-all shadow-xs"
                  >
                    Open PDF Viewer
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      setFilters({
                        searchQuery: '',
                        tag: 'all',
                        sourceType: 'all',
                        sourceFingerprint: null,
                        sortOrder: 'newest',
                      })
                    }
                    className="px-3 py-1.5 bg-canvas border border-ink/15 rounded-lg text-xs font-medium text-ink hover:bg-paper transition-all"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
                {highlights.map((hl) => (
                  <HighlightCard
                    key={hl.id}
                    highlight={hl}
                    source={sourceMap.get(hl.sourceFingerprint)}
                    onUpdateTag={updateHighlightTag}
                    onUpdateNote={updateHighlightNote}
                    onDelete={deleteHighlight}
                  />
                ))}
              </div>
            )}
          </section>
        </main>
      ) : (
        /* Document Canvas & Right Highlights Drawer */
        <div className="flex-1 flex h-full overflow-hidden">
          <DocumentEditor
            document={activeDoc}
            blocks={blocks}
            onUpdateTitle={updateDocumentTitle}
            onDeleteDocument={deleteDocument}
            onAddBlock={addBlock}
            onUpdateBlock={updateBlock}
            onDeleteBlock={deleteBlock}
            onMoveBlock={moveBlock}
            isDrawerOpen={isDrawerOpen}
            onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
          />

          {isDrawerOpen && (
            <InsertHighlightDrawer
              highlights={rawHighlights}
              sourceMap={sourceMap}
              insertedHighlightIds={insertedHighlightIds}
              onInsertQuote={(hl, src) => importHighlight(hl, src, false)}
              onInsertCitation={(hl, src) => importHighlight(hl, src, true)}
              onClose={() => setIsDrawerOpen(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
