#!/usr/bin/env node
/**
 * WhatsApp koppelen vanaf de terminal, als het via het dashboard niet lukt.
 * Er opent een venster en er verschijnt een QR-code in dit scherm.
 */
import { spawn } from 'node:child_process';

console.log(`
  Start BOB-bridge en open daarna in het dashboard:  Koppelen

  Dat is de makkelijkste weg. Lukt dat niet, dan kun je hier de losse
  QR-code krijgen — druk Ctrl+C om te stoppen.
`);

const p = spawn(process.execPath, ['agent.mjs'], { stdio: 'inherit', cwd: import.meta.dirname });
p.on('exit', (code) => process.exit(code ?? 0));
