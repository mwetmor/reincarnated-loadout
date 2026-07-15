#!/usr/bin/env node
// verify-build-fail-guard.mjs
// Reproducible demonstration of the atlas-interactive build-fail guard (spec §7 #33).
//
// Doctors the vendored atlas source three ways (each a field RENAME of a
// load-bearing emitted field) and asserts the build script HALTS (non-zero exit)
// on each — then asserts the CLEAN source still builds (exit 0).
//
// Run: node scripts/atlas/verify-build-fail-guard.mjs
// Exits 0 iff all guard cases fire AND the clean source builds; else 1.

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const BUILD = resolve(__dirname, 'build-atlas-interactive.mjs');
const SOURCE = resolve(REPO_ROOT, 'data-src/atlas/atlas-edition2.json');
const SIDECAR = resolve(__dirname, 'kit-provenance-sidecar.json');

const tmp = mkdtempSync(join(tmpdir(), 'atlas-guard-'));
const OUT = join(tmp, 'out.json');

const atlas = JSON.parse(readFileSync(SOURCE, 'utf8'));
const sidecar = JSON.parse(readFileSync(SIDECAR, 'utf8'));

function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

/** Run the build against `srcObj` (+ optional doctored sidecar); true iff HALTS. */
function buildHalts(label, srcObj, sidecarObj) {
  const p = join(tmp, `doctored-${label}.json`);
  writeFileSync(p, JSON.stringify(srcObj));
  const args = [BUILD, p, '--out', OUT];
  if (sidecarObj) {
    const sp = join(tmp, `doctored-sidecar-${label}.json`);
    writeFileSync(sp, JSON.stringify(sidecarObj));
    args.push('--sidecar', sp);
  }
  try {
    execFileSync('node', args, { stdio: 'pipe' });
    return false; // exit 0 => did NOT halt
  } catch {
    return true; // non-zero exit => halted (guard fired)
  }
}

const cases = [
  {
    label: 'rename-point-x',
    make: () => {
      const d = clone(atlas);
      for (const pt of d.points) if ('x' in pt) pt.x_coord = (delete pt.x, pt.x_coord ?? 0);
      // (rewrite value properly)
      const d2 = clone(atlas);
      for (const pt of d2.points) if ('x' in pt) { pt.x_coord = pt.x; delete pt.x; }
      return d2;
    },
  },
  {
    label: 'rename-gateA_group',
    make: () => {
      const d = clone(atlas);
      for (const pt of d.points) if ('gateA_group' in pt) { pt.group_gate = pt.gateA_group; delete pt.gateA_group; }
      return d;
    },
  },
  {
    label: 'rename-ghost-core',
    make: () => {
      const d = clone(atlas);
      for (const c of d.ghost_field.feasible_cells) if ('core' in c) { c.core_tuple = c.core; delete c.core; }
      return d;
    },
  },
  {
    label: 'rename-death_class',
    make: () => {
      const d = clone(atlas);
      for (const pt of d.points) if ('death_class' in pt) { pt.class_of_death = pt.death_class; delete pt.death_class; }
      return d;
    },
  },
];

let ok = true;
for (const c of cases) {
  const halted = buildHalts(c.label, c.make());
  console.log(`  [${halted ? 'PASS' : 'FAIL'}] doctored '${c.label}' -> guard ${halted ? 'HALTED' : 'did NOT halt'}`);
  if (!halted) ok = false;
}

// D1-h: the corpus provenance-sidecar coverage floor. A sidecar that drops folk_name
// on the atlas kit_ids must HALT (never degrade build names to slugs). We doctor the
// sidecar (null every folk_name) against the CLEAN atlas source and assert the halt.
{
  const doctoredSidecar = clone(sidecar);
  for (const r of doctoredSidecar.rows) r.folk_name = null;
  const halted = buildHalts('sidecar-drop-folk_name', atlas, doctoredSidecar);
  console.log(
    `  [${halted ? 'PASS' : 'FAIL'}] doctored 'sidecar-drop-folk_name' -> guard ${halted ? 'HALTED' : 'did NOT halt'}`
  );
  if (!halted) ok = false;
}

// Clean source must still build.
let cleanBuilds = false;
try {
  execFileSync('node', [BUILD, SOURCE, '--out', OUT], { stdio: 'pipe' });
  cleanBuilds = true;
} catch {
  cleanBuilds = false;
}
console.log(`  [${cleanBuilds ? 'PASS' : 'FAIL'}] clean source -> ${cleanBuilds ? 'builds (exit 0)' : 'FAILED to build'}`);
if (!cleanBuilds) ok = false;

console.log(ok ? '\nGUARD VERIFY: ALL PASS' : '\nGUARD VERIFY: FAILURES ABOVE');
process.exit(ok ? 0 : 1);
