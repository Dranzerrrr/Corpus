import React, { useState } from 'react';
import type { HighlightTag } from '../../../db/schema';
import { TAG_COLORS } from '../anchoring';
import { MessageSquare, Check, X } from 'lucide-react';

interface WebToolbarProps {
  position: { x: number; y: number };
  onSave: (tag: HighlightTag, note?: string) => Promise<void>;
  onDismiss: () => void;
}

const TAG_DEFINITIONS: Array<{ tag: HighlightTag; label: string }> = [
  { tag: 'amber', label: 'General / Unsorted' },
  { tag: 'violet', label: 'Key argument / Thesis' },
  { tag: 'teal', label: 'Open question' },
  { tag: 'coral', label: 'Critique / Disagree' },
];

export const WebToolbar: React.FC<WebToolbarProps> = ({ position, onSave, onDismiss }) => {
  const [selectedTag, setSelectedTag] = useState<HighlightTag>('amber');
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSelectTag = async (tag: HighlightTag) => {
    setSelectedTag(tag);
    setIsSaving(true);
    try {
      await onSave(tag, noteText.trim() ? noteText.trim() : undefined);
      setIsSaved(true);
      setTimeout(() => {
        onDismiss();
      }, 1000);
    } catch (err) {
      console.error('Failed to save highlight:', err);
      setIsSaving(false);
    }
  };

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    handleSelectTag(selectedTag);
  };

  // Position calculation (ensure toolbar stays within viewport)
  const left = Math.max(16, Math.min(window.innerWidth - 280, position.x - 120));
  const top = Math.max(16, position.y - (isNoteOpen ? 140 : 54));

  if (isSaved) {
    return (
      <div
        style={{
          position: 'fixed',
          left: `${left + 40}px`,
          top: `${top}px`,
          zIndex: 2147483647,
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#1A1A22',
            color: '#FFFFFF',
            fontSize: '12px',
            fontWeight: 500,
            padding: '6px 14px',
            borderRadius: '9999px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
            animation: 'corpus-fade-in 0.2s ease',
          }}
        >
          <Check style={{ width: '14px', height: '14px', color: '#10B981' }} />
          <span>Saved to Corpus</span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        zIndex: 2147483647,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        filter: 'drop-shadow(0 6px 16px rgba(26, 26, 34, 0.12))',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid rgba(26, 26, 34, 0.1)',
          borderRadius: isNoteOpen ? '14px' : '9999px',
          padding: isNoteOpen ? '10px 12px' : '4px 8px',
          display: 'flex',
          flexDirection: isNoteOpen ? 'column' : 'row',
          alignItems: 'center',
          gap: isNoteOpen ? '8px' : '6px',
          transition: 'all 0.15s ease',
          minWidth: isNoteOpen ? '250px' : 'auto',
        }}
      >
        {/* Tag palette selection */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {TAG_DEFINITIONS.map(({ tag, label }) => {
            const palette = TAG_COLORS[tag];
            const isHovered = selectedTag === tag;
            return (
              <button
                key={tag}
                type="button"
                title={label}
                disabled={isSaving}
                onClick={() => handleSelectTag(tag)}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: palette.hex,
                  border: isHovered ? '2px solid #1A1A22' : '2px solid transparent',
                  cursor: 'pointer',
                  padding: 0,
                  outline: 'none',
                  transition: 'transform 0.1s ease',
                  transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                }}
              />
            );
          })}
        </div>

        <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(26, 26, 34, 0.12)' }} />

        {/* Note toggle */}
        <button
          type="button"
          title="Add a note to highlight"
          onClick={() => setIsNoteOpen(!isNoteOpen)}
          style={{
            background: isNoteOpen ? 'rgba(87, 80, 224, 0.1)' : 'transparent',
            border: 'none',
            borderRadius: '6px',
            padding: '4px 6px',
            color: isNoteOpen ? '#5750E0' : '#6E6E76',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 500,
          }}
        >
          <MessageSquare style={{ width: '13px', height: '13px' }} />
          <span>{isNoteOpen ? 'Hide' : 'Note'}</span>
        </button>

        {/* Dismiss button */}
        <button
          type="button"
          onClick={onDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '2px',
            color: '#6E6E76',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            borderRadius: '50%',
          }}
        >
          <X style={{ width: '13px', height: '13px' }} />
        </button>

        {/* Note expansion input */}
        {isNoteOpen && (
          <form
            onSubmit={handleNoteSubmit}
            style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}
          >
            <input
              type="text"
              autoFocus
              placeholder="Add synthesis note or thought..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              style={{
                width: '100%',
                fontSize: '11px',
                padding: '6px 8px',
                border: '1px solid rgba(26, 26, 34, 0.15)',
                borderRadius: '6px',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: '#6E6E76', fontStyle: 'italic' }}>
                Stored only on this device
              </span>
              <button
                type="submit"
                disabled={isSaving}
                style={{
                  backgroundColor: '#1A1A22',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Save
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
