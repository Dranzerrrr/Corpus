import { defineBackground } from 'wxt/sandbox';
import { ensurePersistentStorage } from '../src/db/persistence';
import { db, type HighlightRecord } from '../src/db';
import { getCanonicalUrl, type WebHighlighterMessage } from '../src/features/web-highlighter/types';

export default defineBackground(() => {
  console.log('Corpus: Background Service Worker initialized.');

  // Request persistent storage on install per PRD Section 6
  chrome.runtime.onInstalled.addListener(async (details) => {
    console.log(`Corpus installed/updated. Reason: ${details.reason}`);
    try {
      const status = await ensurePersistentStorage();
      console.log('Corpus: Storage persistence status on install:', status);
    } catch (err) {
      console.error('Corpus: Failed to request persistent storage on install:', err);
    }
  });

  // Unified runtime message listener
  chrome.runtime.onMessage.addListener((message: { type: string; payload?: unknown }, _sender, sendResponse) => {
    if (message.type === 'GET_STORAGE_STATUS') {
      ensurePersistentStorage()
        .then((status) => sendResponse({ success: true, status }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true; // Keep channel open
    }

    // Web Highlighter Message Handlers
    const webMsg = message as WebHighlighterMessage;
    if (webMsg.type === 'WEB_SAVE_HIGHLIGHT') {
      (async () => {
        try {
          const { url, title, selectedText, anchor, tag, note, author, year } = webMsg.payload;
          const canonical = getCanonicalUrl(url);

          // Find or create Source record
          let source = await db.sources.where('fingerprint').equals(canonical).first();
          if (!source) {
            source = {
              id: 'src-' + crypto.randomUUID(),
              type: 'web',
              fingerprint: canonical,
              title: title || canonical,
              url,
              author,
              year,
              createdAt: Date.now(),
              lastAccessedAt: Date.now(),
            };
            await db.sources.add(source);
          } else {
            // Update last accessed timestamp
            await db.sources.update(source.id, { lastAccessedAt: Date.now() });
          }

          const highlight: HighlightRecord = {
            id: 'hl-' + crypto.randomUUID(),
            sourceId: source.id,
            sourceFingerprint: canonical,
            sourceTitle: source.title,
            selectedText,
            anchor,
            tag,
            note,
            author,
            year,
            url,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          await db.highlights.add(highlight);
          sendResponse({ success: true, data: highlight });
        } catch (err: unknown) {
          sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) });
        }
      })();
      return true;
    }

    if (webMsg.type === 'WEB_GET_HIGHLIGHTS') {
      (async () => {
        try {
          const canonical = getCanonicalUrl(webMsg.payload.url);
          const highlights = await db.highlights.where('sourceFingerprint').equals(canonical).toArray();
          sendResponse({ success: true, data: highlights });
        } catch (err: unknown) {
          sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) });
        }
      })();
      return true;
    }

    if (webMsg.type === 'WEB_DELETE_HIGHLIGHT') {
      (async () => {
        try {
          await db.highlights.delete(webMsg.payload.id);
          sendResponse({ success: true });
        } catch (err: unknown) {
          sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) });
        }
      })();
      return true;
    }

    if (webMsg.type === 'WEB_UPDATE_HIGHLIGHT') {
      (async () => {
        try {
          const { id, tag, note } = webMsg.payload;
          const updates: Partial<HighlightRecord> = { updatedAt: Date.now() };
          if (tag !== undefined) updates.tag = tag;
          if (note !== undefined) updates.note = note;

          await db.highlights.update(id, updates);
          const updated = await db.highlights.get(id);
          sendResponse({ success: true, data: updated });
        } catch (err: unknown) {
          sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) });
        }
      })();
      return true;
    }
  });
});

