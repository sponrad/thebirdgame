import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const MAX_SCORES = 10;
export const MAX_NAME_LEN = 12;
export const DEFAULT_NAME = 'Pilot';

/** Minimum wall-clock seconds a run must last before any submit. */
const MIN_RUN_SEC = 5;
/** Run tokens expire after this many seconds. */
const RUN_TTL_SEC = 45 * 60;
const USED_TOKEN_CAP = 5_000;

/**
 * Plausibility (generous on purpose — block absurd fakes, not sweaty runs).
 * Multiplier grows via bird stars (~1.5s spawn cadence, sometimes multi-spawns).
 * Score events are all × current multiplier (25 / 250 bird, 10k+30k wax).
 */
const MAX_MULT_PER_SEC = 3;
/** Effective x1 points/sec if farming balloons/birds nonstop. */
const MAX_UNIT_POINTS_PER_SEC = 2_500;
/** Wax on+off budget scales with time (assumes a full cycle ~every 12s). */
const WAX_CYCLE_SCORE = 40_000;
const WAX_CYCLE_SEC = 12;
/** Time needed to claim wax achievements (generous). */
const MIN_WAX_ON_SEC = 8;
const MIN_WAX_OFF_SEC = 16;

const ACHIEVEMENT_IDS = ['waxOn', 'waxOff', 'noEntry'];
const ACHIEVEMENT_SET = new Set(ACHIEVEMENT_IDS);

const RATE_START = { windowMs: 60_000, max: 30 };
const RATE_SUBMIT = { windowMs: 60_000, max: 12 };

const SECRET = process.env.SCORE_HMAC_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.SCORE_HMAC_SECRET) {
  console.warn(
    '[scores] SCORE_HMAC_SECRET not set — using ephemeral secret (tokens invalidate on restart)'
  );
}

/** @type {Map<string, { count: number, resetAt: number }>} */
const rateBuckets = new Map();
/** @type {Map<string, number>} runId → used-at timestamp */
const usedRuns = new Map();
/** @type {Map<string, { salt: string, iat: number, exp: number }>} */
const runSecrets = new Map();

function scoresFile() {
  return process.env.SCORES_FILE || process.env.SCORES_DB || path.join(process.cwd(), 'data', 'scores.json');
}

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.trim()) return xf.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function rateLimit(key, { windowMs, max }) {
  const now = Date.now();
  let bucket = rateBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    rateBuckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > max) {
    return { ok: false, retryAfterMs: Math.max(0, bucket.resetAt - now) };
  }
  return { ok: true };
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function b64urlJson(obj) {
  return b64url(JSON.stringify(obj));
}

function fromB64urlJson(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const json = Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64').toString(
    'utf8'
  );
  return JSON.parse(json);
}

function hmacSign(message) {
  return b64url(crypto.createHmac('sha256', SECRET).update(message).digest());
}

function timingSafeEqualStr(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function pruneMaps(nowSec) {
  for (const [rid, meta] of runSecrets) {
    if (meta.exp < nowSec) runSecrets.delete(rid);
  }
  if (usedRuns.size > USED_TOKEN_CAP) {
    const cutoff = Date.now() - RUN_TTL_SEC * 1000;
    for (const [rid, at] of usedRuns) {
      if (at < cutoff) usedRuns.delete(rid);
    }
  }
  if (rateBuckets.size > 2_000) {
    const now = Date.now();
    for (const [k, b] of rateBuckets) {
      if (now >= b.resetAt) rateBuckets.delete(k);
    }
  }
}

function issueRunToken() {
  const payload = {
    rid: crypto.randomBytes(16).toString('hex'),
    iat: Math.floor(Date.now() / 1000),
    nonce: crypto.randomBytes(8).toString('hex'),
  };
  const body = b64urlJson(payload);
  const sig = hmacSign(`run|${body}`);
  return { token: `${body}.${sig}`, runId: payload.rid, issuedAt: payload.iat };
}

function createRunSession() {
  const { token, runId, issuedAt } = issueRunToken();
  const salt = crypto.randomBytes(16).toString('hex');
  const exp = issuedAt + RUN_TTL_SEC;
  runSecrets.set(runId, { salt, iat: issuedAt, exp });
  pruneMaps(Math.floor(Date.now() / 1000));
  return { token, runId, salt, issuedAt, expiresAt: exp };
}

function verifyRunToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expect = hmacSign(`run|${body}`);
  if (!timingSafeEqualStr(expect, sig)) return null;
  try {
    const payload = fromB64urlJson(body);
    if (!payload?.rid || !payload?.iat || !payload?.nonce) return null;
    return payload;
  } catch {
    return null;
  }
}

function sanitizeAchievements(raw) {
  const src = Array.isArray(raw) ? raw : [];
  return ACHIEVEMENT_IDS.filter((id) => src.includes(id) && ACHIEVEMENT_SET.has(id));
}

function encodeAchievements(ids) {
  return sanitizeAchievements(ids).join(',');
}

/** Per-run HMAC proof: HMAC(salt, "submit|score|name|multiplier|achievements"). */
function clientProof(salt, score, name, multiplier, achievements) {
  return crypto
    .createHmac('sha256', salt)
    .update(`submit|${score}|${name}|${multiplier}|${encodeAchievements(achievements)}`)
    .digest('hex');
}

function maxPlausibleMultiplier(elapsedSec) {
  return 1 + Math.floor(Math.max(0, elapsedSec) * MAX_MULT_PER_SEC);
}

function maxPlausibleScore(elapsedSec, multiplier) {
  const m = Math.max(1, multiplier);
  const t = Math.max(1, elapsedSec);
  const waxBudget = WAX_CYCLE_SCORE * (1 + t / WAX_CYCLE_SEC);
  return Math.floor(m * (MAX_UNIT_POINTS_PER_SEC * t + waxBudget));
}

function readAll() {
  try {
    const parsed = JSON.parse(fs.readFileSync(scoresFile(), 'utf8'));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => {
        if (!row || typeof row !== 'object') return null;
        const score = Math.floor(Number(row.score));
        if (!Number.isFinite(score) || score < 0) return null;
        const multiplier = Math.floor(Number(row.multiplier));
        return {
          name: sanitizeName(row.name),
          score,
          at: Number.isFinite(Number(row.at)) ? Number(row.at) : 0,
          multiplier: Number.isFinite(multiplier) && multiplier >= 1 ? multiplier : 1,
          achievements: sanitizeAchievements(row.achievements),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || a.at - b.at)
      .slice(0, MAX_SCORES);
  } catch {
    return [];
  }
}

function writeAll(scores) {
  const file = scoresFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(scores));
}

export function sanitizeName(raw) {
  const cleaned = String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LEN);
  return cleaned || DEFAULT_NAME;
}

export function listScores() {
  return readAll();
}

/**
 * @param {{ name: unknown, score: unknown, multiplier: unknown, achievements: unknown, token: unknown, proof: unknown }} body
 */
export function addScoreSecure(body) {
  const name = sanitizeName(body.name);
  const score = Math.floor(Number(body.score));
  const multiplier = Math.floor(Number(body.multiplier));
  const achievements = sanitizeAchievements(body.achievements);
  const token = typeof body.token === 'string' ? body.token : '';
  const proof = typeof body.proof === 'string' ? body.proof : '';

  if (!Number.isFinite(score) || score <= 0 || score > Number.MAX_SAFE_INTEGER) {
    return { scores: listScores(), added: false, error: 'invalid_score' };
  }
  if (!Number.isFinite(multiplier) || multiplier < 1 || multiplier > 1_000_000) {
    return { scores: listScores(), added: false, error: 'invalid_multiplier' };
  }

  const payload = verifyRunToken(token);
  if (!payload) {
    return { scores: listScores(), added: false, error: 'invalid_token' };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  pruneMaps(nowSec);

  if (nowSec - payload.iat < MIN_RUN_SEC) {
    return { scores: listScores(), added: false, error: 'too_fast' };
  }
  if (nowSec - payload.iat > RUN_TTL_SEC) {
    return { scores: listScores(), added: false, error: 'expired' };
  }

  const meta = runSecrets.get(payload.rid);
  if (!meta) {
    return { scores: listScores(), added: false, error: 'unknown_run' };
  }
  if (meta.exp < nowSec) {
    runSecrets.delete(payload.rid);
    return { scores: listScores(), added: false, error: 'expired' };
  }

  const expectProof = clientProof(meta.salt, score, name, multiplier, achievements);
  if (!timingSafeEqualStr(expectProof, proof)) {
    return { scores: listScores(), added: false, error: 'bad_proof' };
  }

  if (usedRuns.has(payload.rid)) {
    return { scores: listScores(), added: false, error: 'already_used' };
  }

  const elapsedSec = Math.max(1, nowSec - payload.iat);
  if (multiplier > maxPlausibleMultiplier(elapsedSec)) {
    return { scores: listScores(), added: false, error: 'implausible_multiplier' };
  }
  if (score > maxPlausibleScore(elapsedSec, multiplier)) {
    return { scores: listScores(), added: false, error: 'implausible_pace' };
  }
  if (achievements.includes('waxOff') && !achievements.includes('waxOn')) {
    return { scores: listScores(), added: false, error: 'implausible_achievements' };
  }
  if (achievements.includes('waxOn') && elapsedSec < MIN_WAX_ON_SEC) {
    return { scores: listScores(), added: false, error: 'implausible_achievements' };
  }
  if (achievements.includes('waxOff') && elapsedSec < MIN_WAX_OFF_SEC) {
    return { scores: listScores(), added: false, error: 'implausible_achievements' };
  }

  const current = listScores();
  const last = current[MAX_SCORES - 1];
  if (current.length >= MAX_SCORES && last && score <= last.score) {
    return { scores: current, added: false, error: 'not_high_enough' };
  }

  usedRuns.set(payload.rid, Date.now());
  runSecrets.delete(payload.rid);

  const next = [...current, { name, score, multiplier, achievements, at: Date.now() }]
    .sort((a, b) => b.score - a.score || a.at - b.at)
    .slice(0, MAX_SCORES);
  writeAll(next);
  return { scores: next, added: true };
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks.map((c) => (typeof c === 'string' ? Buffer.from(c) : c))).toString(
    'utf8'
  );
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

/**
 * Comma-separated allowlist via CORS_ORIGINS, plus built-in itch / localhost / site defaults.
 * Set CORS_ORIGINS=* to reflect any Origin (still echoes the request Origin, never literal * with credentials).
 */
function corsAllowAll() {
  return (process.env.CORS_ORIGINS || '').trim() === '*';
}

function corsExtraOrigins() {
  const raw = process.env.CORS_ORIGINS || '';
  if (!raw.trim() || raw.trim() === '*') return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const DEFAULT_CORS_ORIGINS = new Set([
  'https://bird.devlabtech.com',
  'https://html-classic.itch.zone',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
]);

function isOriginAllowed(origin) {
  if (!origin || typeof origin !== 'string') return false;
  if (corsAllowAll()) return true;
  if (DEFAULT_CORS_ORIGINS.has(origin)) return true;
  if (corsExtraOrigins().includes(origin)) return true;
  try {
    const { protocol, hostname } = new URL(origin);
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    if (hostname === 'itch.zone' || hostname.endsWith('.itch.zone')) return true;
    if (hostname === 'itch.io' || hostname.endsWith('.itch.io')) return true;
  } catch {
    return false;
  }
  return false;
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (typeof origin !== 'string' || !isOriginAllowed(origin)) return;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

const REJECT_400 = new Set([
  'invalid_token',
  'bad_proof',
  'unknown_run',
  'expired',
  'already_used',
  'too_fast',
  'implausible_pace',
  'implausible_multiplier',
  'implausible_achievements',
  'invalid_score',
  'invalid_multiplier',
]);

/** @returns {Promise<boolean>} true if this request was handled */
export async function handleScoresApi(req, res) {
  const url = (req.url || '').split('?')[0];
  const ip = clientIp(req);
  const isRunStart = url === '/api/run/start' || url === '/api/run/start/';
  const isScores = url === '/api/scores' || url === '/api/scores/';
  if (!isRunStart && !isScores) return false;

  applyCors(req, res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }

  try {
    if (isRunStart) {
      if (req.method !== 'POST') {
        json(res, 405, { error: 'Method not allowed' });
        return true;
      }
      const limited = rateLimit(`start:${ip}`, RATE_START);
      if (!limited.ok) {
        json(res, 429, { error: 'rate_limited', retryAfterMs: limited.retryAfterMs });
        return true;
      }
      try {
        await readJsonBody(req);
      } catch {
        /* ignore empty/invalid body */
      }
      const session = createRunSession();
      json(res, 200, {
        token: session.token,
        salt: session.salt,
        issuedAt: session.issuedAt,
        expiresAt: session.expiresAt,
      });
      return true;
    }

    if (req.method === 'GET') {
      json(res, 200, { scores: listScores() });
      return true;
    }
    if (req.method === 'POST') {
      const limited = rateLimit(`submit:${ip}`, RATE_SUBMIT);
      if (!limited.ok) {
        json(res, 429, { error: 'rate_limited', retryAfterMs: limited.retryAfterMs });
        return true;
      }
      const body = await readJsonBody(req);
      const result = addScoreSecure(body);
      if (!result.added && result.error) {
        const status = REJECT_400.has(result.error) ? 400 : 200;
        json(res, status, { scores: result.scores, added: false, error: result.error });
        return true;
      }
      json(res, 200, { scores: result.scores, added: result.added });
      return true;
    }
    json(res, 405, { error: 'Method not allowed' });
    return true;
  } catch (err) {
    console.error(err);
    json(res, 500, { error: 'Server error' });
    return true;
  }
}
