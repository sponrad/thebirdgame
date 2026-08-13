export const ACHIEVEMENT_IDS = ['waxOn', 'waxOff', 'noEntry'] as const;
export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

export const ACHIEVEMENT_META: Record<
  AchievementId,
  { label: string; color: number; glyph: string }
> = {
  waxOn: { label: 'Wax On', color: 0x39ff14, glyph: 'W' },
  waxOff: { label: 'Wax Off', color: 0xffcc00, glyph: 'X' },
  noEntry: { label: 'No Entry!', color: 0xff3b30, glyph: '!' },
};

const ID_SET = new Set<string>(ACHIEVEMENT_IDS);

export function sanitizeAchievements(raw: unknown): AchievementId[] {
  const src = Array.isArray(raw) ? raw : [];
  const out: AchievementId[] = [];
  for (const id of ACHIEVEMENT_IDS) {
    if (src.includes(id) && ID_SET.has(id)) out.push(id);
  }
  return out;
}

/** Stable HMAC fragment: comma-separated known ids in canonical order. */
export function encodeAchievements(ids: readonly string[]): string {
  return sanitizeAchievements(ids).join(',');
}
