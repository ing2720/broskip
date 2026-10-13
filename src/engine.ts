import { CONTROL_SELECTOR, classifyControl, isActionable, watchKey } from './netflix';
import { DEFAULT_SETTINGS, type Settings, type SkipKind } from './settings';

export interface EngineOptions {
  settings?: Settings;
  getWatchKey?: () => string | null;
  actionable?: (element: HTMLElement) => boolean;
  now?: () => number;
  onClick?: (kind: SkipKind) => void;
}

/** Event-driven detection. No interval, network request, or debounce before a click. */
export function createSkipEngine(options: EngineOptions = {}) {
  let settings = { ...(options.settings ?? DEFAULT_SETTINGS) };
  const getWatchKey = options.getWatchKey ?? watchKey;
  const actionable = options.actionable ?? isActionable;
  const now = options.now ?? (() => performance.now());
  const candidates = new Set<HTMLElement>();
  let clicked = new WeakSet<HTMLElement>();
  const lastClick = new Map<SkipKind, number>();
  let currentWatch: string | null = null;
  let running = false;
  let observing = false;
  const duplicateWindowMs = 1500;

  function discover(root: ParentNode): boolean {
    let found = false;
    if (root instanceof HTMLElement && root.matches(CONTROL_SELECTOR)) {
      candidates.add(root);
      found = true;
    }
    for (const element of root.querySelectorAll<HTMLElement>(CONTROL_SELECTOR)) {
      candidates.add(element);
      found = true;
    }
    return found;
  }

  function reconcileRoute(): boolean {
    const next = getWatchKey();
    if (next !== currentWatch) {
      currentWatch = next;
      clicked = new WeakSet();
      lastClick.clear();
      candidates.clear();
      if (next) discover(document);
    }
    return next !== null;
  }

  function processCandidates() {
    for (const element of candidates) {
      if (!element.isConnected || !element.matches(CONTROL_SELECTOR)) {
        candidates.delete(element);
        continue;
      }
      if (!actionable(element)) {
        clicked.delete(element);
        continue;
      }
      const kind = classifyControl(element);
      if (!kind || !settings[kind] || clicked.has(element)) continue;
      const time = now();
      // Guards rerenders after a click; never delays a cue's first click.
      if (time - (lastClick.get(kind) ?? -Infinity) < duplicateWindowMs) continue;
      clicked.add(element);
      lastClick.set(kind, time);
      element.click();
      options.onClick?.(kind);
      // A click may initiate a route change; do not process other cues this batch.
      break;
    }
  }

  const observer = new MutationObserver((records) => {
    const previousWatch = currentWatch;
    if (!settings.enabled || !reconcileRoute()) return;
    let relevant = previousWatch !== currentWatch;
    for (const record of records) {
      if (record.type === 'childList') {
        for (const node of record.addedNodes) {
          if (node instanceof HTMLElement) relevant = discover(node) || relevant;
        }
        for (const candidate of candidates) {
          if (!candidate.isConnected) candidates.delete(candidate);
          else if (record.target instanceof Element && candidate.contains(record.target)) relevant = true;
        }
      } else if (record.target instanceof HTMLElement) {
        const target = record.target;
        if (target.matches(CONTROL_SELECTOR)) {
          candidates.add(target);
          relevant = true;
        }
        for (const candidate of candidates) {
          if (target.contains(candidate) || candidate.contains(target)) relevant = true;
        }
      }
    }
    if (relevant) processCandidates();
  });

  function rescan() {
    if (!running || !settings.enabled || !reconcileRoute()) return;
    discover(document);
    processCandidates();
  }

  function onTransition(event: Event) {
    if (!(event.target instanceof HTMLElement) || !settings.enabled || !reconcileRoute()) return;
    if (Array.from(candidates).some((candidate) => event.target instanceof HTMLElement &&
      (event.target.contains(candidate) || candidate.contains(event.target)))) processCandidates();
  }

  function connect() {
    if (observing || !running || !settings.enabled) return;
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-uia', 'disabled', 'aria-disabled', 'aria-hidden', 'hidden', 'inert', 'class', 'style'],
    });
    observing = true;
  }

  return {
    start() {
      if (running) return;
      running = true;
      connect();
      window.addEventListener('popstate', rescan);
      window.addEventListener('pageshow', rescan);
      document.addEventListener('visibilitychange', rescan);
      document.addEventListener('transitionend', onTransition, true);
      document.addEventListener('animationend', onTransition, true);
      document.addEventListener('fullscreenchange', rescan);
      rescan();
    },
    updateSettings(next: Settings) {
      settings = { ...next };
      if (!settings.enabled) {
        observer.disconnect();
        observing = false;
        candidates.clear();
        // Hidden/reappeared cues cannot be observed while OFF. Re-arm on explicit ON.
        clicked = new WeakSet();
        lastClick.clear();
      } else {
        connect();
        rescan();
      }
    },
    stop() {
      running = false;
      observing = false;
      observer.disconnect();
      candidates.clear();
      window.removeEventListener('popstate', rescan);
      window.removeEventListener('pageshow', rescan);
      document.removeEventListener('visibilitychange', rescan);
      document.removeEventListener('transitionend', onTransition, true);
      document.removeEventListener('animationend', onTransition, true);
      document.removeEventListener('fullscreenchange', rescan);
    },
  };
}
