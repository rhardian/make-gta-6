// Solaris Bay: Heatwave — gta6-01 open-world crime game entry (Node 22, standard library only).
// Copies game/ (offline browser game with 3D perspective city renderer, vehicles, traffic,
// pedestrians, 5-star police pursuit, missions, combat, audio, save system and HUD) and
// screenshots/ (4 gameplay renders) to MAKEFUN_OUTPUT_DIR (or /output) and builds dossier.json.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const ROOT_DIR = fileURLToPath(new URL('.', import.meta.url));
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const GATE_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function stageEntryOutput(sourceRoot: string, targetRoot: string): void {
  const targetGameDir = join(targetRoot, 'game');
  const targetShotsDir = join(targetRoot, 'screenshots');

  mkdirSync(targetRoot, { recursive: true });
  if (existsSync(targetGameDir)) rmSync(targetGameDir, { recursive: true, force: true });
  if (existsSync(targetShotsDir)) rmSync(targetShotsDir, { recursive: true, force: true });

  cpSync(join(sourceRoot, 'game'), targetGameDir, { recursive: true });
  mkdirSync(targetShotsDir, { recursive: true });

  const sourceShotsDir = join(sourceRoot, 'screenshots');
  if (existsSync(sourceShotsDir)) {
    for (const entry of readdirSync(sourceShotsDir, { withFileTypes: true })) {
      if (entry.isFile() && !entry.name.startsWith('.')) {
        cpSync(join(sourceShotsDir, entry.name), join(targetShotsDir, entry.name));
      }
    }
  }
}

stageEntryOutput(ROOT_DIR, OUTPUT_DIR);
const dossierBytes = buildDossier(OUTPUT_DIR, GATE_CAPS);
const dossierPath = join(OUTPUT_DIR, 'dossier.json');
writeFileSync(dossierPath, dossierBytes);
