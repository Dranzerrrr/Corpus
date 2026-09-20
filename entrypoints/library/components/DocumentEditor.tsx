import React, { useState } from 'react';
import type { DocumentRecord, BlockRecord, BlockType, BlockMetadata } from '../../../src/db';
import { BlockItem } from './BlockItem';
import { triggerMarkdownDownload } from '../../../src/features/editor/markdownExporter';
import { 
  Download, 
  Trash2, 
  BookMarked, 
  Type, 
  Heading, 
  Quote, 
  Check, 
  SidebarOpen, 
  SidebarClose 
} from 'lucide-react';

interface DocumentEditorProps {
  document: DocumentRecord | null;
  blocks: BlockRecord[];
  onUpdateTitle: (id: string, title: string) => void;
  onDeleteDocument: (id: string) => void;
  onAddBlock: (type: BlockType, afterBlockId?: string, content?: string, metadata?: BlockMetadata) => void;
  onUpdateBlock: (id: string, content: string, metadata?: BlockMetadata) => void;
  onDeleteBlock: (id: string) => void;
  onMoveBlock: (id: string, direction: 'up' | 'down') => void;
  isDrawerOpen: boolean;
  onToggleDrawer: () => void;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  document,
  blocks,
  onUpdateTitle,
  onDeleteDocument,
  onAddBlock,
  onUpdateBlock,
  onDeleteBlock,
  onMoveBlock,
  isDrawerOpen,
  onToggleDrawer,
}) => {
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  if (!document) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-paper">
        <h3 className="font-serif italic text-xl text-ink mb-2">No Document Selected</h3>
        <p className="text-xs text-slate max-w-sm mb-4">
          Select an existing draft from the sidebar or start a new synthesis document.
        </p>
      </div>
    );
  }

  const handleExport = () => {
    const filename = triggerMarkdownDownload(document, blocks);
    setExportNotice(`Exported as ${filename}`);
    setTimeout(() => setExportNotice(null), 3000);
  };

  const handleDelete = () => {
    if (confirm(`Permanently delete "${document.title}" and its content blocks?`)) {
      onDeleteDocument(document.id);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-paper">
      {/* Editor Topbar */}
      <header className="px-6 py-3 border-b border-ink/10 bg-canvas flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate font-mono">
            Updated {new Date(document.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {exportNotice && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <Check className="w-3 h-3 text-emerald-600" />
              {exportNotice}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Hero Export Button (Indigo/Violet Gradient per Design Doc §5) */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-focus-start to-focus-end hover:opacity-95 shadow-sm transition-all active:scale-95"
            title="Export finished document to Markdown"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Document</span>
          </button>

          {/* Toggle Highlights Drawer */}
          <button
            onClick={onToggleDrawer}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              isDrawerOpen
                ? 'bg-ink text-white border-ink'
                : 'bg-paper text-ink border-ink/10 hover:border-ink/20'
            }`}
            title="Browse and insert highlights"
          >
            {isDrawerOpen ? (
              <SidebarClose className="w-3.5 h-3.5" />
            ) : (
              <SidebarOpen className="w-3.5 h-3.5" />
            )}
            <span>Insert Highlights</span>
          </button>

          {/* Delete Draft */}
          <button
            onClick={handleDelete}
            className="p-1.5 rounded text-slate hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Delete document"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Canvas Scroll View */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        {/* 16px Radius Elevated Canvas (Design Doc §5) */}
        <div className="max-w-3xl mx-auto bg-canvas border border-ink/10 rounded-2xl shadow-soft p-8 md:p-12 flex flex-col gap-6">
          {/* Document Title (Newsreader Display Serif per Design Doc §3) */}
          <div className="border-b border-ink/10 pb-4">
            <input
              type="text"
              value={document.title}
              onChange={(e) => onUpdateTitle(document.id, e.target.value)}
              placeholder="Document Title (e.g. Attention & Cognitive Load Synthesis)"
              className="w-full font-serif italic text-3xl md:text-4xl text-ink font-semibold tracking-tight bg-transparent border-none outline-none placeholder:text-slate/30"
            />
            <p className="text-[11px] text-slate mt-1 italic">
              Stored only on this device. Compose draft by arranging blocks below.
            </p>
          </div>

          {/* Render All Document Blocks */}
          <div className="flex flex-col min-h-[300px]">
            {blocks.map((block, index) => (
              <BlockItem
                key={block.id}
                block={block}
                isFirst={index === 0}
                isLast={index === blocks.length - 1}
                onUpdate={onUpdateBlock}
                onDelete={onDeleteBlock}
                onMoveUp={(id) => onMoveBlock(id, 'up')}
                onMoveDown={(id) => onMoveBlock(id, 'down')}
                onInsertBelow={(afterId, type) => onAddBlock(type, afterId)}
              />
            ))}

            {/* Bottom Add Block Bar */}
            <div className="pt-6 border-t border-ink/10 mt-6 flex flex-col items-center gap-3">
              <span className="text-[11px] text-slate font-medium">Add Block</span>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <button
                  onClick={() => onAddBlock('text')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-paper hover:bg-paper/80 border border-ink/10 rounded-lg text-xs font-medium text-ink transition-all shadow-xs"
                >
                  <Type className="w-3.5 h-3.5 text-slate" />
                  <span>Text Paragraph</span>
                </button>
                <button
                  onClick={() => onAddBlock('heading', undefined, '', { level: 2 })}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-paper hover:bg-paper/80 border border-ink/10 rounded-lg text-xs font-medium text-ink transition-all shadow-xs"
                >
                  <Heading className="w-3.5 h-3.5 text-slate" />
                  <span>Heading</span>
                </button>
                <button
                  onClick={() => onAddBlock('quote')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-paper hover:bg-paper/80 border border-ink/10 rounded-lg text-xs font-medium text-ink transition-all shadow-xs"
                >
                  <Quote className="w-3.5 h-3.5 text-focus-start" />
                  <span>Quote</span>
                </button>
                <button
                  onClick={() => onAddBlock('citation')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-paper hover:bg-paper/80 border border-ink/10 rounded-lg text-xs font-medium text-ink transition-all shadow-xs"
                >
                  <BookMarked className="w-3.5 h-3.5 text-focus-start" />
                  <span>Citation</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
