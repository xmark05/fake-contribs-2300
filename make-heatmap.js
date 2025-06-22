#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const fs           = require('fs');
const path         = require('path');
const { createCanvas } = require('canvas');

// === Konfiguration ===
const YEAR         = 2023; // unbedingt ein vergangenes Jahr
const WORD         = 'LEARNING';
const WEEKS        = 53;   // Spaltenanzahl im Kalender
const REMOTE       = 'https://github.com/xmark05/fake-contribs-2023.git';
const BRANCH       = 'main';

// deine GitHub-noreply-Adresse hier eintragen:
const AUTHOR_NAME  = 'xmark05';
const AUTHOR_EMAIL = 'xmark05@users.noreply.github.com';

// Maske: 0 = Commit, 1 = Skip (Wort-Bereich)
// === Maske bauen: 0 = Commit, 1 = Skip (Wort-Bereich) ===
function buildMask(text, weeks) {
  const canvas = createCanvas(weeks, 7);
  const ctx    = canvas.getContext('2d');
  // Schwarzer Hintergrund
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, weeks, 7);
  // Weißer Text = Skip-Bereich
  ctx.fillStyle = '#fff';
  ctx.font       = 'bold 7px sans-serif';
  ctx.fillText(text.toUpperCase(), 0, 6);

  const img  = ctx.getImageData(0, 0, weeks, 7).data;
  const mask = Array.from({ length: 7 }, () => Array(weeks).fill(0));
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < weeks; x++) {
      // statt Alpha prüfen wir hier den Rot-Kanal:
      const red = img[(y * weeks + x) * 4 + 0];
      mask[y][x] = red > 128 ? 1 : 0;  // weißer Text (red>128) → skip
    }
  }
  return mask;
}


(function main() {
  // 1) Repo init, falls nötig
  if (!fs.existsSync(path.join(process.cwd(), '.git'))) {
    execSync('git init');
    execSync(`git checkout -b ${BRANCH}`);
  }
  // 2) Remote einrichten
  try { execSync(`git remote add origin ${REMOTE}`); } catch (_) {}

  // 3) Maske erzeugen
  const mask = buildMask(WORD, WEEKS);

  // 4) Leere, rückdatierte Commits erzeugen
  const start = new Date(Date.UTC(YEAR, 0, 1, 12, 0, 0));
  for (let week = 0; week < WEEKS; week++) {
    for (let dow = 0; dow < 7; dow++) {
      if (mask[dow][week] === 0) {
        const date = new Date(start);
        date.setUTCDate(date.getUTCDate() + week*7 + dow);
        const iso = date.toISOString().replace('Z','');
        execSync(
          `GIT_AUTHOR_NAME="${AUTHOR_NAME}" ` +
          `GIT_AUTHOR_EMAIL="${AUTHOR_EMAIL}" ` +
          `GIT_AUTHOR_DATE="${iso}" ` +
          `GIT_COMMITTER_NAME="${AUTHOR_NAME}" ` +
          `GIT_COMMITTER_EMAIL="${AUTHOR_EMAIL}" ` +
          `GIT_COMMITTER_DATE="${iso}" ` +
          `git commit --allow-empty -m "fake commit ${iso}"`,
          { stdio:'ignore' }
        );
      }
    }
  }

  // 5) Push
  execSync(`git push --force origin ${BRANCH}`, { stdio:'inherit' });
  console.log(`✅ Fake-Commits für ${YEAR} mit Maske "${WORD}" gepusht.`);
})();
