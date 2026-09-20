import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { HighlightTag, HighlightRecord } from '../../../db/schema';
import {
  captureWebAnchor,
  resolveWebAnchor,
  wrapRangeWithHighlight,
  removeHighlightMarks,
  TAG_COLORS,
} from '../anchoring';
import { WebToolbar } from './WebToolbar';
import { HighlightPopover } from './HighlightPopover';
import type { WebHighlighterResponse } from '../types';

export interface WebHighlighterOverlayRef {
  handleTextSelection: (range: Range, rect: DOMRect) => void;
  clearActiveSelection: () => void;
}

export const WebHighlighterOverlay: React.FC = () => {
  const [activeSelection, setActiveSelection] = useState<{
    range: Range;
    position: { x: number; y: number };
  } | null>(null);

  const [activePopover, setActivePopover] = useState<{
    highlight: HighlightRecord;
    position: { x: number; y: number };
  } | null>(null);

  const knownHighlightsRef = useRef<Map<string, HighlightRecord>>(new Map());

  // Attach click listeners to in-page marks to trigger HighlightPopover
  const attachMarkListeners = useCallback((highlight: HighlightRecord) => {
    knownHighlightsRef.current.set(highlight.id, highlight);
    const marks = document.querySelectorAll(`[data-corpus-highlight-id="${CSS.escape(highlight.id)}"]`);
    marks.forEach((mark) => {
      // Remove any existing click handler
      mark.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const rect = mark.getBoundingClientRect();
        setActiveSelection(null);
        setActivePopover({
          highlight,
          position: { x: rect.left + rect.width / 2, y: rect.top },
        });
      });
    });
  }, []);

  // Hydrate all existing highlights for current canonical URL
  const hydrateHighlights = useCallback(async () => {
    try {
      const response: WebHighlighterResponse<HighlightRecord[]> = await chrome.runtime.sendMessage({
        type: 'WEB_GET_HIGHLIGHTS',
        payload: { url: window.location.href },
      });

      if (response && response.success && response.data) {
        for (const hl of response.data) {
          // If already marked in DOM, skip
          if (document.querySelector(`[data-corpus-highlight-id="${CSS.escape(hl.id)}"]`)) {
            attachMarkListeners(hl);
            continue;
          }

          if (hl.anchor && 'prefix' in hl.anchor) {
            const range = resolveWebAnchor(document.body, hl.anchor);
            if (range) {
              wrapRangeWithHighlight(range, hl.id, hl.tag, hl.note);
              attachMarkListeners(hl);
            }
          }
        }
      }
    } catch (err) {
      console.warn('Corpus: Unable to fetch page highlights from background', err);
    }
  }, [attachMarkListeners]);

  // Initial hydration on mount + fallback observer for dynamically loaded content
  useEffect(() => {
    // Run after DOM has settled
    const timer = setTimeout(() => {
      hydrateHighlights();
    }, 400);

    // Re-check for any unresolved highlights on significant DOM additions (e.g. SPAs)
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const observer = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        hydrateHighlights();
      }, 1200);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      if (debounceTimer) clearTimeout(debounceTimer);
      observer.disconnect();
    };
  }, [hydrateHighlights]);

  // Global mouse selection listener
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      // If clicking inside active popover or toolbar, don't dismiss
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[data-corpus-ui]') || target?.hasAttribute?.('data-corpus-highlight')) {
        return;
      }

      // Small delay to let browser finalize selection range
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.toString().trim()) {
          return;
        }

        const selectedText = selection.toString().trim();
        // Ignore single character or overly massive accidental selections
        if (selectedText.length < 2 || selectedText.length > 50000) {
          return;
        }

        const range = selection.getRangeAt(0);
        // Check that selection is not in an editable field or inside Corpus UI
        const container = range.commonAncestorContainer;
        const el = container.nodeType === Node.ELEMENT_NODE ? (container as HTMLElement) : container.parentElement;
        if (
          el?.tagName === 'INPUT' ||
          el?.tagName === 'TEXTAREA' ||
          el?.isContentEditable ||
          el?.closest?.('[data-corpus-ui]')
        ) {
          return;
        }

        const rect = range.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;

        setActivePopover(null);
        setActiveSelection({
          range: range.cloneRange(),
          position: { x: rect.left + rect.width / 2, y: rect.top },
        });
      }, 20);
    };

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[data-corpus-ui]') || target?.hasAttribute?.('data-corpus-highlight')) {
        return;
      }
      // Clicking empty area dismisses popover
      setActivePopover(null);
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  // Save new highlight
  const handleSaveHighlight = async (tag: HighlightTag, note?: string) => {
    if (!activeSelection) return;

    const { range } = activeSelection;
    const anchor = captureWebAnchor(range);
    const selectedText = range.toString().trim();

    const response: WebHighlighterResponse<HighlightRecord> = await chrome.runtime.sendMessage({
      type: 'WEB_SAVE_HIGHLIGHT',
      payload: {
        url: window.location.href,
        title: document.title,
        selectedText,
        anchor,
        tag,
        note,
      },
    });

    if (response && response.success && response.data) {
      const newHl = response.data;
      wrapRangeWithHighlight(range, newHl.id, tag, note);
      attachMarkListeners(newHl);
      window.getSelection()?.removeAllRanges();
    }
  };

  // Update existing highlight
  const handleUpdateHighlight = async (id: string, tag?: HighlightTag, note?: string) => {
    const response: WebHighlighterResponse<HighlightRecord> = await chrome.runtime.sendMessage({
      type: 'WEB_UPDATE_HIGHLIGHT',
      payload: { id, tag, note },
    });

    if (response && response.success && response.data) {
      const updated = response.data;
      knownHighlightsRef.current.set(id, updated);
      // Update DOM marks
      const marks = document.querySelectorAll(`[data-corpus-highlight-id="${CSS.escape(id)}"]`);
      marks.forEach((mark) => {
        const el = mark as HTMLElement;
        if (tag) {
          el.setAttribute('data-corpus-tag', tag);
          const palette = TAG_COLORS[tag];
          el.style.backgroundColor = palette.bg;
          el.style.borderBottom = `2px solid ${palette.border}`;
        }
        if (note !== undefined) {
          el.setAttribute('data-corpus-note', note);
        }
      });
      setActivePopover((prev) => (prev ? { ...prev, highlight: updated } : null));
    }
  };

  // Delete highlight
  const handleDeleteHighlight = async (id: string) => {
    const response: WebHighlighterResponse = await chrome.runtime.sendMessage({
      type: 'WEB_DELETE_HIGHLIGHT',
      payload: { id },
    });

    if (response && response.success) {
      removeHighlightMarks(id);
      knownHighlightsRef.current.delete(id);
      setActivePopover(null);
    }
  };

  return (
    <div data-corpus-ui="true">
      {activeSelection && (
        <WebToolbar
          position={activeSelection.position}
          onSave={handleSaveHighlight}
          onDismiss={() => {
            setActiveSelection(null);
            window.getSelection()?.removeAllRanges();
          }}
        />
      )}

      {activePopover && (
        <HighlightPopover
          highlight={activePopover.highlight}
          position={activePopover.position}
          onUpdate={handleUpdateHighlight}
          onDelete={handleDeleteHighlight}
          onClose={() => setActivePopover(null)}
        />
      )}
    </div>
  );
};
