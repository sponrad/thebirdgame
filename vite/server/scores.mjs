import fs from 'node:fs';
import path from 'node:path';

export const MAX_SCORES = 10;
export const MAX_NAME_LEN = 12;
export const DEFAULT_NAME = 'Pilot';
const MAX_SCORE_VALUE = 99_999_999;

function scoresFile() {
  return process.env.SCORES_FILE || process.env.SCORES_DB || path.join(process.cwd(), 'data', 'scores.json');
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
        return {
          name: sanitizeName(row.name),
          score,
          at: Number.isFinite(Number(row.at)) ? Number(row.at) : 0,
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

export function addScore(rawName, rawScore) {
  const name = sanitizeName(rawName);
  const score = Math.floor(Number(rawScore));
  if (!Number.isFinite(score) || score <= 0 || score > MAX_SCORE_VALUE) {
    return { scores: listScores(), added: false };
  }

  const current = listScores();
  const last = current[MAX_SCORES - 1];
  if (current.length >= MAX_SCORES && last && score <= last.score) {
    return { scores: current, added: false };
  }

  const next = [...current, { name, score, at: Date.now() }]
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

/** @returns {Promise<boolean>} true if this request was handled */
export async function handleScoresApi(req, res) {
  const url = (req.url || '').split('?')[0];
  if (url !== '/api/scores' && url !== '/api/scores/') return false;

  try {
    if (req.method === 'GET') {
      json(res, 200, { scores: listScores() });
      return true;
    }
    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      json(res, 200, addScore(body.name, body.score));
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
