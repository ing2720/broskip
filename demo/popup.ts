import { mountPopup } from '../src/popup-ui';
import { normalizeSettings } from '../src/settings';

void mountPopup(document, {
  savedMessage: '미리보기 설정을 이 브라우저에 저장했어요.',
  async read() { return normalizeSettings(JSON.parse(localStorage.getItem('demo-settings') ?? 'null')); },
  async write(settings) { localStorage.setItem('demo-settings', JSON.stringify(settings)); },
  subscribe() { return () => {}; },
});
