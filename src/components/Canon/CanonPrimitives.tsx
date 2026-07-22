// CanonPrimitives — shared render primitives for the /canon inspection surface.
//
// The governing rule is COMPLETENESS: render EVERY column of EVERY row. These
// primitives are generic so that any column the exporter carries — known or new —
// is displayed, never silently dropped.
//
// HONEST-GAP discipline (adapted from the glance CorpusKit convention): null -> em
// dash; empty string -> "(empty)"; empty array/object -> "none"; a missing table ->
// a labeled absence; quarantined / abstained rows -> visually FLAGGED, never hidden.
// Never a crash on a sparse kit.

import type { JsonValue, CanonRow } from '../../data/canonTypes';

// ── Section shell ───────────────────────────────────────────────────────────

export function Section({
  title,
  index,
  count,
  emptyLabel,
  children,
  accent = 'slate',
}: {
  title: string;
  index?: string;
  count?: number;
  emptyLabel?: string;
  children?: React.ReactNode;
  accent?: 'slate' | 'teal' | 'amber' | 'sky' | 'violet' | 'emerald';
}) {
  const isEmpty = count === 0 || children == null;
  const bar =
    accent === 'teal'
      ? 'border-l-teal-600'
      : accent === 'amber'
        ? 'border-l-amber-600'
        : accent === 'sky'
          ? 'border-l-sky-600'
          : accent === 'violet'
            ? 'border-l-violet-600'
            : accent === 'emerald'
              ? 'border-l-emerald-600'
              : 'border-l-slate-600';
  return (
    <section className={`rounded-lg border border-gray-800 border-l-2 ${bar} bg-gray-900/40`}>
      <div className="flex items-baseline justify-between gap-2 border-b border-gray-800 px-3 py-2">
        <h2 className="text-sm font-semibold text-gray-200">
          {index && <span className="mr-2 font-mono text-[0.65rem] text-gray-600">{index}</span>}
          {title}
        </h2>
        {count != null && (
          <span className="font-mono text-[0.65rem] text-gray-500">
            {count} {count === 1 ? 'row' : 'rows'}
          </span>
        )}
      </div>
      <div className="px-3 py-3">
        {isEmpty ? (
          <p className="text-xs italic text-gray-500">{emptyLabel ?? 'none'}</p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

// ── Value renderer ──────────────────────────────────────────────────────────

/** Faithful renderer for any JSON value: scalars inline, objects/arrays as pretty
 *  JSON in a scrollable block. Long text preserves whitespace. Never invents. */
export function Value({ value, mono = false }: { value: JsonValue | undefined; mono?: boolean }) {
  if (value == null) return <span className="italic text-gray-600">—</span>;
  if (value === '') return <span className="italic text-gray-600">(empty)</span>;
  if (typeof value === 'boolean')
    return <span className="text-xs text-gray-300">{String(value)}</span>;
  if (typeof value === 'number')
    return <span className="text-xs tabular-nums text-gray-300">{value}</span>;
  if (typeof value === 'string') {
    // long/multiline text: preserve whitespace so mech_note / flags / delivery_notes
    // read in FULL (no truncation — completeness is the product).
    return (
      <span
        className={`whitespace-pre-wrap break-words text-xs text-gray-300 ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </span>
    );
  }
  if (Array.isArray(value)) {
    // array of scalars -> chip row; array of objects -> pretty JSON.
    const allScalar = value.every(
      (v) => v == null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean',
    );
    if (allScalar) {
      if (value.length === 0) return <span className="italic text-gray-600">none</span>;
      return (
        <span className="flex flex-wrap gap-1">
          {value.map((v, i) => (
            <span
              key={i}
              className="rounded bg-gray-800 px-1.5 py-0.5 text-[0.65rem] text-gray-300"
            >
              {v == null ? '—' : String(v)}
            </span>
          ))}
        </span>
      );
    }
  }
  // object or array-of-objects
  return (
    <pre className="max-h-96 overflow-auto rounded bg-gray-950/70 p-2 text-[0.68rem] leading-relaxed text-gray-300">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

// ── Key/Value line ──────────────────────────────────────────────────────────

export function KV({
  k,
  v,
  mono = false,
}: {
  k: string;
  v: JsonValue | React.ReactNode;
  mono?: boolean;
}) {
  const isNode = typeof v === 'object' && v !== null && 'props' in (v as object);
  return (
    <div className="flex flex-col gap-0.5 border-b border-gray-800/60 py-1 last:border-0 sm:flex-row sm:gap-2">
      <span className="shrink-0 font-mono text-[0.62rem] uppercase tracking-wide text-gray-500 sm:w-52">
        {k}
      </span>
      <span className="min-w-0 break-words">
        {isNode ? (v as React.ReactNode) : <Value value={v as JsonValue} mono={mono} />}
      </span>
    </div>
  );
}

// ── Full-row dump (EVERY column) ────────────────────────────────────────────

/** Renders a DB row as a dl of every column -> value. `skip` hides columns that
 *  are surfaced elsewhere (e.g. a joined sub-object) but nothing is DROPPED —
 *  skipped keys are rendered by their dedicated component instead. */
export function RowFields({
  row,
  skip = [],
  order,
}: {
  row: CanonRow | null | undefined;
  skip?: string[];
  order?: string[];
}) {
  if (!row) return <p className="text-xs italic text-gray-500">no row</p>;
  const skipSet = new Set(skip);
  const keys = Object.keys(row).filter((k) => !skipSet.has(k));
  // stable, human-friendly order: `order` first (if present), then the rest sorted.
  const ordered: string[] = [];
  if (order) {
    for (const k of order) if (keys.includes(k)) ordered.push(k);
  }
  for (const k of keys.sort()) if (!ordered.includes(k)) ordered.push(k);
  return (
    <div className="space-y-0">
      {ordered.map((k) => (
        <KV key={k} k={k} v={row[k] as JsonValue} />
      ))}
    </div>
  );
}

// ── Remaining-columns tail (completeness guarantee) ─────────────────────────

/** Renders EVERY column of `row` that is NOT in `shown` — the completeness tail
 *  that guarantees a pretty per-row component never silently drops a DB column.
 *  Collapsed by default (dense), but present + expandable. Empty-valued columns
 *  are still listed (honest — an empty column is data too). */
export function RowExtras({
  row,
  shown,
  label = 'other columns',
}: {
  row: CanonRow;
  shown: string[];
  label?: string;
}) {
  const shownSet = new Set(shown);
  const extra = Object.keys(row).filter((k) => !shownSet.has(k));
  if (extra.length === 0) return null;
  return (
    <details className="mt-1.5">
      <summary className="cursor-pointer font-mono text-[0.58rem] uppercase tracking-wide text-gray-600 hover:text-gray-400">
        + {extra.length} {label}
      </summary>
      <div className="mt-1 border-l border-gray-800 pl-2">
        {extra.sort().map((k) => (
          <KV key={k} k={k} v={row[k] as JsonValue} />
        ))}
      </div>
    </details>
  );
}

// ── A table of rows (one row per record; every column a header) ─────────────

/** Renders an array of rows as a horizontally-scrollable table with EVERY column
 *  as a header. `columns` fixes a lead order; any extra columns are appended so
 *  nothing is dropped. */
export function RowTable({
  rows,
  columns,
  emptyLabel = 'none',
}: {
  rows: CanonRow[];
  columns?: string[];
  emptyLabel?: string;
}) {
  if (!rows.length) return <p className="text-xs italic text-gray-500">{emptyLabel}</p>;
  // union of all keys across rows, lead-ordered by `columns`.
  const allKeys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) allKeys.add(k);
  const lead = (columns ?? []).filter((c) => allKeys.has(c));
  const rest = [...allKeys].filter((k) => !lead.includes(k)).sort();
  const cols = [...lead, ...rest];
  return (
    <div className="overflow-x-auto rounded border border-gray-800">
      <table className="min-w-full border-collapse text-[0.68rem]">
        <thead>
          <tr className="bg-gray-900/80">
            {cols.map((c) => (
              <th
                key={c}
                className="whitespace-nowrap border-b border-gray-800 px-2 py-1.5 text-left font-mono font-semibold text-gray-400"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-gray-900/20">
              {cols.map((c) => (
                <td
                  key={c}
                  className="max-w-[22rem] break-words border-b border-gray-800/60 px-2 py-1.5 align-top text-gray-300"
                >
                  <Value value={r[c] as JsonValue} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── External link (build guide / source) ────────────────────────────────────

export function ExternalLink({
  url,
  children,
  className = '',
}: {
  url: string | null | undefined;
  children?: React.ReactNode;
  className?: string;
}) {
  if (!url) return <span className="italic text-gray-600">no url</span>;
  let label = url;
  if (!children) {
    try {
      const u = new URL(url);
      label = u.host + u.pathname;
    } catch {
      /* keep raw */
    }
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`break-all text-sky-400 underline underline-offset-2 hover:text-sky-300 ${className}`}
    >
      {children ?? label}
    </a>
  );
}

// ── Anchor quote ────────────────────────────────────────────────────────────

export function AnchorQuote({ quote }: { quote: JsonValue | undefined }) {
  if (!quote || typeof quote !== 'string') return null;
  return (
    <blockquote className="mt-1 border-l-2 border-gray-700 pl-2 text-[0.7rem] italic text-gray-400">
      &ldquo;{quote}&rdquo;
    </blockquote>
  );
}
