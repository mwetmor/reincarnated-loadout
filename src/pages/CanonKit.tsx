// CanonKit — /canon/:kitId route.
//
// The FULL per-kit "as the battle sim sees them" detail page. Renders EVERY column
// of EVERY joined row for one canonical KIT record, in the sim-view-first section
// order (per spec). Nothing is dropped; sparse kits render honest labeled gaps, never
// a crash. Quarantined citations + abstained dossier rows render VISUALLY FLAGGED.
//
// Source: public/canon-data/kits/<kitId>.json (lazy-fetched; exported READ-ONLY from
// corpus.db by scripts/export_canon_corpus.py).

import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCanonKit } from '../hooks/useCanonData';
import {
  displayGame,
  gradeTone,
  verdictTone,
  spineStatusTone,
} from '../data/canonTypes';
import type { CanonRow, JsonValue, CanonKitDetail } from '../data/canonTypes';
import {
  Section,
  KV,
  Value,
  RowFields,
  RowTable,
  RowExtras,
  ExternalLink,
  AnchorQuote,
} from '../components/Canon/CanonPrimitives';
import { isEmptyValue } from '../components/Canon/canonHelpers';

const GLANCE_CORPUS_BASE = 'https://reincarnated-glance.vercel.app/#/corpus/';

// Pick the best build-guide citation for the prominent header button:
// prefer a non-quarantined maxroll.gg; else non-quarantined rank-1/attested; else
// first non-quarantined; else the exporter's best_citation (may be quarantined).
function headerCitation(kit: CanonKitDetail): CanonRow | null {
  const cites = kit.citations ?? [];
  const nonQ = cites.filter((c) => !c.quarantined);
  const maxroll = nonQ.find((c) => String(c.site ?? '').toLowerCase() === 'maxroll.gg');
  if (maxroll) return maxroll;
  const ranked = nonQ.find((c) => {
    const rc = String(c.rank_class ?? '').toLowerCase();
    return rc.includes('rank-1') || rc === 'attested' || rc === 'attested-era' || rc === 'primary';
  });
  if (ranked) return ranked;
  if (nonQ.length) return nonQ[0];
  return kit.best_citation ?? (cites.length ? cites[0] : null);
}

export function CanonKit() {
  const { kitId } = useParams<{ kitId: string }>();
  const { kit, status, error } = useCanonKit(kitId);

  const title = useMemo(
    () => (kit?.spine?.folk_name as string | undefined) ?? kitId ?? '',
    [kit, kitId],
  );

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          <p className="font-mono text-sm text-gray-500">Loading kit…</p>
        </div>
      </div>
    );
  }

  if (status === 'error' || !kit) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <BackLink />
        <div className="mt-4 rounded-lg border border-rose-800/50 bg-rose-950/20 p-6 text-sm text-rose-300">
          <p className="font-semibold">Kit &ldquo;{kitId}&rdquo; not found.</p>
          <p className="mt-1 font-mono text-xs text-rose-400/80">{error ?? 'no such per-kit file'}</p>
          <p className="mt-3 text-xs text-gray-500">
            Per-kit files are staged at build time (public/canon-data/kits/&lt;kit_id&gt;.json). Check the
            id, or return to the canon index.
          </p>
        </div>
      </div>
    );
  }

  const spine = kit.spine;
  const ss = kit.spine_status;
  const cite = headerCitation(kit);
  const mapping = kit.mapping;
  const mappingJson = (mapping?.mapping_json ?? null) as CanonRow | string | null;

  return (
    <div className="mx-auto max-w-[1100px] space-y-4 px-3 py-6 sm:px-6">
      <BackLink />

      {/* ── 1 · HEADER ───────────────────────────────────────────────────── */}
      <div className="space-y-3 rounded-lg border border-gray-800 bg-gray-900/40 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-bold text-gray-100">{title}</h1>
          <span className="font-mono text-xs text-gray-500">{kit.kit_id}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip>{displayGame(spine.game as string)}</Chip>
          {spine.tier != null && <Chip>tier {String(spine.tier)}</Chip>}
          {spine.canon_tier != null && <Chip>canon {String(spine.canon_tier)}</Chip>}
          {mapping?.grade != null && (
            <span className={`rounded border px-2 py-0.5 text-[0.68rem] font-bold uppercase ${gradeTone(String(mapping.grade))}`}>
              {String(mapping.grade)}
            </span>
          )}
          {mapping?.terminal_state != null && <Chip>{String(mapping.terminal_state)}</Chip>}
          {spine.court != null && <Chip>court: {String(spine.court)}</Chip>}
          {(spine.original_element ?? spine.elem_raw) != null && (
            <Chip>elem: {String(spine.original_element ?? spine.elem_raw)}</Chip>
          )}
          {spine.eras != null && <Chip>eras: {String(spine.eras)}</Chip>}
          {spine.era_year != null && <Chip>{String(spine.era_year)}</Chip>}
          <span
            className={`rounded border px-2 py-0.5 text-[0.68rem] font-semibold uppercase ${spineStatusTone(ss.spine_status)}`}
            title={ss.shadowed_by ? `shadowed by ${ss.shadowed_by}` : undefined}
          >
            spine: {ss.spine_status}
            {ss.shadowed_by ? ` (by ${ss.shadowed_by})` : ''}
          </span>
        </div>

        {/* spine-status explainer — which frame the sim actually fights */}
        <p className="text-[0.7rem] leading-relaxed text-gray-500">
          {ss.spine_status === 'ACTIVE' &&
            'ACTIVE — on the Tier-3 spine and not shadowed; this is a kit the sim actually fights.'}
          {ss.spine_status === 'SHADOWED' &&
            `SHADOWED — present but represented by ${ss.shadowed_by ?? 'another kit'} on the spine.`}
          {ss.spine_status === 'OFF-SPINE' && 'OFF-SPINE — not on the Tier-3 fight spine.'}
          {ss.spine_status === 'UNPLACED' &&
            'UNPLACED — not present in the tier-3 family-membership sidecar (spine membership undetermined).'}
          {ss.family ? ` · family: ${ss.family}` : ''}
          {ss.tier ? ` · membership tier: ${ss.tier}` : ''}
        </p>

        {/* actions: build guide + glance harvest view */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {cite ? (
            <a
              href={String(cite.url)}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold ${
                cite.quarantined
                  ? 'bg-rose-900/40 text-rose-200 hover:bg-rose-900/60'
                  : 'bg-sky-700 text-white hover:bg-sky-600'
              }`}
            >
              Build guide ↗
              <span className="font-normal opacity-80">
                {String(cite.site ?? 'guide')}
                {cite.quarantined ? ' (quarantined)' : ''}
              </span>
            </a>
          ) : (
            <span className="rounded bg-gray-800 px-3 py-1.5 text-xs italic text-gray-500">
              no build-guide citation recorded
            </span>
          )}
          <a
            href={`${GLANCE_CORPUS_BASE}${encodeURIComponent(kit.kit_id)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800"
          >
            harvest / verification view ↗
            <span className="font-normal text-gray-500">glance</span>
          </a>
        </div>
      </div>

      {/* density header */}
      <DensityHeader counts={kit._row_counts} />

      {/* ── 2 · SIM COORDINATES ──────────────────────────────────────────── */}
      <Section title="Sim coordinates" index="2" accent="teal">
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <AxisPair label="attr (engagement)" val={spine.attr_val} conf={spine.attr_conf} />
            <AxisPair label="range (engagement range)" val={spine.range_val} conf={spine.range_conf} />
            <AxisPair label="tempo (damage tempo)" val={spine.tempo_val} conf={spine.tempo_conf} />
            <AxisPair label="amp (amplitude var.)" val={spine.amp_val} conf={spine.amp_conf} />
            <AxisPair label="proxy (proxy density)" val={spine.proxy_val} conf={spine.proxy_conf} />
            <AxisPair label="commit (commitment)" val={spine.commit_val} conf={spine.commit_conf} />
          </div>
          <div className="space-y-0 border-t border-gray-800 pt-2">
            <KV k="avg_conf" v={spine.avg_conf} />
            <KV k="lattice_coord" v={spine.lattice_coord} mono />
            <KV k="atlas_key_orig" v={spine.atlas_key_orig} mono />
            <KV k="mobile_cell_id" v={spine.mobile_cell_id} mono />
            <KV k="mobile_key_group" v={spine.mobile_key_group} mono />
            <KV k="mobile_rank_in_cell" v={spine.mobile_rank_in_cell} />
            <KV k="mobile_representative" v={spine.mobile_representative} />
            <KV k="prefix_conf_provenance" v={spine.prefix_conf_provenance} />
            <KV k="commit_provenance" v={spine.commit_provenance} />
          </div>
          <AtlasCoords spine={spine} />
        </div>
      </Section>

      {/* ── 3 · ENGINE KEY (full row) ────────────────────────────────────── */}
      <Section title="Engine key" index="3" accent="teal" emptyLabel="no canon_engine_key row">
        {kit.engine_key ? <RowFields row={kit.engine_key} order={ENGINE_KEY_ORDER} /> : null}
      </Section>

      {/* ── 4 · SKILLS & GEOMETRY ────────────────────────────────────────── */}
      <Section title="Skills & geometry" index="4" accent="sky">
        <div className="space-y-4">
          {/* core_skills */}
          <div>
            <SubHead>core_skills</SubHead>
            <Value value={spine.core_skills as JsonValue} />
            {spine.core_skills_prov != null && (
              <p className="mt-1 text-[0.62rem] text-gray-600">
                provenance: <Value value={spine.core_skills_prov as JsonValue} />
              </p>
            )}
          </div>

          {/* mapping row meta (grade/terminal/provenance/authored) — complete */}
          {mapping && (
            <div>
              <SubHead>mapping row (kit_mapping)</SubHead>
              <RowFields
                row={mapping}
                skip={['mapping_json']}
                order={['grade', 'terminal_state', 'mapping_provenance', 'deviation_notes', 'authored_date']}
              />
            </div>
          )}

          {/* mapping_json.skills — every field per skill */}
          <div>
            <SubHead>mapping skills (mapping_json.skills)</SubHead>
            <MappingSkills mj={mappingJson} />
          </div>

          {/* skill_geometry_band table — every column */}
          <div>
            <SubHead>
              skill geometry bands (VDM-2){' '}
              <span className="font-normal text-gray-600">· {kit.geometry_bands.length}</span>
            </SubHead>
            {kit.geometry_bands.length > 0 ? (
              <RowTable rows={kit.geometry_bands} columns={GEOMETRY_BAND_ORDER} />
            ) : (
              <p className="text-xs italic text-gray-500">no geometry bands yet (honest gap)</p>
            )}
          </div>

          {/* mapping structural fields */}
          {typeof mappingJson === 'object' && mappingJson !== null && (
            <div>
              <SubHead>mapping structure</SubHead>
              <div className="space-y-2">
                <KV k="motion_frame" v={mappingJson.motion_frame as JsonValue} />
                <KV k="resource_economy" v={mappingJson.resource_economy as JsonValue} />
                <KV k="trigger_grammar" v={mappingJson.trigger_grammar as JsonValue} />
                <KV k="t4_doors" v={mappingJson.t4_doors as JsonValue} />
                <KV k="scaffold" v={mappingJson.scaffold as JsonValue} />
                <KV k="option_c_substrate_flags" v={mappingJson.option_c_substrate_flags as JsonValue} />
                <KV k="fidelity_notes" v={mappingJson.fidelity_notes as JsonValue} />
              </div>
            </div>
          )}
          {typeof mappingJson === 'string' && (
            <div>
              <SubHead>mapping_json (unparsed — kept verbatim)</SubHead>
              <Value value={mappingJson} mono />
            </div>
          )}

          {/* kit_delta_t4 */}
          <div>
            <SubHead>T4 delta (kit_delta_t4)</SubHead>
            {kit.delta_t4 ? <RowFields row={kit.delta_t4} order={['shape', 'asserts_json', 'shape_signoff']} /> : (
              <p className="text-xs italic text-gray-500">no kit_delta_t4 row</p>
            )}
          </div>
        </div>
      </Section>

      {/* ── 5 · BEHAVIOR & IDENTITY NOTES ────────────────────────────────── */}
      <Section title="Behavior & identity notes" index="5" accent="amber">
        <div className="space-y-0">
          <KV k="mech_note" v={spine.mech_note} />
          <KV k="flags" v={spine.flags} />
          <KV k="mob_raw" v={spine.mob_raw} />
          <KV k="geo_raw" v={spine.geo_raw} />
          <KV k="ctrl_raw" v={spine.ctrl_raw} />
          <KV k="def_raw" v={spine.def_raw} />
          <KV k="econ_raw" v={spine.econ_raw} />
          <KV k="elem_raw" v={spine.elem_raw} />
          <KV k="mobile_mechanics_status" v={spine.mobile_mechanics_status} />
          <KV k="mobile_blocking_mechanics" v={spine.mobile_blocking_mechanics} />
          <KV k="grain" v={spine.grain} />
          <KV k="grain_note" v={spine.grain_note} />
          <KV k="architecture" v={spine.architecture} />
          <KV k="death_class" v={spine.death_class} />
          <KV k="negative" v={spine.negative} />
          <KV k="lineage" v={spine.lineage} />
          <KV k="gx" v={spine.gx} />
          <KV k="stabilization_patch" v={spine.stabilization_patch} />
          <KV k="skill_debut_year" v={spine.skill_debut_year} />
        </div>
      </Section>

      {/* ── 6 · RECOGNITION HOOKS ────────────────────────────────────────── */}
      <Section
        title="Recognition hooks"
        index="6"
        accent="violet"
        count={kit.recognition_hooks.length}
        emptyLabel="no recognition hooks (honest gap)"
      >
        {kit.recognition_hooks.length > 0 && (
          <RowTable
            rows={kit.recognition_hooks}
            columns={['rank', 'hook_type', 'hook_text', 'expressed_by', 'provenance', 'coverage_status']}
          />
        )}
      </Section>

      {/* ── 7 · ACCEPTANCE ASSERTS ───────────────────────────────────────── */}
      <Section
        title="Acceptance asserts"
        index="7"
        accent="emerald"
        count={kit.acceptance_asserts.length}
        emptyLabel="no acceptance asserts"
      >
        {kit.acceptance_asserts.length > 0 && (
          <RowTable
            rows={kit.acceptance_asserts}
            columns={['assert_id', 'assert_text', 'hook_id', 'expected_state', 'last_result', 'routed_docket_id']}
          />
        )}
      </Section>

      {/* ── 8 · DEVIATIONS & DOCKETS ─────────────────────────────────────── */}
      <Section
        title="Deviations & dockets"
        index="8"
        accent="amber"
        count={kit.deviations.length}
        emptyLabel="no deviations recorded"
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {mapping?.grade != null && (
              <span className={`rounded border px-1.5 py-0.5 text-[0.6rem] font-bold uppercase ${gradeTone(String(mapping.grade))}`}>
                grade {String(mapping.grade)}
              </span>
            )}
            {mapping?.deviation_notes != null && !isEmptyValue(mapping.deviation_notes) && (
              <span className="text-[0.7rem] text-gray-400">
                notes: <Value value={mapping.deviation_notes as JsonValue} />
              </span>
            )}
          </div>
          {kit.deviations.map((dev, i) => (
            <div key={i} className="rounded border border-gray-800 bg-gray-950/40 p-2">
              <RowFields
                row={dev}
                skip={['docket']}
                order={['deviation_id', 'deviation_class', 'missing_expression', 'hook_refs', 'proposed_fix_type', 'proposed_fix_target', 'docket_id', 'source_anchor']}
              />
              {dev.docket && (
                <div className="mt-2 rounded border border-amber-900/40 bg-amber-950/10 p-2">
                  <SubHead>joined docket (mechanic_gap_docket)</SubHead>
                  <RowFields
                    row={dev.docket}
                    order={['docket_id', 'mechanism_class', 'spec_text_or_path', 'status', 'disposition', 'destination', 'docket_family']}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* ── 9 · COMMUNITY BUILD GUIDES ───────────────────────────────────── */}
      <Section
        title="Community build guides"
        index="9"
        accent="sky"
        count={kit.citations.length}
        emptyLabel="no citations recorded"
      >
        {kit.citations.length > 0 && (
          <div className="space-y-2">
            {(() => {
              const q = kit.citations.filter((c) => c.quarantined).length;
              return q > 0 ? (
                <p className="text-[0.65rem] text-rose-400/80">
                  {q} quarantined (recorded but not authoritative — flagged below, never hidden)
                </p>
              ) : null;
            })()}
            {kit.citations.map((c, i) => (
              <CitationRow key={i} c={c} />
            ))}
          </div>
        )}
      </Section>

      {/* ── 10 · VERIFICATION LEDGER ─────────────────────────────────────── */}
      <Section
        title="Verification ledger"
        index="10"
        accent="emerald"
        count={kit.verify_ledger.length}
        emptyLabel="no verify claims recorded"
      >
        {kit.verify_ledger.length > 0 && (
          <div className="space-y-2">
            {kit.verify_ledger.map((v, i) => (
              <VerifyRow key={i} v={v} />
            ))}
          </div>
        )}
      </Section>

      {/* ── 11 · DOSSIER ─────────────────────────────────────────────────── */}
      <Section
        title="Dossier"
        index="11"
        accent="teal"
        count={kit.dossier.length}
        emptyLabel="no dossier rows recorded"
      >
        {kit.dossier.length > 0 && (
          <div className="space-y-2">
            {kit.dossier.map((d, i) => (
              <DossierRow key={i} d={d} />
            ))}
          </div>
        )}
      </Section>

      {/* ── 12 · PROBE FACTS ─────────────────────────────────────────────── */}
      <Section
        title="Probe facts"
        index="12"
        accent="violet"
        count={kit.probe_facts.length}
        emptyLabel="no probe facts (237/267 kits have them — honest gap)"
      >
        {kit.probe_facts.length > 0 && (
          <div className="space-y-2">
            {kit.probe_facts.map((p, i) => (
              <div key={i} className="rounded border border-gray-800 bg-gray-950/40 p-2">
                <RowFields row={p} order={['family', 'facts_json', 'conf', 'prov']} />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── 13 · PROVENANCE & EXPORT STAMP ───────────────────────────────── */}
      <Section title="Provenance & export stamp" index="13" accent="slate">
        <div className="space-y-0">
          <KV k="provenance_tag" v={spine.provenance_tag} />
          <KV k="source" v={spine.source} />
          <KV k="source_date" v={spine.source_date} />
          <KV k="prov" v={spine.prov} />
          <KV k="core_skills_prov" v={spine.core_skills_prov} />
          <KV k="source_urls" v={spine.source_urls} />
          <KV k="mint" v={spine.mint} />
          <KV k="key_completeness" v={spine.key_completeness} />
          <KV k="suffix_rekey_status" v={spine.suffix_rekey_status} />
          <KV k="spine sidecar family" v={ss.family} />
          <KV k="spine sidecar tier" v={ss.tier} />
          <KV k="spine sidecar source_artifact" v={ss.source_artifact} />
        </div>
      </Section>

      {/* full-spine escape hatch — literally EVERY remaining canon_corpus column,
          so no field can be missed even if not called out above. */}
      <Section title="All spine columns (complete canon_corpus row)" index="+" accent="slate">
        <RowFields row={spine} skip={['atlas_coords_parsed']} />
      </Section>

      <BackLink />
    </div>
  );
}

// ── sub-components ────────────────────────────────────────────────────────

const ENGINE_KEY_ORDER = [
  'geometry_value', 'geometry_rule_fired', 'geometry_conf',
  'ctrl_treatment', 'ctrl_ailments_mapped', 'ctrl_ailment_gaps',
  'def_bin', 'def_riders', 'def_conf',
  'econ_status', 'econ_gaps', 'econ_meter_type',
  'mob_skill_is_movement', 'mob_policy_while_casting', 'mob_verbs',
  'delivery_value', 'ctrl_function', 'economy_model', 'activation_val',
  'dependency_val', 'resource_verbatim', 'cell_key', 'row_class', 'route',
];

const GEOMETRY_BAND_ORDER = [
  'skill_ordinal', 'source_skill', 'delivery_class', 'origin',
  'width_band', 'range_band', 'speed_band', 'pierce', 'chain', 'fork',
  'count_per_cast', 'count_multiplier_x', 'count_multiplier_source',
  'cadence_class', 'motion_signature', 'band_conf', 'derivation', 'source_anchor',
];

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-gray-800 px-2 py-0.5 text-[0.68rem] text-gray-300">{children}</span>
  );
}

function SubHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 font-mono text-[0.62rem] uppercase tracking-wide text-gray-500">
      {children}
    </div>
  );
}

function AxisPair({ label, val, conf }: { label: string; val: JsonValue | undefined; conf: JsonValue | undefined }) {
  return (
    <div className="flex items-baseline gap-2 border-b border-gray-800/60 py-1">
      <span className="shrink-0 font-mono text-[0.62rem] uppercase tracking-wide text-gray-500 sm:w-40">
        {label}
      </span>
      <span className="text-xs font-semibold text-gray-200">
        {val == null || val === '' ? <span className="italic text-gray-600">—</span> : String(val)}
      </span>
      <span className="ml-auto font-mono text-[0.6rem] text-gray-500">
        conf {conf == null || conf === '' ? '—' : String(conf)}
      </span>
    </div>
  );
}

function AtlasCoords({ spine }: { spine: CanonKitDetail['spine'] }) {
  const parsed = spine.atlas_coords_parsed;
  return (
    <div className="border-t border-gray-800 pt-2">
      <SubHead>atlas_coords (14-slot positional model)</SubHead>
      {!parsed ? (
        <p className="text-xs italic text-gray-500">
          no atlas_coords for this kit (honest gap — not placed in the 14-slot model)
        </p>
      ) : (
        <>
          {parsed.slot_count !== parsed.expected_slots && (
            <p className="mb-1 text-[0.65rem] text-amber-400">
              slot-count drift: {parsed.slot_count} (expected {parsed.expected_slots}) — labels shown positionally
            </p>
          )}
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 sm:grid-cols-3">
            {parsed.slots.map((s) => (
              <div key={s.index} className="flex items-baseline gap-1.5 border-b border-gray-800/40 py-0.5">
                <span className="font-mono text-[0.55rem] text-gray-600">{s.index}</span>
                <span className="min-w-0 truncate text-[0.6rem] text-gray-500" title={s.label}>
                  {s.label}
                </span>
                <span className="ml-auto text-[0.68rem] font-medium text-gray-300">{s.value}</span>
              </div>
            ))}
          </div>
          <p className="mt-1 break-all font-mono text-[0.58rem] text-gray-600">raw: {parsed.raw}</p>
        </>
      )}
    </div>
  );
}

function MappingSkills({ mj }: { mj: CanonRow | string | null }) {
  if (mj == null) return <p className="text-xs italic text-gray-500">no mapping row</p>;
  if (typeof mj === 'string') return <Value value={mj} mono />;
  const skills = (mj.skills as CanonRow[] | undefined) ?? [];
  if (!skills.length) return <p className="text-xs italic text-gray-500">no skills in mapping_json</p>;
  return (
    <div className="space-y-2">
      {skills.map((s, i) => (
        <div key={i} className="rounded border border-gray-800 bg-gray-950/40 p-2">
          <RowFields row={s} order={['source_skill', 'geometry_value', 'element_primary', 'element_secondary', 'ailments', 'delivery_notes']} />
        </div>
      ))}
    </div>
  );
}

function DensityHeader({ counts }: { counts: Record<string, number> }) {
  const cells: { label: string; key: string }[] = [
    { label: 'geometry bands', key: 'geometry_bands' },
    { label: 'hooks', key: 'recognition_hooks' },
    { label: 'asserts', key: 'acceptance_asserts' },
    { label: 'deviations', key: 'deviations' },
    { label: 'citations', key: 'citations' },
    { label: 'verify', key: 'verify_ledger' },
    { label: 'dossier', key: 'dossier' },
    { label: 'probe', key: 'probe_facts' },
  ];
  return (
    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
      {cells.map((c) => {
        const n = counts[c.key] ?? 0;
        return (
          <div
            key={c.key}
            className={`rounded-lg border p-2 text-center ${
              n > 0 ? 'border-gray-700 bg-gray-900/60' : 'border-gray-800 bg-gray-900/20'
            }`}
          >
            <div className={`text-base font-bold tabular-nums ${n > 0 ? 'text-gray-100' : 'text-gray-600'}`}>
              {n}
            </div>
            <div className="text-[0.55rem] leading-tight text-gray-500">{c.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function CitationRow({ c }: { c: CanonRow }) {
  const q = !!c.quarantined;
  return (
    <div className={`rounded border p-2 ${q ? 'border-rose-800/60 bg-rose-950/20' : 'border-gray-800 bg-gray-950/40'}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        {q && (
          <span className="rounded bg-rose-900/50 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase text-rose-300">
            quarantined
          </span>
        )}
        {c.cite_class != null && <MiniTag>{String(c.cite_class)}</MiniTag>}
        {c.rank_class != null && <MiniTag muted>{String(c.rank_class)}</MiniTag>}
        {c.site != null && <span className="text-[0.65rem] text-gray-500">{String(c.site)}</span>}
        {c.author_handle != null && <span className="text-[0.62rem] text-gray-500">@{String(c.author_handle)}</span>}
      </div>
      {c.title != null && <div className="mt-1 text-xs text-gray-300">{String(c.title)}</div>}
      <div className="mt-0.5 flex flex-wrap items-center gap-2">
        <ExternalLink url={c.url as string | null} className="font-mono text-[0.68rem]" />
        {c.archive_url != null && c.archive_url !== '' && (
          <a
            href={String(c.archive_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.62rem] text-gray-500 hover:text-gray-300"
          >
            (archive)
          </a>
        )}
      </div>
      <RowExtras
        row={c}
        shown={['id', 'kit_id', 'url', 'archive_url', 'site', 'author_handle', 'title', 'cite_class', 'rank_class', 'quarantined']}
      />
    </div>
  );
}

function VerifyRow({ v }: { v: CanonRow }) {
  return (
    <div className="rounded border border-gray-800 bg-gray-950/40 p-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`rounded border px-1.5 py-0.5 text-[0.6rem] font-bold uppercase ${verdictTone(String(v.verdict ?? ''))}`}>
          {String(v.verdict ?? '—')}
        </span>
        {v.claim_family != null && <MiniTag>{String(v.claim_family)}</MiniTag>}
        {v.run_tag != null && <span className="text-[0.6rem] text-gray-500">{String(v.run_tag)}</span>}
      </div>
      {v.claim_text != null && <p className="mt-1 text-[0.72rem] text-gray-300">{String(v.claim_text)}</p>}
      {v.anchor_quote != null && v.anchor_quote !== '' ? (
        <AnchorQuote quote={v.anchor_quote as JsonValue} />
      ) : (
        <p className="mt-1 text-[0.66rem] italic text-gray-600">no anchor quote</p>
      )}
      {v.source_url != null && v.source_url !== '' && (
        <div className="mt-1">
          <ExternalLink url={v.source_url as string} className="font-mono text-[0.66rem]" />
        </div>
      )}
      <RowExtras
        row={v}
        shown={['id', 'kit_id', 'verdict', 'claim_family', 'run_tag', 'claim_text', 'anchor_quote', 'source_url']}
      />
    </div>
  );
}

function DossierRow({ d }: { d: CanonRow }) {
  const abstained = !!d.abstained;
  return (
    <div className={`rounded border p-2 ${abstained ? 'border-dashed border-gray-700 bg-gray-950/30' : 'border-gray-800 bg-gray-950/40'}`}>
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        {d.family != null && <MiniTag>{String(d.family)}</MiniTag>}
        {abstained && (
          <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase text-gray-400">
            abstained — source silent
          </span>
        )}
        {d.conf != null && <span className="text-[0.6rem] text-gray-500">conf {String(d.conf)}</span>}
        {d.source_url != null && d.source_url !== '' && <ExternalLink url={d.source_url as string} className="font-mono text-[0.62rem]" />}
      </div>
      {!abstained && <Value value={d.payload_json as JsonValue} />}
      <AnchorQuote quote={d.anchor_quote as JsonValue} />
      <RowExtras
        row={d}
        shown={['id', 'kit_id', 'family', 'payload_json', 'source_url', 'anchor_quote', 'abstained', 'conf']}
      />
    </div>
  );
}

function MiniTag({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span className={`rounded bg-gray-800 px-1.5 py-0.5 text-[0.6rem] ${muted ? 'text-gray-400' : 'text-gray-300'}`}>
      {children}
    </span>
  );
}

function BackLink() {
  return (
    <Link to="/canon" className="inline-block text-xs text-sky-400 hover:text-sky-300">
      ← canon index
    </Link>
  );
}
