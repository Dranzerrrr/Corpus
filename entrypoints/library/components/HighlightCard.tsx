import React, { useState } from 'react';
import type { HighlightRecord, SourceRecord, HighlightTag } from '../../../src/db';
import { TAG_COLORS } from '../../../src/features/web-highlighter/anchoring';
import { 
  FileText, 
  Globe, 
  ExternalLink, 
  Copy, 
  Check, 
  Trash2, 
  Edit3, 
  MessageSquare,
  ChevronDown
} from 'lucide-react';

interface HighlightCardProps {
  highlight: HighlightRecord;
  source?: SourceRecord;
  onUpdateTag: (id: string, tag: HighlightTag) => Promise<void>;
  onUpdateNote: (id: string, note?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const TAG_OPTIONS: Array<{ tag: HighlightTag; label: string }> = [
  { tag: 'amber', label: 'General / Unsorted' },
  { tag: 'violet', label: 'Key argument / Thesis' },
  { tag: 'teal', label: 'Open question' },
  { tag: 'coral', label: 'Critique / Disagree' },
];

export const HighlightCard: React.FC<HighlightCardProps> = ({
  highlight,
  source,
  onUpdateTag,
  onUpdateNote,
  onDelete,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(highlight.note || '');
  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const palette = TAG_COLORS[highlight.tag] || TAG_COLORS.amber;

  const handleCopy = async () => {
    try {
      const citationText = `"${highlight.selectedText}" — ${highlight.sourceTitle}${
        highlight.pageNumber ? ` (p. ${highlight.pageNumber})` : ''
      }`;
      await navigator.clipboard.writeText(citationText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy quote', err);
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateNote(highlight.id, noteText.trim() || undefined);
    setIsEditingNote(false);
  };

  const handleDelete = async () => {
    if (confirm('Delete this highlight?')) {
      setIsDeleting(true);
      try {
        await onDelete(highlight.id);
      } catch (err) {
        console.error('Failed to delete highlight', err);
        setIsDeleting(false);
      }
    }
  };

  const openSource = () => {
    if (source?.type === 'pdf') {
      const viewerUrl = chrome.runtime.getURL(
        `viewer.html?hash=${highlight.sourceFingerprint}${
          highlight.pageNumber ? `#page=${highlight.pageNumber}` : ''
        }`
      );
      chrome.tabs.create({ url: viewerUrl });
    } else {
      const webUrl = highlight.url || source?.url || highlight.sourceFingerprint;
      chrome.tabs.create({ url: webUrl });
    }
  };

  return (
    <article className="bg-canvas border border-ink/10 rounded-lg p-4 transition-colors hover:border-ink/20 flex flex-col gap-3 relative">
      {/* Header with Source Badge, Tag Switcher, and Actions */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={openSource}
          className="flex items-center gap-1.5 text-xs text-slate hover:text-ink transition-colors font-medium truncate max-w-[70%]"
          title="Open original reading"
        >
          {source?.type === 'pdf' ? (
            <FileText className="w-3.5 h-3.5 shrink-0 text-slate" />
          ) : (
            <Globe className="w-3.5 h-3.5 shrink-0 text-slate" />
          )}
          <span className="truncate">{highlight.sourceTitle}</span>
          {highlight.pageNumber && (
            <span className="shrink-0 font-mono text-[10px] bg-paper px-1.5 py-0.5 rounded border border-ink/5">
              p. {highlight.pageNumber}
            </span>
          )}
          <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
        </button>

        {/* Tag selector and card utility buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="relative">
            <button
              onClick={() => setIsTagMenuOpen(!isTagMenuOpen)}
              className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border transition-all"
              style={{
                backgroundColor: `${palette.hex}20`,
                borderColor: `${palette.hex}60`,
                color: palette.text,
              }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: palette.hex }}
              />
              <span className="capitalize">{highlight.tag}</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {isTagMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-canvas border border-ink/10 rounded-lg shadow-lg py-1 z-30 flex flex-col gap-0.5">
                {TAG_OPTIONS.map((opt) => {
                  const optColor = TAG_COLORS[opt.tag];
                  return (
                    <button
                      key={opt.tag}
                      onClick={() => {
                        onUpdateTag(highlight.id, opt.tag);
                        setIsTagMenuOpen(false);
                      }}
                      className="px-2.5 py-1.5 text-left text-xs hover:bg-paper flex items-center gap-2 text-ink transition-colors"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: optColor.hex }}
                      />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={handleCopy}
            className="p-1 rounded text-slate hover:text-ink hover:bg-paper transition-colors"
            title="Copy quote and citation"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1 rounded text-slate hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Delete highlight"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Selected Excerpt */}
      <blockquote
        className="pl-3 text-ink text-sm leading-relaxed font-sans select-text border-l-2"
        style={{ borderColor: palette.hex }}
      >
        "{highlight.selectedText}"
      </blockquote>

      {/* Note Section */}
      {isEditingNote ? (
        <form onSubmit={handleSaveNote} className="flex flex-col gap-1.5 pt-1">
          <textarea
            autoFocus
            rows={2}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Write synthesis note, question, or reflection..."
            className="w-full text-xs p-2 rounded-md border border-ink/20 focus:border-focus-start outline-none font-sans bg-paper/50 resize-none"
          />
          <div className="flex justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={() => setIsEditingNote(false)}
              className="px-2.5 py-1 text-slate hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-ink text-white rounded-md font-medium text-xs hover:bg-ink/90"
            >
              Save Note
            </button>
          </div>
        </form>
      ) : highlight.note ? (
        <div
          onClick={() => setIsEditingNote(true)}
          className="bg-paper/70 rounded-md p-2.5 flex items-start justify-between gap-2 cursor-pointer group hover:bg-paper transition-colors"
        >
          <div className="flex items-start gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-slate shrink-0 mt-0.5" />
            <p className="text-xs text-ink leading-relaxed">{highlight.note}</p>
          </div>
          <Edit3 className="w-3 h-3 text-slate opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>
      ) : (
        <button
          onClick={() => setIsEditingNote(true)}
          className="self-start text-[11px] text-slate/70 hover:text-slate flex items-center gap-1.5 transition-colors"
        >
          <MessageSquare className="w-3 h-3" />
          <span>Add note...</span>
        </button>
      )}

      {/* Footer Metadata */}
      <div className="flex items-center justify-between text-[11px] text-slate border-t border-ink/5 pt-2">
        <span className="truncate">
          {source?.author && <span>{source.author} · </span>}
          {source?.year && <span>{source.year} · </span>}
          <span>{new Date(highlight.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        </span>
        <span className="italic text-[10px] text-slate/60">Local-only</span>
      </div>
    </article>
  );
};
