import { sanitizeName, type ScoreEntry } from './storage';

export type { ScoreEntry };

type RunSession = {
  token: string;
  salt: string;
  issuedAt: number;
  expiresAt: number;
};

let activeRun: RunSession | null = null;

async function parseScores(res: Response): Promise<ScoreEntry[]> {
  const data = (await res.json()) as { scores?: unknown };
  if (!res.ok || !Array.isArray(data.scores)) {
    throw new Error('Leaderboard unavailable');
  }
  return data.scores.map(normalizeEntry).filter((e): e is ScoreEntry => e !== null);
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

async function hmacHex(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Begin a scored run — call when gameplay starts. Issues a signed session token. */
export async function startScoreRun(): Promise<void> {
  activeRun = null;
  try {
    const res = await fetch('/api/run/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      cache: 'no-store',
    });
    if (!res.ok) return;
    const data = (await res.json()) as {
      token?: unknown;
      salt?: unknown;
      issuedAt?: unknown;
      expiresAt?: unknown;
    };
    if (typeof data.token !== 'string' || typeof data.salt !== 'string') return;
    activeRun = {
      token: data.token,
      salt: data.salt,
      issuedAt: Number(data.issuedAt) || 0,
      expiresAt: Number(data.expiresAt) || 0,
    };
  } catch {
    activeRun = null;
  }
}

export function clearScoreRun(): void {
  activeRun = null;
}

export function hasScoreRun(): boolean {
  return activeRun != null;
}

export async function fetchScores(): Promise<ScoreEntry[]> {
  const res = await fetch('/api/scores', { cache: 'no-store' });
  return parseScores(res);
}

export async function submitScore(
  score: number,
  name: string,
  multiplier: number
): Promise<ScoreEntry[]> {
  const run = activeRun;
  if (!run) {
    throw new Error('No active run token');
  }
  const safeName = sanitizeName(name);
  const safeScore = Math.floor(score);
  const safeMult = Math.max(1, Math.floor(multiplier));
  const proof = await hmacHex(run.salt, `submit|${safeScore}|${safeName}|${safeMult}`);

  const res = await fetch('/api/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      score: safeScore,
      name: safeName,
      multiplier: safeMult,
      token: run.token,
      proof,
    }),
  });

  const data = (await res.json()) as { scores?: unknown; added?: unknown; error?: unknown };
  if (!res.ok) {
    const err = typeof data.error === 'string' ? data.error : 'submit_failed';
    throw new Error(err);
  }
  // One submit per run token.
  activeRun = null;
  if (!Array.isArray(data.scores)) {
    throw new Error('Leaderboard unavailable');
  }
  return data.scores.map(normalizeEntry).filter((e): e is ScoreEntry => e !== null);
}

export function qualifiesForLeaderboard(score: number, scores: ScoreEntry[], max = 10): boolean {
  if (score <= 0) return false;
  if (scores.length < max) return true;
  return score > scores[scores.length - 1]!.score;
}
