import type { WebAnchor, HighlightTag } from '../../db/schema';

export interface WebHighlightPayload {
  url: string;
  title: string;
  selectedText: string;
  anchor: WebAnchor;
  tag: HighlightTag;
  note?: string;
  author?: string;
  year?: string;
}

export type WebHighlighterMessage =
  | { type: 'WEB_SAVE_HIGHLIGHT'; payload: WebHighlightPayload }
  | { type: 'WEB_GET_HIGHLIGHTS'; payload: { url: string } }
  | { type: 'WEB_DELETE_HIGHLIGHT'; payload: { id: string } }
  | { type: 'WEB_UPDATE_HIGHLIGHT'; payload: { id: string; tag?: HighlightTag; note?: string } };

export interface WebHighlighterResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Normalizes URL to canonical form for consistent fingerprinting across visits
 */
export function getCanonicalUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    // Remove search tracking params and hash fragments
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'source'];
    trackingParams.forEach((param) => url.searchParams.delete(param));
    url.hash = ''; // Anchors belong to the page, not the anchor identifier
    return url.toString().replace(/\/+$/, ''); // Strip trailing slash for consistency
  } catch {
    return rawUrl.split('#')[0].replace(/\/+$/, '');
  }
}
