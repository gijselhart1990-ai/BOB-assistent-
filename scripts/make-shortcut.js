#!/usr/bin/env node
/**
 * `bob shortcut`
 *
 * Zet (of repareert) de BOB-snelkoppeling op je bureaublad.
 *
 * Waarom dit een apart commando is: de snelkoppeling wordt gemaakt met een
 * vast pad erin. Verplaats of hernoem je de map — of pak je een nieuwe versie
 * elders uit — dan wijst hij naar een map die niet meer bestaat en gebeurt er
 * bij dubbelklikken niets. Dit commando richt hem opnieuw op de map waar je
 * hem draait.
 *
 * Hij wijst naar bob.cmd, niet naar start-bob.ps1: .cmd-bestanden vallen
 * buiten het PowerShell-uitvoeringsbeleid dat op werklaptops vaak aanstaat.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const dim = (s) => `\x1b[90m${s}\x1b[0m`;

console.log('');

if (process.platform !== 'win32') {
  console.log('  Snelkoppelingen maken werkt alleen op Windows.');
  console.log(`  Start BOB hier met:  node ${path.join(ROOT, 'server', 'index.js')}\n`);
  process.exit(0);
}

const target = path.join(ROOT, 'bob.cmd');
if (!fs.existsSync(target)) {
  console.log(red(`  bob.cmd niet gevonden in ${ROOT}`));
  console.log('  Draai dit commando vanuit je BOB-map.\n');
  process.exit(1);
}

// Inline PowerShell-commando's vallen niet onder het uitvoeringsbeleid;
// alleen losse .ps1-bestanden doen dat. Vandaar -Command in plaats van -File.
const ps = `
$ErrorActionPreference = 'Stop'
$desktop = [Environment]::GetFolderPath('Desktop')
$lnk = Join-Path $desktop 'BOB.lnk'
$shell = New-Object -ComObject WScript.Shell
$s = $shell.CreateShortcut($lnk)
$s.TargetPath = '${target.replace(/'/g, "''")}'
$s.WorkingDirectory = '${ROOT.replace(/'/g, "''")}'
$s.Description = 'Start BOB'
$s.IconLocation = 'shell32.dll,13'
$s.Save()
Write-Output $lnk
`.trim();

try {
  const { stdout } = await run('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], {
    windowsHide: true,
  });
  const lnk = stdout.trim().split('\n').pop().trim();
  console.log(`  ${green('Snelkoppeling gezet.')}`);
  console.log(`    ${lnk}`);
  console.log(`    wijst naar ${dim(target)}\n`);
  console.log('  Dubbelklikken start BOB en opent het dashboard.\n');
} catch (err) {
  console.log(red('  Kon de snelkoppeling niet maken.'));
  console.log(`  ${String(err.stderr || err.message).split('\n')[0]}\n`);
  console.log('  Je kunt BOB altijd starten door in deze map te dubbelklikken op:');
  console.log(`    ${target}\n`);
  process.exit(1);
}
