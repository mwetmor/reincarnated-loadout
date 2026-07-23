// CanonIndex — /canon route.
//
// A dense, sortable, filterable table of all 267 canonical KIT records "as the
// battle sim sees them". Source: public/canon-data/index.json (exported READ-ONLY from
// corpus.db by scripts/export_canon_corpus.py). This is the SIM-INPUT view: the
// per-kit coordinates/keys the sim consumes to place each kit and generate a class.
//
// Distinct from /kits (the 75 engine-GENERATED kits) — a cross-note says so.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCanonIndex } from '../hooks/useCanonData';
import { displayGame, gradeTone, spineStatusTone } from '../data/canonTypes';
import type { CanonIndexRow, SpineStatus } from '../data/canonTypes';

type SortKey =
  | 'kit_id'
  | 'folk_name'
  | 'game'
  | 'tier'
  | 'court'
  | 'element'
  | 'grade'
  | 'spine_status'
  | 'bands_count'
  | 'citations_count'
  | 'verify_confirmed';

type SortDir = 'asc' | 'desc';

// Sticky header-cell class. In a border-separate table the sticky offset lives on
// the <th> cells (Chrome ignores position:sticky on a <thead> when the table uses
// border-collapse — that was the v1.14 bug: the first body row painted OVER the
// header band). `top-12` = 3rem = the h-12 Nav height; the bottom border stands in
// for the collapsed border the header used to carry.
const TH_STICKY =
  'sticky top-12 z-10 bg-gray-900 border-b border-gray-800 px-2 py-2';

function uniqueSorted(rows: CanonIndexRow[], key: keyof CanonIndexRow): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const v = r[key];
    if (v != null && v !== '') set.add(String(v));
  }
  return [...set].sort();
}

function cmp(a: string | number | null, b: string | number | null): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

export function CanonIndex() {
  const { index, status, error } = useCanonIndex();

  const [sortKey, setSortKey] = useState<SortKey>('kit_id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [q, setQ] = useState('');
  const [fGame, setFGame] = useState('');
  const [fTier, setFTier] = useState('');
  const [fCourt, setFCourt] = useState('');
  const [fGrade, setFGrade] = useState('');
  const [fSpine, setFSpine] = useState('');

  const rows = useMemo(() => index?.kits ?? [], [index]);

  const games = useMemo(() => uniqueSorted(rows, 'game'), [rows]);
  const tiers = useMemo(() => uniqueSorted(rows, 'tier'), [rows]);
  const courts = useMemo(() => uniqueSorted(rows, 'court'), [rows]);
  const grades = useMemo(() => uniqueSorted(rows, 'grade'), [rows]);
  const spineStatuses = useMemo(() => uniqueSorted(rows, 'spine_status'), [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (fGame && r.game !== fGame) return false;
      if (fTier && r.tier !== fTier) return false;
      if (fCourt && r.court !== fCourt) return false;
      if (fGrade && r.grade !== fGrade) return false;
      if (fSpine && r.spine_status !== fSpine) return false;
      if (needle) {
        const hay = `${r.kit_id} ${r.folk_name ?? ''} ${r.element ?? ''} ${r.court ?? ''}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...out].sort((a, b) => dir * cmp(a[sortKey] ?? null, b[sortKey] ?? null));
  }, [rows, q, fGame, fTier, fCourt, fGrade, fSpine, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(k);
      setSortDir('asc');
    }
  };

  if (status === 'loading' || status === 'idle') {
    return <CenterNote spin text="Loading canon index…" />;
  }
  if (status === 'error' || !index) {
    return (
      <CenterNote
        text={`Failed to load /canon-data/index.json — ${error ?? 'unknown error'}. Run scripts/export_canon_corpus.py.`}
        error
      />
    );
  }

  const p = index.export_provenance;

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-6 sm:px-6">
      {/* header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-100 sm:text-2xl">
          {p.record_count} canonical records
          <span className="ml-2 text-sm font-normal text-gray-500">· as the battle sim sees them</span>
        </h1>
        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-gray-400">
          Every canonical KIT record in the pipeline, rendered with 100% of its per-kit data as the
          simulation consumes it. The sim reads each kit&rsquo;s six-axis <em>coordinates</em> +
          engine key, places it into a cell, and generates a class from that placement — this page
          shows the per-kit <em>inputs</em> to that process (not a generated character). Nothing is
          summarized away; open any kit for the full join.
        </p>
        <p className="mt-2 max-w-3xl text-[0.7rem] leading-relaxed text-gray-600">
          Distinct from{' '}
          <Link to="/kits" className="text-gray-500 underline underline-offset-2 hover:text-gray-400">
            /kits
          </Link>{' '}
          — that surface shows engine-<em>generated</em> kits (a different pool). This is the{' '}
          <em>canonical corpus</em> the generator draws from.
        </p>
        <ExportStamp />
      </div>

      {/* filters */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search name / id / element / court…"
          className="min-w-[12rem] flex-1 rounded border border-gray-800 bg-gray-900 px-2.5 py-1.5 text-xs text-gray-200 placeholder:text-gray-600 focus:border-gray-600 focus:outline-none"
        />
        <FilterSelect label="game" value={fGame} onChange={setFGame} options={games} format={displayGame} />
        <FilterSelect label="tier" value={fTier} onChange={setFTier} options={tiers} />
        <FilterSelect label="court" value={fCourt} onChange={setFCourt} options={courts} />
        <FilterSelect label="grade" value={fGrade} onChange={setFGrade} options={grades} />
        <FilterSelect label="spine" value={fSpine} onChange={setFSpine} options={spineStatuses} />
        <span className="ml-auto whitespace-nowrap font-mono text-[0.7rem] text-gray-500">
          {filtered.length} / {rows.length}
        </span>
      </div>

      {/* table */}
      {/* NOTE(drax v1.15): table is border-separate (NOT border-collapse) and the
          sticky offset lives on the <th> cells — not the <thead>. Chrome does not
          honor position:sticky on a <thead> inside a border-collapse table, which
          made the first body row render OVER the (invisible) header band. The
          shared TH_STICKY class parks the header row just under the h-12 Nav. */}
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="min-w-full border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <Th label="kit" k="kit_id" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <Th label="folk name" k="folk_name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <Th label="game" k="game" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <Th label="tier" k="tier" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <Th label="court" k="court" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <Th label="element" k="element" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <th className={`${TH_STICKY} whitespace-nowrap text-left font-mono text-[0.62rem] uppercase text-gray-500`}>
                range / tempo / amp
              </th>
              <Th label="grade" k="grade" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <Th label="spine" k="spine_status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <Th label="bands" k="bands_count" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
              <Th label="✓ cf" k="verify_confirmed" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
              <th className={`${TH_STICKY} text-center font-mono text-[0.62rem] uppercase text-gray-500`}>
                guide
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <Row key={r.kit_id} r={r} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm italic text-gray-500">
            No records match the current filters.
          </p>
        )}
      </div>
    </div>
  );

  function ExportStamp() {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.62rem] text-gray-600">
        <span>schema {p.schema_version ?? '?'}</span>
        <span>· applied {p.schema_applied_utc ?? '?'}</span>
        <span>· exported {p.exported_utc.slice(0, 19).replace('T', ' ')}Z</span>
        <span>
          · classes: {Object.entries(p.corpus_class_counts).map(([k, v]) => `${k} ${v}`).join(' / ')}
        </span>
        <span>
          · spine:{' '}
          {Object.entries(p.spine_status_distribution).map(([k, v]) => `${k} ${v}`).join(' / ')}
        </span>
      </div>
    );
  }
}

// ── row ─────────────────────────────────────────────────────────────────────

function Row({ r }: { r: CanonIndexRow }) {
  const rta = [r.range_val, r.tempo_val, r.amp_val].map((x) => x ?? '—').join(' / ');
  return (
    <tr className="odd:bg-gray-900/20 hover:bg-gray-800/40">
      <td className="whitespace-nowrap px-2 py-1.5 align-top">
        <Link
          to={`/canon/${encodeURIComponent(r.kit_id)}`}
          className="font-mono text-[0.7rem] text-sky-400 hover:text-sky-300"
        >
          {r.kit_id}
        </Link>
      </td>
      <td className="px-2 py-1.5 align-top text-gray-200">
        <Link to={`/canon/${encodeURIComponent(r.kit_id)}`} className="hover:text-white">
          {r.folk_name ?? <span className="italic text-gray-600">—</span>}
        </Link>
      </td>
      <td className="whitespace-nowrap px-2 py-1.5 align-top text-gray-400">{displayGame(r.game)}</td>
      <td className="px-2 py-1.5 align-top text-gray-400">{r.tier ?? '—'}</td>
      <td className="px-2 py-1.5 align-top text-gray-400">{r.court ?? <span className="italic text-gray-600">—</span>}</td>
      <td className="px-2 py-1.5 align-top text-gray-400">{r.element ?? '—'}</td>
      <td className="whitespace-nowrap px-2 py-1.5 align-top font-mono text-[0.65rem] text-gray-500">{rta}</td>
      <td className="px-2 py-1.5 align-top">
        {r.grade ? (
          <span className={`rounded border px-1.5 py-0.5 text-[0.6rem] font-bold uppercase ${gradeTone(r.grade)}`}>
            {r.grade}
          </span>
        ) : (
          <span className="italic text-gray-600">—</span>
        )}
      </td>
      <td className="px-2 py-1.5 align-top">
        <span
          className={`rounded border px-1.5 py-0.5 text-[0.58rem] font-semibold uppercase ${spineStatusTone(r.spine_status)}`}
          title={r.shadowed_by ? `shadowed by ${r.shadowed_by}` : undefined}
        >
          {r.spine_status}
        </span>
      </td>
      <td className="px-2 py-1.5 text-right align-top tabular-nums text-gray-400">{r.bands_count}</td>
      <td className="px-2 py-1.5 text-right align-top tabular-nums text-emerald-400/80">{r.verify_confirmed}</td>
      <td className="px-2 py-1.5 text-center align-top">
        {r.best_citation_url ? (
          <a
            href={r.best_citation_url}
            target="_blank"
            rel="noopener noreferrer"
            title={`${r.best_citation_site ?? 'guide'}${r.best_citation_quarantined ? ' (quarantined)' : ''}`}
            className={r.best_citation_quarantined ? 'text-rose-400 hover:text-rose-300' : 'text-sky-400 hover:text-sky-300'}
          >
            ↗
          </a>
        ) : (
          <span className="text-gray-700">—</span>
        )}
      </td>
    </tr>
  );
}

// ── header cell ─────────────────────────────────────────────────────────────

function Th({
  label,
  k,
  sortKey,
  sortDir,
  onSort,
  align = 'left',
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const active = k === sortKey;
  return (
    <th
      className={`${TH_STICKY} whitespace-nowrap font-mono text-[0.62rem] uppercase text-gray-500 ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      <button
        onClick={() => onSort(k)}
        className={`inline-flex items-center gap-1 hover:text-gray-300 ${active ? 'text-gray-200' : ''}`}
      >
        {label}
        {active && <span>{sortDir === 'asc' ? '▲' : '▼'}</span>}
      </button>
    </th>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  format,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  format?: (v: string) => string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded border border-gray-800 bg-gray-900 px-2 py-1.5 text-xs text-gray-300 focus:border-gray-600 focus:outline-none"
    >
      <option value="">{label}: all</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {format ? format(o) : o}
        </option>
      ))}
    </select>
  );
}

function CenterNote({ text, spin = false, error = false }: { text: string; spin?: boolean; error?: boolean }) {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        {spin && <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />}
        <p className={`font-mono text-sm ${error ? 'text-rose-400' : 'text-gray-500'}`}>{text}</p>
      </div>
    </div>
  );
}

export type { SpineStatus };
