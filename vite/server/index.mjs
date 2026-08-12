import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleScoresApi } from './scores.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(process.env.DIST_DIR || path.join(__dirname, '..', 'dist'));
const port = Number(process.env.PORT || 8080);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json; charset=utf-8',
};

function safeFile(urlPath) {
  const rel = urlPath === '/' ? '/index.html' : urlPath;
  const normalized = path.normalize(decodeURIComponent(rel)).replace(/^(\.\.[/\\])+/, '');
  const file = path.resolve(path.join(distDir, normalized));
  if (!file.startsWith(distDir + path.sep) && file !== distDir) return null;
  return file;
}

const server = http.createServer((req, res) => {
  void (async () => {
    if (await handleScoresApi(req, res)) return;

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405;
      res.end('Method not allowed');
      return;
    }

    const urlPath = (req.url || '/').split('?')[0];
    let file = safeFile(urlPath);
    if (!file) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) {
        file = path.join(distDir, 'index.html');
      }
      fs.readFile(file, (readErr, data) => {
        if (readErr) {
          res.statusCode = 404;
          res.end('Not found');
          return;
        }
        const ext = path.extname(file);
        res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
        if (ext === '.html') res.setHeader('Cache-Control', 'no-cache');
        else if (ext !== '') res.setHeader('Cache-Control', 'public, max-age=604800');
        res.end(req.method === 'HEAD' ? undefined : data);
      });
    });
  })();
});

server.listen(port, () => {
  console.log(`The Bird Game on http://localhost:${port}`);
});
