import Dexie, { type Table } from 'dexie';

export type SourceType = 'web' | 'pdf';
export type HighlightTag = 'amber' | 'violet' | 'teal' | 'coral';
export type BlockType = 'heading' | 'text' | 'quote' | 'citation';
export type HeadingLevel = 1 | 2 | 3;

export interface WebAnchor {
  exact: string;
  prefix: string;          // Context before selection (robust against dynamic DOM shifts)
  suffix: string;          // Context after selection
  startOffset: number;
  endOffset: number;
  selectorPath?: string;   // CSS selector fallback
}

export interface PdfAnchor {
  exact: string;
  pageIndex: number;       // 1-indexed PDF page
  matchIndex?: number;     // N-th occurrence on page
  quadPoints?: number[];   // Bounding box coordinates for exact overlay rendering
}

export interface SourceRecord {
  id: string;              // UUIDv4
  type: SourceType;
  fingerprint: string;     // Canonical URL for Web; SHA-256 content hash for PDF
  title: string;
  url?: string;            // Original web URL or file name
  author?: string;
  year?: string;
  fileSizeBytes?: number;
  createdAt: number;
  lastAccessedAt: number;
}

export interface HighlightRecord {
  id: string;              // UUIDv4
  sourceId: string;
  sourceFingerprint: string;
  sourceTitle: string;
  selectedText: string;
  anchor: WebAnchor | PdfAnchor;
  pageNumber?: number;     // Set if type === 'pdf'
  tag: HighlightTag;       // Default: 'amber'
  note?: string;
  author?: string;
  year?: string;
  url?: string;
  createdAt: number;
  updatedAt: number;
}

export interface DocumentRecord {
  id: string;              // UUIDv4
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface BlockMetadata {
  level?: HeadingLevel;
  author?: string;
  sourceTitle?: string;
  url?: string;
  year?: string;
  pageNumber?: number;
}

export interface BlockRecord {
  id: string;              // UUIDv4
  documentId: string;
  sortOrder: number;       // Fractional or integer index for ordering
  type: BlockType;
  content: string;
  highlightRefId?: string; // Links block directly to source highlight
  metadata?: BlockMetadata;
  createdAt: number;
  updatedAt: number;
}

export class CorpusDB extends Dexie {
  sources!: Table<SourceRecord, string>;
  highlights!: Table<HighlightRecord, string>;
  documents!: Table<DocumentRecord, string>;
  blocks!: Table<BlockRecord, string>;

  constructor() {
    super('CorpusDB');
    this.version(1).stores({
      sources: '&id, &fingerprint, type, createdAt, lastAccessedAt',
      highlights: '&id, sourceId, sourceFingerprint, tag, createdAt, [sourceFingerprint+pageNumber]',
      documents: '&id, createdAt, updatedAt',
      blocks: '&id, documentId, [documentId+sortOrder], highlightRefId',
    });
  }
}

export const db = new CorpusDB();
