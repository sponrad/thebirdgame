import { sanitizeName, type ScoreEntry } from './storage';

export type { ScoreEntry };

async function parseScores(res: Response): Promise<ScoreEntry[]> {
  const data = (await res.json()) as { scores?: unknown };
  if (!res.ok || !Array.isArray(data.scores)) {
    throw new Error('Leaderboard unavailable');
  }
  return data.scores
    .map(normalizeEntry)
    .filter((e): e is ScoreEntry => e !== null);
}

function normalizeEntry(value: unknown): ScoreEntry | null {
  if (!value || typeof value !== 'object') return null;
  const rec = value as Record<string, unknown>;
  const score = typeof rec.score === 'number' ? rec.score : Number(rec.score);
  if (!Number.isFinite(score) || score < 0) return null;
  const name = typeof rec.name === 'string' ? rec.name : 'Pilot';
  const at = typeof rec.at === 'number' && Number.isFinite(rec.at) ? rec.at : 0;
  return { score: Math.floor(score), name: sanitizeName(name), at };
}

export async function fetchScores(): Promise<ScoreEntry[]> {
  const res = await fetch('/api/scores', { cache: 'no-store' });
  return parseScores(res);
}

export async function submitScore(score: number, name: string): Promise<ScoreEntry[]> {
  const res = await fetch('/api/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ score, name }),
  });
  return parseScores(res);
}

export function qualifiesForLeaderboard(score: number, scores: ScoreEntry[], max = 10): boolean {
  if (score <= 0) return false;
  if (scores.length < max) return true;
  return score > scores[scores.length - 1]!.score;
}
