import type { DocumentRecord, BlockRecord } from '../../db/schema';

/**
 * Converts a Corpus DocumentRecord and its ordered BlockRecords into clean Markdown
 */
export function exportDocumentToMarkdown(
  doc: DocumentRecord,
  blocks: BlockRecord[]
): { markdown: string; filename: string } {
  const lines: string[] = [
    `# ${doc.title || 'Untitled Document'}`,
    `*Generated with Corpus — ${new Date().toLocaleDateString()}*`,
    '',
  ];

  // Sort blocks by sortOrder ascending
  const sortedBlocks = [...blocks].sort((a, b) => a.sortOrder - b.sortOrder);

  for (const block of sortedBlocks) {
    const content = (block.content || '').trim();

    switch (block.type) {
      case 'heading': {
        const level = block.metadata?.level || 1;
        const prefix = '#'.repeat(level);
        lines.push(`${prefix} ${content}`);
        lines.push('');
        break;
      }

      case 'text': {
        if (content) {
          lines.push(content);
          lines.push('');
        }
        break;
      }

      case 'quote': {
        if (content) {
          lines.push(`> "${content}"`);
          const attributions: string[] = [];
          if (block.metadata?.author) attributions.push(block.metadata.author);
          if (block.metadata?.year) attributions.push(`(${block.metadata.year})`);
          if (block.metadata?.sourceTitle) attributions.push(`*${block.metadata.sourceTitle}*`);
          if (block.metadata?.pageNumber) attributions.push(`p. ${block.metadata.pageNumber}`);

          if (attributions.length > 0) {
            lines.push(`> — ${attributions.join(' ')}`);
          }
          lines.push('');
        }
        break;
      }

      case 'citation': {
        if (content) {
          const authorStr = block.metadata?.author || 'Unknown Author';
          const yearStr = block.metadata?.year ? ` (${block.metadata.year})` : '';
          const titleStr = block.metadata?.sourceTitle ? ` *${block.metadata.sourceTitle}*` : '';
          const pageStr = block.metadata?.pageNumber ? `, p. ${block.metadata.pageNumber}` : '';
          const urlStr = block.metadata?.url ? ` [Link](${block.metadata.url})` : '';

          lines.push(`> "${content}"`);
          lines.push(`> — **${authorStr}${yearStr}**${titleStr}${pageStr}.${urlStr}`);
          lines.push('');
        }
        break;
      }

      default:
        if (content) {
          lines.push(content);
          lines.push('');
        }
    }
  }

  // Footer metadata
  lines.push('---');
  lines.push('*Stored only on this device. Nothing was uploaded to create this file.*');

  const safeTitle = (doc.title || 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const filename = `${safeTitle || 'corpus-doc'}-${new Date().toISOString().slice(0, 10)}.md`;

  return {
    markdown: lines.join('\n'),
    filename,
  };
}

/**
 * Triggers browser download of the generated markdown file
 */
export function triggerMarkdownDownload(doc: DocumentRecord, blocks: BlockRecord[]): string {
  const { markdown, filename } = exportDocumentToMarkdown(doc, blocks);
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return filename;
}
