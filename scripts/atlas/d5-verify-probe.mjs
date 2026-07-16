#!/usr/bin/env node
// d5-verify-probe.mjs — headless CDP verification of the §9.5 D5 "screen box" resize.
//
// Zero-dependency CDP client (Node 24 global WebSocket + fetch; system Chrome). Drives
// a running `vite preview` of the built bundle (the D4 precedent — the *.vercel.app
// preview hits an SSO wall for headless CDP, so we verify the SAME built bundle locally).
//
// Acceptance (spec §9.5 items 63–65):
//   63 plate==box: DOM plate rect x/y/w/h == planeClip == viewBox == derived fit box;
//      no page-background band inside the frame; no mark/rail/footer off-plate
//      (corner-crop screenshot receipt); re-applied identically on skin flip.
//   64 no-fixed-px: svg width/height attrs ABSENT after mount; rendered width tracks the
//      container with 4:3 held (1440/1280/375 — zero horizontal page overflow each).
//
// Usage: node scripts/atlas/d5-verify-probe.mjs [--url http://localhost:4319] [--out DIR]
//
// Spec: agentic_orchestration/gandalf/notes/2026-07-15-atlas-interactive-glance-spec.md §9.5

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const args = process.argv.slice(2);
const getArg = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const BASE_URL = getArg('--url', 'http://localhost:4319');
const OUT_DIR = getArg('--out', path.join(os.tmpdir(), 'drax-d5-receipts'));
fs.mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1280', width: 1280, height: 800 },
  { name: '375', width: 375, height: 812 },
];

// ---------- minimal CDP client over the DevTools WebSocket ----------
function cdpConnect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  const listeners = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    } else if (msg.method) {
      for (const l of listeners) l(msg);
    }
  });
  const ready = new Promise((res, rej) => {
    ws.addEventListener('open', () => res());
    ws.addEventListener('error', (e) => rej(new Error('ws error: ' + (e.message || e))));
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  return { ws, ready, send, on: (fn) => listeners.push(fn) };
}

async function launchChrome(userDataDir) {
  const port = 9222 + Math.floor(Math.random() * 500);
  const proc = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--hide-scrollbars=false',
    'about:blank',
  ]);
  // Poll the version endpoint for the browser WebSocket URL.
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) {
        const j = await r.json();
        return { proc, port, wsUrl: j.webSocketDebuggerUrl };
      }
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Chrome did not expose the debugging endpoint');
}

// ---------- probe one viewport ----------
async function probeViewport(browser, vp, doSkinFlip, doCornerCrop) {
  // New target (tab) per viewport.
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await browser.send('Target.attachToTarget', {
    targetId,
    flatten: true,
  });
  const S = (method, params) => browser.send(method, params, sessionId);

  await S('Page.enable', {});
  await S('Runtime.enable', {});
  await S('Emulation.setDeviceMetricsOverride', {
    width: vp.width,
    height: vp.height,
    deviceScaleFactor: 1,
    mobile: false,
  });

  const evalJs = async (expression) => {
    const r = await S('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails) {
      throw new Error(
        'eval exception: ' +
          (r.exceptionDetails.exception?.description || JSON.stringify(r.exceptionDetails))
      );
    }
    return r.result.value;
  };

  await S('Page.navigate', { url: `${BASE_URL}/atlas` });
  await S('Page.loadEventFired', {}).catch(() => {});

  // Poll until the stage hook has configured the inlined SVG (viewBox rewritten off
  // native + width attr removed). Up to ~15s (SVG fetch is a few MB).
  const measurement = await evalJs(`(async () => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    let svg = null;
    for (let i = 0; i < 150; i++) {
      svg = document.querySelector('.atlas-svg-host svg');
      // configured == width attr removed AND viewBox no longer the native canvas box.
      if (svg && !svg.hasAttribute('width') && svg.getAttribute('viewBox') !== '0 0 1600 1200') break;
      await sleep(100);
    }
    if (!svg) return { error: 'no inlined svg' };

    const parseVB = (s) => s.trim().split(/\\s+/).map(Number);
    const viewBox = svg.getAttribute('viewBox');

    // planeClip rect
    const clip = svg.querySelector('#planeClip rect');
    const clipAttrs = clip ? {
      x: clip.getAttribute('x'), y: clip.getAttribute('y'),
      width: clip.getAttribute('width'), height: clip.getAttribute('height'),
    } : null;

    // Structural plate: direct-child rect of svg with native dims — but AFTER the write
    // its width/height are the fit box, so we identify it as the direct-child rect whose
    // x/y/w/h now equal the viewBox (the ONLY direct-child rect in this artifact). Report
    // its attrs + fill for the receipt.
    const directRects = Array.from(svg.children).filter(el => el.tagName.toLowerCase() === 'rect');
    const plates = directRects.map(el => ({
      x: el.getAttribute('x'), y: el.getAttribute('y'),
      width: el.getAttribute('width'), height: el.getAttribute('height'),
      fill: el.getAttribute('fill'),
    }));

    // svg presentation attrs (must be ABSENT after mount).
    const svgWidthAttr = svg.getAttribute('width');
    const svgHeightAttr = svg.getAttribute('height');

    // Rendered geometry.
    const rect = svg.getBoundingClientRect();
    const host = svg.parentElement.getBoundingClientRect();

    // Page horizontal overflow.
    const de = document.documentElement;
    const scrollW = de.scrollWidth, clientW = de.clientWidth;

    return {
      viewBox,
      clipAttrs,
      plates,
      svgWidthAttr, svgHeightAttr,
      rendered: { width: rect.width, height: rect.height, left: rect.left, right: rect.right },
      host: { width: host.width },
      page: { scrollW, clientW, innerW: window.innerWidth },
    };
  })()`);

  const result = { viewport: vp.name, width: vp.width, ...measurement };

  // Optional corner-crop screenshot at 1440 (acceptance 63 corner-crop receipt).
  if (doCornerCrop && !measurement.error) {
    // Full-page screenshot (captureBeyondViewport so the whole tall chart region paints,
    // not just the 900px viewport slice). The crop proof targets the corners where D4
    // left off-plate content (hull marks, pole-rail glosses, footer strings).
    const full = await S('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    const fullPath = path.join(OUT_DIR, `d5-atlas-${vp.name}-full.png`);
    fs.writeFileSync(fullPath, Buffer.from(full.data, 'base64'));
    result.fullScreenshot = fullPath;

    // Corner crops: capture the chart region's corners at native res via clip. Use the
    // region's page-absolute rect (add scrollY since the region may sit below the fold)
    // and captureBeyondViewport so unpainted-viewport-slice whiteout can't occur.
    const regionBox = await evalJs(`(() => {
      const region = document.querySelector('[aria-label="Build Horizon — full-horizon chart"]');
      const r = region.getBoundingClientRect();
      return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
    })()`);
    // Inset the crops 1px inside the region edges so the crop never straddles the region
    // border (a straddle would show page background that is NOT "inside the frame").
    const cropW = Math.min(360, regionBox.w - 2);
    const cropH = Math.min(300, regionBox.h - 2);
    const corners = [
      { tag: 'topright', x: regionBox.x + regionBox.w - cropW - 1, y: regionBox.y + 1 },
      { tag: 'bottomright', x: regionBox.x + regionBox.w - cropW - 1, y: regionBox.y + regionBox.h - cropH - 1 },
      { tag: 'bottomleft', x: regionBox.x + 1, y: regionBox.y + regionBox.h - cropH - 1 },
    ];
    result.cornerCrops = [];
    result.regionBox = regionBox;
    for (const c of corners) {
      const shot = await S('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
        clip: { x: c.x, y: c.y, width: cropW, height: cropH, scale: 1 },
      });
      const p = path.join(OUT_DIR, `d5-atlas-cornercrop-${c.tag}.png`);
      fs.writeFileSync(p, Buffer.from(shot.data, 'base64'));
      result.cornerCrops.push(p);
    }
  }

  // Optional WIRING re-demonstration on the resized frame (acceptance 65: halo +
  // filter-reset drill + chart-region scrollIntoView). Runs before the skin flip so it
  // operates on the dark (default) canvas.
  if (doCornerCrop && !measurement.error) {
    const wiring = await evalJs(`(async () => {
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      const out = {};

      // ---- CHART -> TABLE: click a live kit mark; expect selection + a table row ----
      const kitMark = document.querySelector('.atlas-svg-host svg [data-kit]');
      out.chartToTable = { markFound: !!kitMark };
      if (kitMark) {
        out.chartToTable.kitId = kitMark.getAttribute('data-kit');
        kitMark.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await sleep(150);
        // Selection summary should now show a "build · …" label somewhere on the page.
        out.chartToTable.selectionShown = /build ·/.test(document.body.textContent || '');
        // A row carrying that kit's id should be present in the table (revealed).
        const row = document.querySelector('[data-kit="'+kitMark.getAttribute('data-kit')+'"]');
        // The injected selection <style> should now target this data-kit (halo).
        const styleText = Array.from(document.querySelectorAll('style')).map(s=>s.textContent).join('\\n');
        out.chartToTable.haloRuleForKit = styleText.includes('[data-kit="'+kitMark.getAttribute('data-kit')+'"]');
        // Computed stroke on the mark (halo lands): stroke-width > 0 and a stroke color set.
        const cs = getComputedStyle(kitMark);
        out.chartToTable.markStrokeWidth = cs.strokeWidth;
        out.chartToTable.markStroke = cs.stroke;
      }

      // ---- FILTER-RESET DRILL: set a FILTER that EXCLUDES a mark, click it, expect reset ----
      // IMPORTANT: the LEGEND also has aria-pressed class-toggle buttons ("Graveyard",
      // "Ghosts", …) — those are NOT filters. Scope strictly to the FILTER BAR
      // ([data-testid="atlas-filter-bar"]); the Liveness "Graveyard" filter button lives
      // there. Set it, then click a LIVE kit mark (excluded by Graveyard) → the page's
      // deterministic reveal resets ALL filters to All so the row is present.
      const filterBar = document.querySelector('[data-testid="atlas-filter-bar"]');
      const filterBtn = (txt) => filterBar
        ? Array.from(filterBar.querySelectorAll('button')).find(
            b => (b.textContent||'').trim() === txt && b.hasAttribute('aria-pressed'))
        : null;
      const gvFilterBtn = filterBtn('Graveyard');
      out.filterReset = { filterBarFound: !!filterBar, graveyardFilterFound: !!gvFilterBtn };
      if (gvFilterBtn) {
        gvFilterBtn.click();
        await sleep(160);
        // Re-query fresh within the bar (React re-renders Segmented).
        out.filterReset.graveyardFilterPressed =
          filterBtn('Graveyard')?.getAttribute('aria-pressed') === 'true';
        // Under the Graveyard filter, live-kit leaf rows are filtered out. Count LIVE kit
        // rows via the selection-summary/table: total kit rows shrink toward the 37
        // graveyard kits (virtualized visible count is a proxy).
        out.filterReset.kitRowsUnderGraveyard =
          document.querySelectorAll('button[id^="atlas-leaf-k-"]').length;
        // A LIVE kit mark, excluded by Graveyard → click → deterministic reset.
        const liveMark = document.querySelector('.atlas-svg-host svg [data-el="live"][data-kit]');
        if (liveMark) {
          const kid = liveMark.getAttribute('data-kit');
          out.filterReset.clickedLiveKit = kid;
          liveMark.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          await sleep(240);
          // After the reset: WITHIN THE FILTER BAR, no Graveyard pressed and all four
          // segmented groups show "All" pressed (filters → All).
          const bar = document.querySelector('[data-testid="atlas-filter-bar"]');
          const barBtns = bar ? Array.from(bar.querySelectorAll('button[aria-pressed]')) : [];
          const pressedGraveyard = barBtns.filter(
            b => (b.textContent||'').trim()==='Graveyard' && b.getAttribute('aria-pressed')==='true').length;
          const pressedAll = barBtns.filter(
            b => (b.textContent||'').trim()==='All' && b.getAttribute('aria-pressed')==='true').length;
          out.filterReset.pressedGraveyardFilterAfter = pressedGraveyard;
          out.filterReset.pressedAllFiltersAfter = pressedAll;
          out.filterReset.resetToAll = pressedGraveyard === 0 && pressedAll === 4;
          // The clicked kit's leaf row is present (revealed by the reset).
          const revealedRow = document.getElementById('atlas-leaf-k-' + (kid||'').replace(/[^-\\w]/g,'_'));
          out.filterReset.rowRevealed = !!revealedRow;
        } else {
          out.filterReset.note = 'no live[data-kit] mark to click';
        }
      }

      // ---- TABLE -> CHART: click a leaf row; expect selection halo on its mark ----
      // Leaf rows are <button id="atlas-leaf-k-<kit_id>">; the kit_id is the id suffix.
      const kitRow = document.querySelector('button[id^="atlas-leaf-k-"]');
      out.tableToChart = { rowFound: !!kitRow };
      if (kitRow) {
        const kid = kitRow.id.replace('atlas-leaf-k-', '');
        out.tableToChart.rowId = kitRow.id;
        kitRow.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await sleep(180);
        out.tableToChart.rowMarkedSelected = kitRow.getAttribute('aria-current') === 'true';
        const styleText = Array.from(document.querySelectorAll('style')).map(s=>s.textContent).join('\\n');
        // The injected selection <style> now targets a [data-kit=...] (halo on the mark).
        out.tableToChart.haloRuleInjected = /\\[data-kit="[^"]+"\\]/.test(styleText);
        // Confirm the corresponding chart mark carries a computed stroke (halo lands).
        const mark = document.querySelector('.atlas-svg-host svg [data-kit="'+kid+'"]');
        if (mark) {
          const cs = getComputedStyle(mark);
          out.tableToChart.markStrokeWidth = cs.strokeWidth;
        }
      }

      out.scrollIntoViewNote =
        'scrollIntoView sub-test runs with a SHORT viewport (below) so the 1044px chart ' +
        'can be pushed fully above the fold; the page gate only scrolls when out of view.';
      // Reset scroll for subsequent captures.
      window.scrollTo(0, 0);
      await sleep(50);
      return out;
    })()`);
    result.wiring = wiring;

    // ---- CHART-REGION scrollIntoView with a SHORT viewport (acceptance 65 D4-d) ----
    // Shrink the viewport height so the 1044px chart exceeds it and CAN be scrolled fully
    // above the fold. Then click a leaf row → the page (isElementInViewport gate) brings
    // the chart region back into view. This is the genuine out-of-view → back path.
    await S('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: 560,
      deviceScaleFactor: 1,
      mobile: false,
    });
    const scrollTest = await evalJs(`(async () => {
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      const region = document.querySelector('[aria-label="Build Horizon — full-horizon chart"]');
      const vh = window.innerHeight;
      // Clear any selection ring first by clicking empty svg? Not needed. Scroll so the
      // chart region's BOTTOM is above the viewport top (fully out of view).
      const regionPageBottom = region.getBoundingClientRect().bottom + window.scrollY;
      window.scrollTo(0, Math.min(regionPageBottom + 40, document.documentElement.scrollHeight - vh));
      await sleep(180);
      const beforeRect = region.getBoundingClientRect();
      const chartWasOutOfView = beforeRect.bottom <= 0 || beforeRect.top >= vh;
      const row = document.querySelector('button[id^="atlas-leaf-"]');
      const rowId = row ? row.id : null;
      if (row) { row.dispatchEvent(new MouseEvent('click', { bubbles: true })); await sleep(650); }
      const afterRect = region.getBoundingClientRect();
      return {
        viewportHeight: vh,
        beforeTop: Math.round(beforeRect.top),
        beforeBottom: Math.round(beforeRect.bottom),
        chartWasOutOfView,
        clickedRow: rowId,
        afterTop: Math.round(afterRect.top),
        afterBottom: Math.round(afterRect.bottom),
        broughtIntoView: afterRect.bottom > 0 && afterRect.top < vh,
      };
    })()`);
    result.scrollIntoView = scrollTest;
    // Restore the full viewport height for any later captures on this target.
    await S('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: false,
    });
  }

  // Optional skin-flip re-apply check (acceptance 63 "re-applied identically on skin flip").
  if (doSkinFlip && !measurement.error) {
    const flip = await evalJs(`(async () => {
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      // Click the non-active skin button in the skin toggle.
      const btns = Array.from(document.querySelectorAll('button'));
      const target = btns.find(b => /light|instrument|white/i.test(b.textContent || '') && !b.disabled)
        || btns.find(b => /skin|lens|canvas/i.test(b.getAttribute('aria-label') || ''));
      if (!target) return { flipped: false, reason: 'no skin button found', buttons: btns.map(b=>b.textContent).slice(0,12) };
      target.click();
      // Wait for re-inline + re-config (new markup → width removed + viewBox off native).
      let svg = null;
      for (let i = 0; i < 150; i++) {
        await sleep(100);
        svg = document.querySelector('.atlas-svg-host svg');
        if (svg && !svg.hasAttribute('width') && svg.getAttribute('viewBox') !== '0 0 1600 1200') break;
      }
      if (!svg) return { flipped: false, reason: 'svg not reconfigured after flip' };
      const clip = svg.querySelector('#planeClip rect');
      const directRects = Array.from(svg.children).filter(el => el.tagName.toLowerCase() === 'rect');
      const plate = directRects[0];
      return {
        flipped: true,
        viewBox: svg.getAttribute('viewBox'),
        clip: clip ? [clip.getAttribute('x'),clip.getAttribute('y'),clip.getAttribute('width'),clip.getAttribute('height')] : null,
        plate: plate ? [plate.getAttribute('x'),plate.getAttribute('y'),plate.getAttribute('width'),plate.getAttribute('height')] : null,
        plateFill: plate ? plate.getAttribute('fill') : null,
        svgWidthAttr: svg.getAttribute('width'),
      };
    })()`);
    result.skinFlip = flip;
  }

  await browser.send('Target.closeTarget', { targetId });
  return result;
}

// ---------- main ----------
async function main() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drax-cdp-'));
  const { proc, wsUrl } = await launchChrome(userDataDir);
  const browser = cdpConnect(wsUrl);
  await browser.ready;
  const results = [];
  try {
    for (const vp of VIEWPORTS) {
      const isFirst = vp.name === '1440';
      const r = await probeViewport(browser, vp, isFirst, isFirst);
      results.push(r);
    }
  } finally {
    try { browser.ws.close(); } catch {}
    try { proc.kill('SIGKILL'); } catch {}
  }

  const outJson = path.join(OUT_DIR, 'd5-receipts.json');
  fs.writeFileSync(outJson, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  console.log('\nReceipts JSON:', outJson);
  process.exit(0);
}

main().catch((e) => {
  console.error('PROBE FAILED:', e.stack || e.message);
  process.exit(1);
});
