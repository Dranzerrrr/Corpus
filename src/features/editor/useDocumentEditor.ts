import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  type DocumentRecord,
  type BlockRecord,
  type BlockType,
  type BlockMetadata,
  type HighlightRecord,
  type SourceRecord,
} from '../../db';

export function useDocumentEditor(initialDocId?: string | null) {
  const [activeDocId, setActiveDocId] = useState<string | null>(initialDocId || null);

  // Live query for all documents
  const documents = useLiveQuery(() => db.documents.orderBy('createdAt').reverse().toArray(), []) || [];

  // If no active doc selected and documents exist, default to the first one
  useEffect(() => {
    if (!activeDocId && documents.length > 0) {
      setActiveDocId(documents[0].id);
    }
  }, [activeDocId, documents]);

  // Active document record
  const activeDoc = useMemo(() => {
    return documents.find((d) => d.id === activeDocId) || null;
  }, [documents, activeDocId]);

  // Live query for blocks belonging to the active document
  const rawBlocks = useLiveQuery(
    async () => {
      if (!activeDocId) return [];
      return await db.blocks.where('documentId').equals(activeDocId).sortBy('sortOrder');
    },
    [activeDocId]
  ) || [];

  // Set of highlightRefIds present in the active document (for duplicate warning)
  const insertedHighlightIds = useMemo(() => {
    const set = new Set<string>();
    for (const b of rawBlocks) {
      if (b.highlightRefId) {
        set.add(b.highlightRefId);
      }
    }
    return set;
  }, [rawBlocks]);

  // Document Management
  const createDocument = async (title: string = 'Untitled Synthesis Draft'): Promise<string> => {
    const docId = 'doc-' + crypto.randomUUID();
    const newDoc: DocumentRecord = {
      id: docId,
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.documents.add(newDoc);

    // Seed with an initial heading and text block
    const headingBlock: BlockRecord = {
      id: 'blk-' + crypto.randomUUID(),
      documentId: docId,
      sortOrder: 1,
      type: 'heading',
      content: title,
      metadata: { level: 1 },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const textBlock: BlockRecord = {
      id: 'blk-' + crypto.randomUUID(),
      documentId: docId,
      sortOrder: 2,
      type: 'text',
      content: '',
      createdAt: Date.now() + 1,
      updatedAt: Date.now() + 1,
    };

    await db.blocks.bulkAdd([headingBlock, textBlock]);
    setActiveDocId(docId);
    return docId;
  };

  const updateDocumentTitle = async (id: string, title: string) => {
    await db.documents.update(id, { title, updatedAt: Date.now() });
  };

  const deleteDocument = async (id: string) => {
    await db.transaction('rw', db.documents, db.blocks, async () => {
      await db.blocks.where('documentId').equals(id).delete();
      await db.documents.delete(id);
    });

    if (activeDocId === id) {
      const remaining = documents.filter((d) => d.id !== id);
      setActiveDocId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // Block Operations
  const addBlock = async (
    type: BlockType,
    afterBlockId?: string,
    content: string = '',
    metadata?: BlockMetadata,
    highlightRefId?: string
  ): Promise<string> => {
    if (!activeDocId) return '';

    let sortOrder = 1;
    if (afterBlockId) {
      const index = rawBlocks.findIndex((b) => b.id === afterBlockId);
      if (index !== -1) {
        const currentOrder = rawBlocks[index].sortOrder;
        const nextOrder = rawBlocks[index + 1] ? rawBlocks[index + 1].sortOrder : currentOrder + 2;
        sortOrder = (currentOrder + nextOrder) / 2;
      }
    } else if (rawBlocks.length > 0) {
      sortOrder = rawBlocks[rawBlocks.length - 1].sortOrder + 1;
    }

    const newBlock: BlockRecord = {
      id: 'blk-' + crypto.randomUUID(),
      documentId: activeDocId,
      sortOrder,
      type,
      content,
      metadata: metadata || (type === 'heading' ? { level: 2 } : undefined),
      highlightRefId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.blocks.add(newBlock);
    await db.documents.update(activeDocId, { updatedAt: Date.now() });
    return newBlock.id;
  };

  const updateBlock = async (id: string, content: string, metadata?: BlockMetadata) => {
    if (!activeDocId) return;
    const updates: Partial<BlockRecord> = { content, updatedAt: Date.now() };
    if (metadata !== undefined) {
      updates.metadata = metadata;
    }
    await db.blocks.update(id, updates);
    await db.documents.update(activeDocId, { updatedAt: Date.now() });
  };

  const deleteBlock = async (id: string) => {
    if (!activeDocId) return;
    await db.blocks.delete(id);
    await db.documents.update(activeDocId, { updatedAt: Date.now() });
  };

  const moveBlock = async (id: string, direction: 'up' | 'down') => {
    if (!activeDocId) return;
    const index = rawBlocks.findIndex((b) => b.id === id);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= rawBlocks.length) return;

    const currentBlock = rawBlocks[index];
    const targetBlock = rawBlocks[targetIndex];

    // Swap sortOrder
    await db.transaction('rw', db.blocks, async () => {
      await db.blocks.update(currentBlock.id, { sortOrder: targetBlock.sortOrder });
      await db.blocks.update(targetBlock.id, { sortOrder: currentBlock.sortOrder });
    });
  };

  // Connective loop: Import a highlight as a Quote or Citation block
  const importHighlight = async (
    highlight: HighlightRecord,
    source?: SourceRecord,
    asCitation: boolean = false
  ) => {
    if (!activeDocId) {
      // If no active doc, create one first
      const newId = await createDocument('Synthesis of ' + highlight.sourceTitle);
      setActiveDocId(newId);
    }

    const type: BlockType = asCitation ? 'citation' : 'quote';
    const metadata: BlockMetadata = {
      author: highlight.author || source?.author,
      year: highlight.year || source?.year,
      sourceTitle: highlight.sourceTitle || source?.title,
      url: highlight.url || source?.url,
      pageNumber: highlight.pageNumber,
    };

    await addBlock(type, undefined, highlight.selectedText, metadata, highlight.id);
  };

  return {
    documents,
    activeDoc,
    activeDocId,
    setActiveDocId,
    blocks: rawBlocks,
    insertedHighlightIds,
    createDocument,
    updateDocumentTitle,
    deleteDocument,
    addBlock,
    updateBlock,
    deleteBlock,
    moveBlock,
    importHighlight,
  };
}
