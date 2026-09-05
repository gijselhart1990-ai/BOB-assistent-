#!/usr/bin/env node
/**
 * Zet BOB als MCP-server in Claude Desktop en/of Claude Code.
 *
 * Voegt alleen de BOB-entry toe. Bestaande servers blijven staan —
 * er wordt eerst een back-up van je config gemaakt.
 *
 *   node scripts/install-mcp.js            # tonen wat er zou gebeuren
 *   node scripts/install-mcp.js --write    # daadwerkelijk schrijven
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');

const targets = [
  {
    label: 'Claude Desktop',
    file: process.platform === 'win32'
      ? path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json')
      : process.platform === 'darwin'
        ? path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
        : path.join(os.homedir(), '.config', 'Claude', 'claude_desktop_config.json'),
  },
  {
    label: 'Claude Code',
    file: path.join(os.homedir(), '.claude.json'),
  },
];

const entry = {
  command: 'node',
  args: [path.join(ROOT, 'mcp', 'bob-mcp-server.js')],
  env: { BOB_URL: `http://localhost:${process.env.PORT || 4321}` },
};

let changed = 0;

for (const target of targets) {
  const dir = path.dirname(target.file);
  if (!fs.existsSync(dir)) {
    console.log(`—  ${target.label}: niet gevonden (${dir} bestaat niet), overgeslagen.`);
    continue;
  }

  let cfg = {};
  if (fs.existsSync(target.file)) {
    try {
      cfg = JSON.parse(fs.readFileSync(target.file, 'utf8'));
    } catch (err) {
      console.log(`!  ${target.label}: config is geen geldige JSON (${err.message}). Overgeslagen — repareer hem eerst.`);
      continue;
    }
  }

  cfg.mcpServers ||= {};
  const before = JSON.stringify(cfg.mcpServers.bob || null);
  const after = JSON.stringify(entry);
  if (before === after) { console.log(`✓  ${target.label}: BOB stond er al in.`); continue; }

  cfg.mcpServers.bob = entry;

  if (!WRITE) {
    console.log(`→  ${target.label}: zou BOB toevoegen aan ${target.file}`);
    changed++;
    continue;
  }

  if (fs.existsSync(target.file)) {
    const backup = `${target.file}.bob-backup-${Date.now()}`;
    fs.copyFileSync(target.file, backup);
    console.log(`   back-up: ${backup}`);
  }
  fs.writeFileSync(target.file, JSON.stringify(cfg, null, 2), 'utf8');
  console.log(`✓  ${target.label}: BOB toegevoegd aan ${target.file}`);
  changed++;
}

console.log(
  changed === 0 ? '\nNiets te doen.'
    : WRITE ? '\nKlaar. Herstart Claude Desktop om BOB te zien verschijnen.'
      : '\nDit was een droogloop. Voer opnieuw uit met --write om het echt te doen.'
);
