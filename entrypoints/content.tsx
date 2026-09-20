import { defineContentScript } from 'wxt/sandbox';
import { createShadowRootUi } from 'wxt/client';
import ReactDOM from 'react-dom/client';
import { WebHighlighterOverlay } from '../src/features/web-highlighter/components/WebHighlighterOverlay';

export default defineContentScript({
  matches: ['*://*/*'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    console.log('Corpus: Web Highlighter content script initialized on', window.location.href);

    // Prevent mounting inside extension contexts or iframes without body
    if (window.location.protocol.startsWith('chrome-extension')) {
      return;
    }

    if (!document.body) {
      await new Promise<void>((resolve) => {
        window.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
      });
    }

    const ui = await createShadowRootUi(ctx, {
      name: 'corpus-highlighter-root',
      position: 'overlay',
      alignment: 'top-left',
      zIndex: 2147483647,
      anchor: 'body',
      append: 'last',
      onMount: (container) => {
        const root = ReactDOM.createRoot(container);
        root.render(<WebHighlighterOverlay />);
        return root;
      },
      onRemove: (root) => {
        root?.unmount();
      },
    });

    ui.mount();
  },
});
