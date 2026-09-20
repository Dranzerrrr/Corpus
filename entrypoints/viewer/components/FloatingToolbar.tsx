import React, { useState } from 'react';
import { type HighlightTag } from '../../../src/db/schema';
import { Check, MessageSquare, X } from 'lucide-react';

interface FloatingToolbarProps {
  position: { x: number; y: number };
  onSelectTag: (tag: HighlightTag, note?: string) => void;
  onDismiss: () => void;
  initialTag?: HighlightTag;
}

const TAG_CONFIG: Array<{ tag: HighlightTag; colorHex: string; label: string; bgClass: string }> = [
  { tag: 'amber', colorHex: '#F5C64C', label: 'General / Unsorted', bgClass: 'bg-tag-amber' },
  { tag: 'violet', colorHex: '#8B7CF6', label: 'Key argument / Thesis', bgClass: 'bg-tag-violet' },
  { tag: 'teal', colorHex: '#4FB0A5', label: 'Open question / Follow-up', bgClass: 'bg-tag-teal' },
  { tag: 'coral', colorHex: '#E8785A', label: 'Disagree / Critique', bgClass: 'bg-tag-coral' },
];

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  position,
  onSelectTag,
  onDismiss,
  initialTag = 'amber',
}) => {
  const [selectedTag, setSelectedTag] = useState<HighlightTag>(initialTag);
  const [note, setNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [savedPill, setSavedPill] = useState(false);

  const handleApply = (tag: HighlightTag) => {
    setSelectedTag(tag);
    setSavedPill(true);
    setTimeout(() => {
      onSelectTag(tag, note.trim() || undefined);
    }, 400);
  };

  if (savedPill) {
    return (
      <div
        className="fixed z-50 transform -translate-x-1/2 -translate-y-full mb-2 pointer-events-none transition-all duration-300 ease-out"
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
      >
        <div className="flex items-center gap-1.5 bg-ink text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lift animate-pulse">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>Saved</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed z-50 transform -translate-x-1/2 -translate-y-full mb-2 pointer-events-auto select-none"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="bg-canvas border border-ink/10 rounded-full shadow-lift p-1.5 flex items-center gap-1.5 backdrop-blur-md">
        {/* The 4 functional color dots */}
        <div className="flex items-center gap-1 px-1">
          {TAG_CONFIG.map(({ tag, colorHex, label }) => (
            <button
              key={tag}
              onClick={() => handleApply(tag)}
              title={label}
              className="group relative w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
              style={{ backgroundColor: colorHex }}
            >
              {selectedTag === tag && (
                <div className="w-2 h-2 rounded-full bg-white/90 shadow-sm" />
              )}
            </button>
          ))}
        </div>

        <div className="w-[1px] h-4 bg-ink/10" />

        {/* Note button */}
        <button
          onClick={() => setIsAddingNote(!isAddingNote)}
          className={`p-1.5 rounded-full text-slate hover:text-ink hover:bg-paper transition-colors ${
            note.trim() ? 'text-focus-start bg-focus-start/10' : ''
          }`}
          title={note.trim() ? 'Edit note' : 'Attach note'}
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </button>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="p-1.5 rounded-full text-slate hover:text-ink hover:bg-paper transition-colors"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Note popover input */}
      {isAddingNote && (
        <div className="mt-2 bg-canvas border border-ink/10 rounded-xl shadow-lift p-2.5 w-64 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add note to highlight..."
            rows={2}
            autoFocus
            className="w-full text-xs p-1.5 rounded-lg border border-ink/10 focus:outline-none focus:border-focus-start bg-paper/50 resize-none font-sans"
          />
          <div className="flex justify-end gap-1.5">
            <button
              onClick={() => setIsAddingNote(false)}
              className="text-[11px] px-2.5 py-1 text-slate hover:text-ink transition-colors"
            >
              Done
            </button>
            <button
              onClick={() => handleApply(selectedTag)}
              className="text-[11px] px-3 py-1 bg-ink text-white font-medium rounded-full hover:bg-ink/90 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
