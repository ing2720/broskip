export type SkipKind = 'intro' | 'recap' | 'nextEpisode';
export type Settings = { enabled: boolean } & Record<SkipKind, boolean>;
export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  enabled: true,
  intro: true,
  recap: true,
  nextEpisode: true,
});

/** Invalid stored values cannot turn settings into truthy strings/objects. */
export function normalizeSettings(input: unknown): Settings {
  const settings = { ...DEFAULT_SETTINGS };
  if (!input || typeof input !== 'object') return settings;
  for (const key of Object.keys(settings) as (keyof Settings)[]) {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value === 'boolean') settings[key] = value;
  }
  return settings;
}
