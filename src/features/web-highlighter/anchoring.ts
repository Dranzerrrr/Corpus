import type { WebAnchor, HighlightTag } from '../../db/schema';

export const TAG_COLORS: Record<HighlightTag, { bg: string; border: string; text: string; hex: string }> = {
  amber: {
    bg: 'rgba(245, 198, 76, 0.35)',
    border: 'rgba(245, 198, 76, 0.7)',
    text: '#92600E',
    hex: '#F5C64C',
  },
  violet: {
    bg: 'rgba(139, 124, 246, 0.3)',
    border: 'rgba(139, 124, 246, 0.65)',
    text: '#5B21B6',
    hex: '#8B7CF6',
  },
  teal: {
    bg: 'rgba(79, 176, 165, 0.3)',
    border: 'rgba(79, 176, 165, 0.65)',
    text: '#0F766E',
    hex: '#4FB0A5',
  },
  coral: {
    bg: 'rgba(232, 120, 90, 0.3)',
    border: 'rgba(232, 120, 90, 0.65)',
    text: '#C2410C',
    hex: '#E8785A',
  },
};

/**
 * Computes a CSS selector path for an element as a fallback locator
 */
function getCssSelector(el: Element): string {
  if (el.id) {
    return `#${CSS.escape(el.id)}`;
  }
  const path: string[] = [];
  let current: Element | null = el;
  while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
    let selector = current.nodeName.toLowerCase();
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((c) => c.nodeName === current?.nodeName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }
    path.unshift(selector);
    current = current.parentElement;
    if (path.length > 4) break; // Keep selector bounded
  }
  return path.join(' > ');
}

/**
 * Extracts surrounding text context (prefix and suffix) around a DOM Range
 */
function extractContextText(range: Range, contextLength = 48): { prefix: string; suffix: string } {
  // Preceding text context
  let prefix = '';
  try {
    const preRange = document.createRange();
    preRange.setStart(document.body, 0);
    preRange.setEnd(range.startContainer, range.startOffset);
    const fullPreText = preRange.toString();
    prefix = fullPreText.slice(-contextLength);
  } catch {
    prefix = range.startContainer.textContent?.slice(0, range.startOffset).slice(-contextLength) || '';
  }

  // Following text context
  let suffix = '';
  try {
    const postRange = document.createRange();
    postRange.setStart(range.endContainer, range.endOffset);
    postRange.setEnd(document.body, document.body.childNodes.length);
    const fullPostText = postRange.toString();
    suffix = fullPostText.slice(0, contextLength);
  } catch {
    suffix = range.endContainer.textContent?.slice(range.endOffset).slice(0, contextLength) || '';
  }

  return {
    prefix: prefix.replace(/\s+/g, ' '),
    suffix: suffix.replace(/\s+/g, ' '),
  };
}

/**
 * Captures a robust WebAnchor descriptor from an active DOM Range
 */
export function captureWebAnchor(range: Range): WebAnchor {
  const exact = range.toString().trim();
  const { prefix, suffix } = extractContextText(range);

  let selectorPath: string | undefined;
  const commonAncestor = range.commonAncestorContainer;
  const elementAncestor = commonAncestor.nodeType === Node.ELEMENT_NODE
    ? (commonAncestor as Element)
    : commonAncestor.parentElement;

  if (elementAncestor && elementAncestor !== document.body) {
    selectorPath = getCssSelector(elementAncestor);
  }

  return {
    exact,
    prefix,
    suffix,
    startOffset: range.startOffset,
    endOffset: range.endOffset,
    selectorPath,
  };
}

/**
 * Searches for all text nodes within a container and builds full text map
 */
function getTextNodes(root: Node): Text[] {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toLowerCase();
        if (
          tag === 'script' ||
          tag === 'style' ||
          tag === 'noscript' ||
          tag === 'textarea' ||
          tag === 'input' ||
          parent.hasAttribute('data-corpus-ui') ||
          parent.hasAttribute('data-corpus-highlight')
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  let current = walker.nextNode();
  while (current) {
    textNodes.push(current as Text);
    current = walker.nextNode();
  }
  return textNodes;
}

/**
 * Resolves a WebAnchor back into an active DOM Range.
 * Disambiguates duplicate exact phrases using surrounding prefix and suffix context.
 */
export function resolveWebAnchor(root: Node = document.body, anchor: WebAnchor): Range | null {
  const searchRoot = anchor.selectorPath ? document.querySelector(anchor.selectorPath) || root : root;
  const textNodes = getTextNodes(searchRoot);
  if (textNodes.length === 0) return null;

  // Build combined text content and character index map
  let combinedText = '';
  const nodeOffsets: Array<{ node: Text; start: number; end: number }> = [];

  for (const node of textNodes) {
    const text = node.textContent || '';
    const start = combinedText.length;
    combinedText += text;
    nodeOffsets.push({ node, start, end: combinedText.length });
  }

  // Search for matches of exact text
  const cleanExact = anchor.exact.replace(/\s+/g, ' ');
  // Normalize whitespace for search
  const normalizedCombined = combinedText.replace(/\s+/g, ' ');

  const exactIndexes: number[] = [];
  let pos = normalizedCombined.indexOf(cleanExact);
  while (pos !== -1) {
    exactIndexes.push(pos);
    pos = normalizedCombined.indexOf(cleanExact, pos + 1);
  }

  if (exactIndexes.length === 0) {
    // Fallback: search across entire body if selector root failed
    if (searchRoot !== root) {
      return resolveWebAnchor(root, { ...anchor, selectorPath: undefined });
    }
    return null;
  }

  // Disambiguate by matching prefix / suffix
  let bestIndex = exactIndexes[0];
  let bestScore = -1;

  for (const idx of exactIndexes) {
    let score = 0;
    const testPrefix = normalizedCombined.slice(Math.max(0, idx - anchor.prefix.length), idx);
    const testSuffix = normalizedCombined.slice(
      idx + cleanExact.length,
      idx + cleanExact.length + anchor.suffix.length
    );

    if (anchor.prefix && testPrefix.includes(anchor.prefix.slice(-16))) score += 2;
    if (anchor.suffix && testSuffix.includes(anchor.suffix.slice(0, 16))) score += 2;
    if (anchor.prefix && testPrefix === anchor.prefix) score += 5;
    if (anchor.suffix && testSuffix === anchor.suffix) score += 5;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = idx;
    }
  }

  // Map normalized index back to raw text nodes
  // For simplicity and accuracy with TreeWalker:
  return createRangeFromCharacterOffsets(nodeOffsets, bestIndex, cleanExact.length);
}

function createRangeFromCharacterOffsets(
  nodeOffsets: Array<{ node: Text; start: number; end: number }>,
  targetStart: number,
  targetLength: number
): Range | null {
  const targetEnd = targetStart + targetLength;
  let startNode: Text | null = null;
  let startOffset = 0;
  let endNode: Text | null = null;
  let endOffset = 0;

  for (const entry of nodeOffsets) {
    if (!startNode && targetStart >= entry.start && targetStart <= entry.end) {
      startNode = entry.node;
      startOffset = Math.min(targetStart - entry.start, entry.node.textContent?.length || 0);
    }
    if (targetEnd >= entry.start && targetEnd <= entry.end) {
      endNode = entry.node;
      endOffset = Math.min(targetEnd - entry.start, entry.node.textContent?.length || 0);
      break;
    }
  }

  if (!startNode || !endNode) return null;

  try {
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    return range;
  } catch {
    return null;
  }
}

/**
 * Wraps all text nodes inside a Range with styled <mark> elements
 */
export function wrapRangeWithHighlight(
  range: Range,
  highlightId: string,
  tag: HighlightTag,
  note?: string
): HTMLElement[] {
  const marks: HTMLElement[] = [];
  const palette = TAG_COLORS[tag];

  // Helper to style a mark element
  const createMarkElement = (text: string): HTMLElement => {
    const mark = document.createElement('mark');
    mark.setAttribute('data-corpus-highlight', 'true');
    mark.setAttribute('data-corpus-highlight-id', highlightId);
    mark.setAttribute('data-corpus-tag', tag);
    if (note) mark.setAttribute('data-corpus-note', note);

    mark.style.backgroundColor = palette.bg;
    mark.style.borderBottom = `2px solid ${palette.border}`;
    mark.style.color = 'inherit';
    mark.style.padding = '1px 0';
    mark.style.borderRadius = '2px';
    mark.style.cursor = 'pointer';
    mark.style.transition = 'background-color 0.15s ease';

    mark.textContent = text;
    return mark;
  };

  if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
    const textNode = range.startContainer as Text;
    const text = textNode.textContent || '';
    const start = range.startOffset;
    const end = range.endOffset;

    const before = text.substring(0, start);
    const highlighted = text.substring(start, end);
    const after = text.substring(end);

    const mark = createMarkElement(highlighted);
    const parent = textNode.parentNode;
    if (!parent) return [];

    if (before) parent.insertBefore(document.createTextNode(before), textNode);
    parent.insertBefore(mark, textNode);
    if (after) parent.insertBefore(document.createTextNode(after), textNode);
    parent.removeChild(textNode);

    marks.push(mark);
    return marks;
  }

  // Cross-node range: extract contents and recursively wrap text nodes
  try {
    const fragment = range.extractContents();
    const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT);
    const textNodesToWrap: Text[] = [];
    let curr = walker.nextNode();
    while (curr) {
      if (curr.textContent && curr.textContent.trim().length > 0) {
        textNodesToWrap.push(curr as Text);
      }
      curr = walker.nextNode();
    }

    for (const node of textNodesToWrap) {
      const mark = createMarkElement(node.textContent || '');
      node.parentNode?.replaceChild(mark, node);
      marks.push(mark);
    }

    range.insertNode(fragment);
  } catch (err) {
    console.warn('Corpus: cross-node highlight wrapping failed, fallback to simple wrap', err);
  }

  return marks;
}

/**
 * Removes all highlight marks for a given highlight ID and normalizes text
 */
export function removeHighlightMarks(highlightId: string): void {
  const marks = document.querySelectorAll(`[data-corpus-highlight-id="${CSS.escape(highlightId)}"]`);
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (parent) {
      while (mark.firstChild) {
        parent.insertBefore(mark.firstChild, mark);
      }
      parent.removeChild(mark);
      parent.normalize();
    }
  });
}
