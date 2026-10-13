import { mountPopup } from './popup-ui';
import { normalizeSettings } from './settings';

void mountPopup(document, {
  async read() {
    const result = await chrome.storage.local.get('settings');
    return normalizeSettings(result.settings);
  },
  async write(settings) { await chrome.storage.local.set({ settings }); },
  subscribe(listener) {
    const handle = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes.settings) listener(normalizeSettings(changes.settings.newValue));
    };
    chrome.storage.onChanged.addListener(handle);
    return () => chrome.storage.onChanged.removeListener(handle);
  },
});
