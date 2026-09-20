import React, { useState } from 'react';
import type { HighlightTag, HighlightRecord } from '../../../db/schema';
import { TAG_COLORS } from '../anchoring';
import { Trash2, X, Edit3 } from 'lucide-react';

interface HighlightPopoverProps {
  highlight: HighlightRecord;
  position: { x: number; y: number };
  onUpdate: (id: string, tag?: HighlightTag, note?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

const TAG_DEFINITIONS: Array<{ tag: HighlightTag; label: string }> = [
  { tag: 'amber', label: 'General / Unsorted' },
  { tag: 'violet', label: 'Key argument / Thesis' },
  { tag: 'teal', label: 'Open question' },
  { tag: 'coral', label: 'Critique / Disagree' },
];

export const HighlightPopover: React.FC<HighlightPopoverProps> = ({
  highlight,
  position,
  onUpdate,
  onDelete,
  onClose,
}) => {
  const [currentTag, setCurrentTag] = useState<HighlightTag>(highlight.tag);
  const [note, setNote] = useState<string>(highlight.note || '');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const left = Math.max(16, Math.min(window.innerWidth - 300, position.x - 140));
  const top = Math.max(16, position.y - 130);

  const handleTagChange = async (newTag: HighlightTag) => {
    setCurrentTag(newTag);
    setIsBusy(true);
    try {
      await onUpdate(highlight.id, newTag, note);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBusy(true);
    try {
      await onUpdate(highlight.id, currentTag, note.trim() || undefined);
      setIsEditingNote(false);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Delete this highlight from Corpus?')) {
      setIsBusy(true);
      try {
        await onDelete(highlight.id);
        onClose();
      } finally {
        setIsBusy(false);
      }
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        zIndex: 2147483647,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        filter: 'drop-shadow(0 8px 24px rgba(26, 26, 34, 0.16))',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        style={{
          width: '280px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid rgba(26, 26, 34, 0.1)',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          fontSize: '12px',
          color: '#1A1A22',
        }}
      >
        {/* Header with tag switcher and close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {TAG_DEFINITIONS.map(({ tag, label }) => {
              const palette = TAG_COLORS[tag];
              const isSelected = currentTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  title={label}
                  disabled={isBusy}
                  onClick={() => handleTagChange(tag)}
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: palette.hex,
                    border: isSelected ? '2px solid #1A1A22' : '2px solid transparent',
                    cursor: 'pointer',
                    padding: 0,
                    outline: 'none',
                    transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                    transition: 'transform 0.1s ease',
                  }}
                />
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              onClick={handleDelete}
              title="Delete highlight"
              disabled={isBusy}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#EF4444',
                padding: '3px',
                cursor: 'pointer',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Trash2 style={{ width: '13px', height: '13px' }} />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#6E6E76',
                padding: '3px',
                cursor: 'pointer',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X style={{ width: '14px', height: '14px' }} />
            </button>
          </div>
        </div>

        {/* Selected text excerpt */}
        <div
          style={{
            fontSize: '11px',
            color: '#6E6E76',
            maxHeight: '48px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: '1.4',
            fontStyle: 'italic',
            borderLeft: `2px solid ${TAG_COLORS[currentTag].hex}`,
            paddingLeft: '6px',
          }}
        >
          "{highlight.selectedText}"
        </div>

        {/* Note section */}
        {isEditingNote ? (
          <form onSubmit={handleSaveNote} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <input
              type="text"
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Edit note..."
              style={{
                width: '100%',
                fontSize: '11px',
                padding: '4px 6px',
                border: '1px solid rgba(26, 26, 34, 0.2)',
                borderRadius: '6px',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setIsEditingNote(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '10px',
                  color: '#6E6E76',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  backgroundColor: '#1A1A22',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '10px',
                  cursor: 'pointer',
                }}
              >
                Save
              </button>
            </div>
          </form>
        ) : (
          <div
            onClick={() => setIsEditingNote(true)}
            style={{
              fontSize: '11px',
              backgroundColor: '#F6F3EC',
              padding: '6px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '4px',
            }}
          >
            <span style={{ color: note ? '#1A1A22' : '#6E6E76', fontStyle: note ? 'normal' : 'italic' }}>
              {note || 'Click to add a note...'}
            </span>
            <Edit3 style={{ width: '11px', height: '11px', color: '#6E6E76', flexShrink: 0 }} />
          </div>
        )}

        {/* Footer timestamp */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: '#6E6E76', paddingTop: '2px', borderTop: '1px solid rgba(26, 26, 34, 0.06)' }}>
          <span>{new Date(highlight.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          <span style={{ fontStyle: 'italic' }}>Stored locally</span>
        </div>
      </div>
    </div>
  );
};
