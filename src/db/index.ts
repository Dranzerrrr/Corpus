import { db, type DocumentRecord, type BlockRecord, type HighlightRecord, type SourceRecord } from './schema';
import { ensurePersistentStorage } from './persistence';

/**
 * Ensures persistent storage is requested and seeds initial demo records if database is empty
 */
export async function initializeDatabase(): Promise<{ defaultDocId?: string; isInitialized: boolean }> {
  // Ensure persistence request is made per PRD Section 6
  await ensurePersistentStorage();

  const existingDocs = await db.documents.count();

  if (existingDocs === 0) {
    const source1Id = 'src-' + crypto.randomUUID();
    const source2Id = 'src-' + crypto.randomUUID();

    const sampleSources: SourceRecord[] = [
      {
        id: source1Id,
        type: 'web',
        fingerprint: 'https://arxiv.org/abs/1706.03762',
        title: 'Attention Is All You Need',
        author: 'Vaswani et al.',
        year: '2017',
        url: 'https://arxiv.org/abs/1706.03762',
        createdAt: Date.now() - 3600000 * 48,
        lastAccessedAt: Date.now() - 3600000 * 2,
      },
      {
        id: source2Id,
        type: 'pdf',
        fingerprint: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        title: 'Cognitive Load Theory in Digital Reading',
        author: 'Sweller, J.',
        year: '2021',
        url: 'sweller2021_reading.pdf',
        fileSizeBytes: 2451000,
        createdAt: Date.now() - 3600000 * 24,
        lastAccessedAt: Date.now() - 3600000 * 1,
      },
    ];

    await db.sources.bulkAdd(sampleSources);

    const hl1Id = 'hl-' + crypto.randomUUID();
    const hl2Id = 'hl-' + crypto.randomUUID();

    const sampleHighlights: HighlightRecord[] = [
      {
        id: hl1Id,
        sourceId: source1Id,
        sourceTitle: sampleSources[0].title,
        sourceFingerprint: sampleSources[0].fingerprint,
        selectedText: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks.',
        anchor: {
          exact: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks.',
          prefix: 'Abstract: ',
          suffix: ' that include an encoder and a decoder.',
          startOffset: 120,
          endOffset: 235,
        },
        tag: 'violet',
        note: 'Baseline comparison: RNN/CNN vs Transformer architecture.',
        author: 'Vaswani et al.',
        year: '2017',
        url: sampleSources[0].url,
        createdAt: Date.now() - 3600000 * 5,
        updatedAt: Date.now() - 3600000 * 5,
      },
      {
        id: hl2Id,
        sourceId: source2Id,
        sourceTitle: sampleSources[1].title,
        sourceFingerprint: sampleSources[1].fingerprint,
        selectedText: 'Splitting attention between distinct windows increases extraneous cognitive load.',
        pageNumber: 3,
        anchor: {
          exact: 'Splitting attention between distinct windows increases extraneous cognitive load.',
          pageIndex: 3,
        },
        tag: 'coral',
        note: 'Direct empirical justification for integrated in-browser workspace.',
        author: 'Sweller, J.',
        year: '2021',
        createdAt: Date.now() - 3600000 * 2,
        updatedAt: Date.now() - 3600000 * 2,
      },
    ];

    await db.highlights.bulkAdd(sampleHighlights);

    const docId = 'doc-' + crypto.randomUUID();
    const sampleDoc: DocumentRecord = {
      id: docId,
      title: 'Literature Review: Attention Mechanisms & Cognitive Workflows',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.documents.add(sampleDoc);

    const sampleBlocks: BlockRecord[] = [
      {
        id: crypto.randomUUID(),
        documentId: docId,
        sortOrder: 1,
        type: 'heading',
        content: '1. Introduction to Unified Research Workflows',
        metadata: { level: 1 },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: crypto.randomUUID(),
        documentId: docId,
        sortOrder: 2,
        type: 'text',
        content: 'Modern research synthesis requires constant movement between dense primary sources and drafting canvases.',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: crypto.randomUUID(),
        documentId: docId,
        sortOrder: 3,
        type: 'quote',
        content: sampleHighlights[0].selectedText,
        highlightRefId: hl1Id,
        metadata: {
          author: sampleHighlights[0].author,
          sourceTitle: sampleHighlights[0].sourceTitle,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    await db.blocks.bulkAdd(sampleBlocks);
    return { defaultDocId: docId, isInitialized: true };
  }

  const firstDoc = await db.documents.orderBy('createdAt').first();
  return { defaultDocId: firstDoc?.id, isInitialized: true };
}

export * from './schema';
export * from './persistence';
export * from './opfs';
