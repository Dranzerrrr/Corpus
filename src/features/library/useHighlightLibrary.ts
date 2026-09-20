import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type HighlightRecord, type SourceRecord, type HighlightTag } from '../../db';

export type SortOrder = 'newest' | 'oldest';

export interface HighlightFilterState {
  searchQuery: string;
  tag: HighlightTag | 'all';
  sourceType: 'all' | 'pdf' | 'web';
  sourceFingerprint: string | null;
  sortOrder: SortOrder;
}

export function useHighlightLibrary() {
  const [filters, setFilters] = useState<HighlightFilterState>({
    searchQuery: '',
    tag: 'all',
    sourceType: 'all',
    sourceFingerprint: null,
    sortOrder: 'newest',
  });

  // Live queries to Dexie
  const highlights = useLiveQuery(() => db.highlights.toArray(), []) || [];
  const sources = useLiveQuery(() => db.sources.toArray(), []) || [];
  const isLoading = highlights === undefined || sources === undefined;

  // Map of fingerprint -> SourceRecord for fast lookup
  const sourceMap = useMemo(() => {
    const map = new Map<string, SourceRecord>();
    for (const src of sources) {
      map.set(src.fingerprint, src);
    }
    return map;
  }, [sources]);

  // Compute tag counts
  const tagCounts = useMemo(() => {
    const counts = {
      all: highlights.length,
      amber: 0,
      violet: 0,
      teal: 0,
      coral: 0,
    };
    for (const hl of highlights) {
      if (hl.tag in counts) {
        counts[hl.tag as HighlightTag]++;
      }
    }
    return counts;
  }, [highlights]);

  // Filter and sort highlights
  const filteredHighlights = useMemo(() => {
    const query = filters.searchQuery.trim().toLowerCase();

    return highlights
      .filter((hl) => {
        // Tag filter
        if (filters.tag !== 'all' && hl.tag !== filters.tag) {
          return false;
        }

        // Source fingerprint filter
        if (filters.sourceFingerprint && hl.sourceFingerprint !== filters.sourceFingerprint) {
          return false;
        }

        // Source type filter
        if (filters.sourceType !== 'all') {
          const source = sourceMap.get(hl.sourceFingerprint);
          if (source && source.type !== filters.sourceType) {
            return false;
          }
        }

        // Search query
        if (query) {
          const matchesText = hl.selectedText.toLowerCase().includes(query);
          const matchesNote = hl.note ? hl.note.toLowerCase().includes(query) : false;
          const matchesTitle = hl.sourceTitle ? hl.sourceTitle.toLowerCase().includes(query) : false;
          const matchesAuthor = hl.author ? hl.author.toLowerCase().includes(query) : false;
          if (!matchesText && !matchesNote && !matchesTitle && !matchesAuthor) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (filters.sortOrder === 'newest') {
          return b.createdAt - a.createdAt;
        } else {
          return a.createdAt - b.createdAt;
        }
      });
  }, [highlights, filters, sourceMap]);

  // Database mutation helpers
  const updateHighlightTag = async (id: string, tag: HighlightTag) => {
    await db.highlights.update(id, { tag, updatedAt: Date.now() });
  };

  const updateHighlightNote = async (id: string, note?: string) => {
    await db.highlights.update(id, { note: note || undefined, updatedAt: Date.now() });
  };

  const deleteHighlight = async (id: string) => {
    await db.highlights.delete(id);
  };

  // Export safety net (PRD Section 7/9)
  const exportToMarkdown = (list: HighlightRecord[] = filteredHighlights) => {
    const lines: string[] = [
      '# Corpus Highlights Export',
      `*Exported on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} — ${list.length} highlights*`,
      '',
      '---',
      '',
    ];

    for (const hl of list) {
      const source = sourceMap.get(hl.sourceFingerprint);
      const tagLabel = hl.tag.toUpperCase();
      lines.push(`### [${tagLabel}] ${hl.sourceTitle}`);
      if (source?.author || source?.year) {
        lines.push(`*${[source.author, source.year].filter(Boolean).join(', ')}*`);
      }
      lines.push('');
      lines.push(`> "${hl.selectedText}"`);
      lines.push('');
      if (hl.note) {
        lines.push(`**Note**: ${hl.note}`);
        lines.push('');
      }
      if (hl.url) {
        lines.push(`Source URL: [${hl.url}](${hl.url})`);
      }
      lines.push(`*Created: ${new Date(hl.createdAt).toLocaleString()}*`);
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `corpus-highlights-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToJson = (list: HighlightRecord[] = filteredHighlights) => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      count: list.length,
      highlights: list,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `corpus-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    highlights: filteredHighlights,
    rawHighlights: highlights,
    sources,
    sourceMap,
    tagCounts,
    filters,
    setFilters,
    isLoading,
    updateHighlightTag,
    updateHighlightNote,
    deleteHighlight,
    exportToMarkdown,
    exportToJson,
  };
}
