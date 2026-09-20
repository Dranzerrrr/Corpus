import React, { useState, useRef, useEffect } from 'react';
import type { BlockRecord, BlockType, HeadingLevel, BlockMetadata } from '../../../src/db';
import { 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Heading as HeadingIcon, 
  Type, 
  Quote, 
  BookMarked,
  Plus,
  ExternalLink
} from 'lucide-react';

interface BlockItemProps {
  block: BlockRecord;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (id: string, content: string, metadata?: BlockMetadata) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onInsertBelow: (afterBlockId: string, type: BlockType) => void;
}

export const BlockItem: React.FC<BlockItemProps> = ({
  block,
  isFirst,
  isLast,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onInsertBelow,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [isEditingAttribution, setIsEditingAttribution] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea to content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(40, textareaRef.current.scrollHeight)}px`;
    }
  }, [block.content]);

  const handleHeadingLevelChange = (level: HeadingLevel) => {
    onUpdate(block.id, block.content, { ...block.metadata, level });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(block.id, e.target.value, block.metadata);
  };

  const handleAttributionChange = (key: keyof BlockMetadata, value: string) => {
    onUpdate(block.id, block.content, {
      ...block.metadata,
      [key]: value || undefined,
    });
  };

  return (
    <div
      className="group relative flex flex-col transition-all my-1.5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowInsertMenu(false);
      }}
    >
      {/* Block Body Container */}
      <div className="flex items-start gap-2 relative">
        {/* Left Drag/Reorder Handles (visible on hover) */}
        <div
          className={`flex items-center gap-0.5 pt-2 transition-opacity ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <button
            onClick={() => onMoveUp(block.id)}
            disabled={isFirst}
            className="p-1 rounded text-slate hover:text-ink disabled:opacity-20 hover:bg-paper"
            title="Move block up"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onMoveDown(block.id)}
            disabled={isLast}
            className="p-1 rounded text-slate hover:text-ink disabled:opacity-20 hover:bg-paper"
            title="Move block down"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Core Block Content */}
        <div className="flex-1">
          {block.type === 'heading' && (
            <div className="flex flex-col gap-1.5">
              {/* Heading Level Selector (visible on hover) */}
              {isHovered && (
                <div className="flex items-center gap-1 text-[10px] font-mono text-slate">
                  <span>Level:</span>
                  {([1, 2, 3] as HeadingLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => handleHeadingLevelChange(lvl)}
                      className={`px-1.5 py-0.5 rounded ${
                        (block.metadata?.level || 1) === lvl
                          ? 'bg-ink text-white font-bold'
                          : 'bg-paper text-slate hover:text-ink'
                      }`}
                    >
                      H{lvl}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                ref={textareaRef}
                rows={1}
                value={block.content}
                onChange={handleContentChange}
                placeholder={`Heading ${block.metadata?.level || 1}...`}
                className={`w-full bg-transparent border-none outline-none resize-none font-sans font-semibold text-ink leading-tight ${
                  (block.metadata?.level || 1) === 1
                    ? 'text-2xl pt-2'
                    : (block.metadata?.level || 1) === 2
                    ? 'text-xl pt-2'
                    : 'text-lg pt-1'
                }`}
              />
            </div>
          )}

          {block.type === 'text' && (
            <textarea
              ref={textareaRef}
              rows={1}
              value={block.content}
              onChange={handleContentChange}
              placeholder="Type your synthesis notes, analysis, or draft text..."
              className="w-full bg-transparent border-none outline-none resize-none font-sans text-sm text-ink leading-relaxed placeholder:text-slate/40 max-w-[75ch]"
            />
          )}

          {block.type === 'quote' && (
            <div className="border-l-3 border-focus-start pl-4 py-1 flex flex-col gap-2 my-1 bg-focus-start/5 rounded-r-lg p-3">
              <textarea
                ref={textareaRef}
                rows={1}
                value={block.content}
                onChange={handleContentChange}
                placeholder="Quote excerpt..."
                className="w-full bg-transparent border-none outline-none resize-none font-serif italic text-base text-ink leading-relaxed"
              />

              {/* Attribution footer */}
              <div className="flex items-center justify-between text-xs text-slate pt-1 border-t border-focus-start/10">
                <div className="flex items-center gap-1.5 font-sans truncate">
                  <span className="text-focus-start font-medium">—</span>
                  {block.metadata?.author && <span>{block.metadata.author}</span>}
                  {block.metadata?.year && <span>({block.metadata.year})</span>}
                  {block.metadata?.sourceTitle && (
                    <span className="italic truncate max-w-[200px]">
                      "{block.metadata.sourceTitle}"
                    </span>
                  )}
                  {block.metadata?.pageNumber && <span>p. {block.metadata.pageNumber}</span>}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {block.highlightRefId && (
                    <span className="text-[10px] bg-focus-start/15 text-focus-start px-2 py-0.5 rounded-full font-medium">
                      Linked Highlight
                    </span>
                  )}
                  <button
                    onClick={() => setIsEditingAttribution(!isEditingAttribution)}
                    className="text-[10px] text-slate hover:text-ink underline"
                  >
                    {isEditingAttribution ? 'Done' : 'Edit Source'}
                  </button>
                </div>
              </div>

              {/* Source attribution editing inputs */}
              {isEditingAttribution && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 text-xs">
                  <input
                    type="text"
                    placeholder="Author"
                    value={block.metadata?.author || ''}
                    onChange={(e) => handleAttributionChange('author', e.target.value)}
                    className="p-1.5 bg-canvas border border-ink/10 rounded text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Year"
                    value={block.metadata?.year || ''}
                    onChange={(e) => handleAttributionChange('year', e.target.value)}
                    className="p-1.5 bg-canvas border border-ink/10 rounded text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Source Title"
                    value={block.metadata?.sourceTitle || ''}
                    onChange={(e) => handleAttributionChange('sourceTitle', e.target.value)}
                    className="p-1.5 bg-canvas border border-ink/10 rounded text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Page"
                    value={block.metadata?.pageNumber || ''}
                    onChange={(e) => handleAttributionChange('pageNumber', e.target.value)}
                    className="p-1.5 bg-canvas border border-ink/10 rounded text-xs"
                  />
                </div>
              )}
            </div>
          )}

          {block.type === 'citation' && (
            <div className="border border-ink/15 rounded-xl p-4 bg-paper/50 flex flex-col gap-2 my-1 shadow-soft">
              <div className="flex items-center justify-between text-xs text-slate">
                <div className="flex items-center gap-1.5">
                  <BookMarked className="w-3.5 h-3.5 text-focus-start" />
                  <span className="font-semibold text-ink">Citation Block</span>
                </div>
                {block.metadata?.url && (
                  <a
                    href={block.metadata.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-focus-start hover:underline flex items-center gap-1"
                  >
                    <span>Source Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <textarea
                ref={textareaRef}
                rows={1}
                value={block.content}
                onChange={handleContentChange}
                placeholder="Cited evidence or quote..."
                className="w-full bg-transparent border-none outline-none resize-none font-sans text-xs text-ink/90 italic leading-relaxed"
              />

              <div className="bg-canvas p-2 rounded-lg border border-ink/5 text-xs text-slate flex flex-col gap-1">
                <div className="font-medium text-ink">
                  {block.metadata?.author || 'Author not specified'}{' '}
                  {block.metadata?.year ? `(${block.metadata.year})` : ''}
                </div>
                <div className="text-[11px] text-slate italic truncate">
                  {block.metadata?.sourceTitle || 'Untitled Source'}
                  {block.metadata?.pageNumber ? `, p. ${block.metadata.pageNumber}` : ''}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Delete Action (visible on hover) */}
        <div
          className={`pt-2 transition-opacity ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <button
            onClick={() => onDelete(block.id)}
            className="p-1 rounded text-slate hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Delete block"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* In-Between Block Inserter (Triggered on hover) */}
      <div className="h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity my-0.5">
        {!showInsertMenu ? (
          <button
            onClick={() => setShowInsertMenu(true)}
            className="flex items-center gap-1 text-[10px] font-medium text-slate bg-paper hover:bg-canvas px-2 py-0.5 rounded-full border border-ink/10 hover:border-ink/25 shadow-xs transition-all"
          >
            <Plus className="w-3 h-3" />
            <span>Insert Block</span>
          </button>
        ) : (
          <div className="flex items-center gap-1 bg-canvas border border-ink/15 rounded-full px-2 py-0.5 shadow-md animate-in fade-in zoom-in-95">
            <button
              onClick={() => {
                onInsertBelow(block.id, 'text');
                setShowInsertMenu(false);
              }}
              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full hover:bg-paper text-ink"
            >
              <Type className="w-3 h-3 text-slate" />
              <span>Text</span>
            </button>
            <button
              onClick={() => {
                onInsertBelow(block.id, 'heading');
                setShowInsertMenu(false);
              }}
              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full hover:bg-paper text-ink"
            >
              <HeadingIcon className="w-3 h-3 text-slate" />
              <span>Heading</span>
            </button>
            <button
              onClick={() => {
                onInsertBelow(block.id, 'quote');
                setShowInsertMenu(false);
              }}
              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full hover:bg-paper text-ink"
            >
              <Quote className="w-3 h-3 text-focus-start" />
              <span>Quote</span>
            </button>
            <button
              onClick={() => {
                onInsertBelow(block.id, 'citation');
                setShowInsertMenu(false);
              }}
              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full hover:bg-paper text-ink"
            >
              <BookMarked className="w-3 h-3 text-focus-start" />
              <span>Citation</span>
            </button>
            <button
              onClick={() => setShowInsertMenu(false)}
              className="text-[10px] text-slate hover:text-ink pl-1"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
