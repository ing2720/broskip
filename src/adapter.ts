import type { SkipKind } from './settings';

export interface SkipAdapter {
  selector: string;
  watchKey(): string | null;
  classifyControl(element: HTMLElement): SkipKind | null;
  isActionable(element: HTMLElement): boolean;
  routeEvents?: readonly string[];
}
