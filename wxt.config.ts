import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Corpus',
    description: 'Local-first PDF & Web Highlighter with Modular Block Editor',
    version: '0.1.0',
    permissions: [
      'storage',
      'unlimitedStorage',
      'tabs',
    ],
    host_permissions: [
      '*://*/*',
    ],
    action: {
      default_title: 'Corpus',
    },
    // Allows viewer.html and library.html to be opened as chrome-extension:// tabs
    web_accessible_resources: [
      {
        resources: ['viewer.html', 'library.html'],
        matches: ['<all_urls>'],
      },
    ],
  },
});
