#!/usr/bin/env node
/**
 * Copies Unity assets into vite/public for the web build.
 * Sprites: Assets/Sprites → public/sprites
 * Audio: Assets/Audio → public/audio (.aiff → .mp3 when ffmpeg is available; Safari needs MP3)
 *
 * Run from vite/: npm run assets
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const viteDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(viteDir, '..');
const publicDir = path.join(viteDir, 'public');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyRecursive(src, dest) {
  ensureDir(dest);
  for (const name of fs.readdirSync(src)) {
    const srcPath = path.join(src, name);
    const destPath = path.join(dest, name);
    if (fs.statSync(srcPath).isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Sprites
const spritesSrc = path.join(repoRoot, 'Assets', 'Sprites');
const spritesDest = path.join(publicDir, 'sprites');
if (fs.existsSync(spritesSrc)) {
  ensureDir(path.dirname(spritesDest));
  copyRecursive(spritesSrc, spritesDest);
  console.log('Sprites copied to public/sprites');
} else {
  console.warn('Assets/Sprites not found');
}

// Audio: copy and convert .aiff → .mp3 when ffmpeg is available (iOS Safari has no Ogg)
const audioSrc = path.join(repoRoot, 'Assets', 'Audio');
const audioDest = path.join(publicDir, 'audio');
ensureDir(audioDest);

let ffmpegAvailable = false;
try {
  execSync('ffmpeg -version', { stdio: 'ignore' });
  ffmpegAvailable = true;
} catch (_) {}

if (!ffmpegAvailable) {
  console.warn('ffmpeg not found; .aiff will be copied as-is (browsers may not play it). Install ffmpeg for .mp3 conversion.');
}

if (fs.existsSync(audioSrc)) {
  for (const name of fs.readdirSync(audioSrc)) {
    if (name.endsWith('.meta')) continue;
    const srcPath = path.join(audioSrc, name);
    if (!fs.statSync(srcPath).isFile()) continue;
    const base = path.basename(name, path.extname(name));
    const ext = name.toLowerCase();
    if (ext.endsWith('.aiff') && ffmpegAvailable) {
      const destMp3 = path.join(audioDest, base + '.mp3');
      execSync(`ffmpeg -y -i "${srcPath}" -codec:a libmp3lame -q:a 4 "${destMp3}"`, { stdio: 'ignore' });
    } else if (ext.endsWith('.aiff')) {
      fs.copyFileSync(srcPath, path.join(audioDest, name));
    } else {
      fs.copyFileSync(srcPath, path.join(audioDest, name));
    }
  }
  console.log('Audio copied to public/audio');
} else {
  console.warn('Assets/Audio not found');
}
