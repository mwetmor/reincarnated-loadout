// EngineStateBackwardTrace — 8-step backward journey for a single shipped kit
// Default: highest-cohesion shipped kit per season (from phase7_kit_verdicts.json)
// Drop-down: select alternate shipped kit
// Phase 2 data (phase2_kit_candidates.json) lazy-loaded only when this component renders.
// Phase α: status surface only. No Phase β/γ triggers.

import { useState, useEffect, useCallback } from 'react';
import type {
  SeasonId,
  Phase7KitVerdictsFile,
  Phase5FactionClustersFile,
  WaveBIdentitiesFile,
  Phase4ArchiveFile,
  Phase2Kit,
  Phase2KitCandidatesFile,
} from '../../data/engineStateTypes';

interface Props {
  seasonSlug: SeasonId;
  phase7Verdicts: Phase7KitVerdictsFile;
  clusters: Phase5FactionClustersFile;
  waveBIdentities: WaveBIdentitiesFile;
  phase4: Phase4ArchiveFile;
}

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

const PHASE_COLORS_CIRCLE: Record<number, string> = {
  0: 'bg-violet-600',
  1: 'bg-blue-600',
  2: 'bg-teal-600',
  3: 'bg-orange-600',
  4: 'bg-green-600',
  5: 'bg-fuchsia-600',
  6: 'bg-slate-400',
  7: 'bg-amber-500',
};

function StepIcon({ phase }: { phase: number }) {
  const bg = PHASE_COLORS_CIRCLE[phase] ?? 'bg-gray-500';
  return (
    <div className={`w-12 h-12 flex-shrink-0 rounded-full ${bg} flex items-center justify-center text-white font-bold text-base`}>
      {phase}
    </div>
  );
}

function TraceStep({
  phase,
  phaseLabel,
  title,
  children,
}: {
  phase: number;
  phaseLabel: string;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-4 py-4 border-b border-white/10 last:border-0" style={{ gridTemplateColumns: '60px 1fr' }}>
      <StepIcon phase={phase} />
      <div className="pt-1">
        <p className="text-[9px] font-mono uppercase tracking-widest text-white/50 mb-0.5">{phaseLabel}</p>
        <h4 className="text-sm font-bold text-white mb-1 leading-snug">{title}</h4>
        {children}
      </div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="text-[10px] text-white/50 font-mono">{label}</dt>
      <dd className="text-sm text-white/90 font-mono">{value}</dd>
    </>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-white/10 text-white/90 text-[11px] font-mono rounded px-1.5 py-0.5">
      {children}
    </code>
  );
}

export function EngineStateBackwardTrace({
  seasonSlug,
  phase7Verdicts,
  clusters,
  waveBIdentities,
  phase4,
}: Props) {
  // Get all shipped kits sorted by cohesion score desc
  const shippedKits = phase7Verdicts.kit_verdicts
    .filter((v) => v.verdict === 'SHIPPED-WORTHY')
    .sort((a, b) => {
      const bScore = b.kit_cohesion_score ?? -1;
      const aScore = a.kit_cohesion_score ?? -1;
      return bScore - aScore;
    });

  const defaultKitId = phase7Verdicts.highest_cohesion_kit_id ?? shippedKits[0]?.kit_id ?? null;
  const [selectedKitId, setSelectedKitId] = useState<string | null>(defaultKitId);

  // Reset selected kit when season changes
  useEffect(() => {
    setSelectedKitId(phase7Verdicts.highest_cohesion_kit_id ?? shippedKits[0]?.kit_id ?? null);
  }, [seasonSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lazy-load phase2_kit_candidates.json
  const [phase2LoadState, setPhase2LoadState] = useState<LoadState>('idle');
  const [phase2Kit, setPhase2Kit] = useState<Phase2Kit | null>(null);

  const loadPhase2Data = useCallback(
    async (kitId: string) => {
      setPhase2LoadState('loading');
      setPhase2Kit(null);
      try {
        const res = await fetch(`/engine-state/${seasonSlug}/phase2_kit_candidates.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Phase2KitCandidatesFile;
        const found = data.kits.find(
          (k) => k.character_id === kitId || k.bc_cell_id === kitId.replace(/_s\d+$/, '')
        );
        setPhase2Kit(found ?? null);
        setPhase2LoadState('loaded');
      } catch (err) {
        console.error('phase2_kit_candidates load error:', err);
        setPhase2LoadState('error');
      }
    },
    [seasonSlug]
  );

  // Load phase2 when kit selection changes
  useEffect(() => {
    if (!selectedKitId) return;
    loadPhase2Data(selectedKitId);
  }, [selectedKitId, loadPhase2Data]);

  if (!selectedKitId || shippedKits.length === 0) {
    return (
      <section className="my-8">
        <div className="rounded-xl bg-gray-900 text-white p-8 text-center text-sm text-white/50">
          No shipped kits found for this season.
        </div>
      </section>
    );
  }

  const verdict = phase7Verdicts.kit_verdicts.find((v) => v.kit_id === selectedKitId);
  const waveB = waveBIdentities.kits.find((k) => k.kit_id === selectedKitId);
  const cluster = clusters.clusters.find(
    (c) => String(c.cluster_id) === String(verdict?.cluster_id ?? '')
  );
  const phase4Result = phase4.insertion_results.find((r) => r.kit_id === selectedKitId);

  return (
    <section className="my-8">
      <div className="rounded-xl bg-gray-900 p-6 sm:p-8">
        {/* Section header */}
        <div className="flex items-baseline gap-3 mb-1">
          <span className="text-xs font-mono text-white/40 uppercase tracking-widest">§ 4</span>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Backward Trace — one character's full journey
          </h2>
        </div>
        <p className="text-sm text-white/60 mb-5 max-w-[70ch]">
          Following a single shipped kit from its final player-facing identity back through every phase to its RNG-seeded origin.
          The 8-step journey from Phase 0 seed to Phase 7 ship.
        </p>

        {/* Kit selector */}
        <div className="mb-6">
          <label className="block text-[10px] font-mono uppercase tracking-wide text-white/50 mb-1">
            Kit ({shippedKits.length} shipped)
          </label>
          <select
            value={selectedKitId}
            onChange={(e) => setSelectedKitId(e.target.value)}
            className="w-full max-w-xl bg-white/10 border border-white/20 rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-white/40"
          >
            {shippedKits.map((k) => {
              const wb = waveBIdentities.kits.find((w) => w.kit_id === k.kit_id);
              const label = wb?.kit_name_canonical
                ? `${wb.kit_name_canonical} (${k.kit_id})`
                : k.kit_id;
              return (
                <option key={k.kit_id} value={k.kit_id} className="bg-gray-900 text-white">
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        {/* Character card */}
        {waveB && (
          <div className="bg-white/7 border border-white/15 rounded-lg p-4 mb-6">
            <h3 className="text-xl font-bold text-orange-400 tracking-tight mb-1">
              {waveB.kit_name_canonical}
            </h3>
            <p className="text-xs text-white/70 mb-3 font-mono">
              Kit <InlineCode>{waveB.kit_id}</InlineCode>
              {cluster && <> · {cluster.faction_label_canonical}</>}
              · Verdict:{' '}
              <span className="inline-block bg-green-700 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded tracking-wide">
                SHIPPED-WORTHY
              </span>
            </p>
            <p className="text-sm text-white/80 italic border-l-2 border-orange-400 pl-3 leading-relaxed">
              {waveB.kit_identity_narrative}
            </p>
          </div>
        )}

        {/* Trace timeline */}
        <div>
          {/* Step 0 — Seed */}
          <TraceStep phase={0} phaseLabel="Phase 0 — Seed" title="Deterministic origin">
            <p className="text-xs text-white/80 leading-relaxed">
              Season seed + per-kit <InlineCode>substrate_sample_idx</InlineCode> together determine every downstream choice.
              Re-running with same seed reproduces this exact kit.
            </p>
            <dl className="grid gap-x-4 mt-2 text-xs" style={{ gridTemplateColumns: '130px 1fr' }}>
              <KV label="season_id" value={<InlineCode>{selectedKitId.split('_')[0] ?? 'S1'}</InlineCode>} />
            </dl>
          </TraceStep>

          {/* Step 1 — BC Cell */}
          {phase2Kit ? (
            <TraceStep
              phase={1}
              phaseLabel="Phase 1 — BC Cell Discovery"
              title={<>Cell <InlineCode>{phase2Kit.bc_cell_id}</InlineCode></>}
            >
              <p className="text-xs text-white/80 mb-2 leading-relaxed">
                The 5-tuple defines the kit's mechanical signature:
              </p>
              <dl className="grid gap-x-4 text-xs" style={{ gridTemplateColumns: '130px 1fr' }}>
                <KV label="range" value={<InlineCode>{phase2Kit.bc_tuple.range}</InlineCode>} />
                <KV label="tempo" value={<InlineCode>{phase2Kit.bc_tuple.tempo}</InlineCode>} />
                <KV label="amplitude" value={<InlineCode>{phase2Kit.bc_tuple.amplitude}</InlineCode>} />
                <KV label="attribute" value={<InlineCode>{phase2Kit.bc_tuple.attribute}</InlineCode>} />
                <KV label="proxy_density" value={<InlineCode>{phase2Kit.bc_tuple.proxy_density}</InlineCode>} />
              </dl>
            </TraceStep>
          ) : (
            <TraceStep phase={1} phaseLabel="Phase 1 — BC Cell Discovery" title="BC Cell">
              <div className="text-xs text-white/50 font-mono">
                {phase2LoadState === 'loading' ? 'Loading Phase 2 data...' : phase2LoadState === 'error' ? 'Error loading Phase 2 data' : 'Awaiting Phase 2 load'}
              </div>
            </TraceStep>
          )}

          {/* Step 2 — Generation */}
          {phase2Kit ? (
            <TraceStep
              phase={2}
              phaseLabel="Phase 2 — Substrate Binding + Generation"
              title="Substrate binding"
            >
              <dl className="grid gap-x-4 text-xs" style={{ gridTemplateColumns: '130px 1fr' }}>
                <KV label="element" value={<InlineCode>{phase2Kit.element}</InlineCode>} />
                <KV label="cohort_archetype" value={<InlineCode>{phase2Kit.cohort_archetype}</InlineCode>} />
                <KV label="resource_model" value={<InlineCode>{phase2Kit.resource_model}</InlineCode>} />
                <KV label="lineage" value={<InlineCode>{phase2Kit.cultural_lineage_canonical}</InlineCode>} />
                <KV label="period" value={<InlineCode>{phase2Kit.historical_period_canonical}</InlineCode>} />
                <KV label="register" value={<InlineCode>{phase2Kit.register_canonical}</InlineCode>} />
                <KV label="chains" value={`T4: ${phase2Kit.chain_composition.t4_chains} + supporting: ${phase2Kit.chain_composition.supporting_chains}`} />
                {phase2Kit.is_hybrid && phase2Kit.secondary_element && (
                  <KV label="secondary_elem" value={<InlineCode>{phase2Kit.secondary_element}</InlineCode>} />
                )}
              </dl>
            </TraceStep>
          ) : (
            <TraceStep phase={2} phaseLabel="Phase 2 — Substrate Binding + Generation" title="Substrate binding">
              <div className="text-xs text-white/50 font-mono">
                {phase2LoadState === 'loading' ? 'Loading Phase 2 data...' : '—'}
              </div>
            </TraceStep>
          )}

          {/* Step 3 — Gauntlet */}
          <TraceStep phase={3} phaseLabel="Phase 3 — Gauntlet Simulation" title="Synthetic encounter battery">
            {verdict && (
              <dl className="grid gap-x-4 text-xs" style={{ gridTemplateColumns: '130px 1fr' }}>
                <KV label="gauntlet_pass_rate" value={<InlineCode>{verdict.gauntlet_pass_rate.toFixed(3)}</InlineCode>} />
                <KV label="cohort" value={<InlineCode>{verdict.cohort}</InlineCode>} />
                <KV label="cohort_midpoint" value={<InlineCode>{verdict.cohort_midpoint.toFixed(3)}</InlineCode>} />
                <KV label="band_distance" value={<InlineCode>{verdict.band_distance.toFixed(3)}</InlineCode>} />
              </dl>
            )}
          </TraceStep>

          {/* Step 4 — Archive */}
          {phase4Result ? (
            <TraceStep
              phase={4}
              phaseLabel="Phase 4 — Pareto-2 Archive Insertion"
              title={
                <span>
                  Verdict:{' '}
                  <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded ${phase4Result.disposition === 'ACCEPT' ? 'bg-green-700' : 'bg-red-700'} text-white`}>
                    {phase4Result.disposition}
                  </span>
                </span>
              }
            >
              <dl className="grid gap-x-4 text-xs" style={{ gridTemplateColumns: '130px 1fr' }}>
                <KV label="mg1 Pareto rank" value={<InlineCode>{phase4Result.mg1_pareto_rank}</InlineCode>} />
                <KV label="mg2 Diversity" value={<InlineCode>{phase4Result.mg2_diversity_score.toFixed(1)}</InlineCode>} />
                <KV label="mg3 Duplicate" value={<InlineCode>{String(phase4Result.mg3_duplicate_flag)}</InlineCode>} />
                <KV label="mg4 Novelty" value={<InlineCode>{phase4Result.mg4_novelty_score.toFixed(1)}</InlineCode>} />
              </dl>
            </TraceStep>
          ) : (
            <TraceStep phase={4} phaseLabel="Phase 4 — Pareto-2 Archive Insertion" title="Archive insertion">
              <div className="text-xs text-white/50 font-mono">Kit not found in Phase 4 insertion results</div>
            </TraceStep>
          )}

          {/* Step 5 — Cohesion */}
          <TraceStep phase={5} phaseLabel="Phase 5 — Cohesion + LLM Naming" title="Faction assignment + Wave B naming">
            {cluster && (
              <dl className="grid gap-x-4 text-xs" style={{ gridTemplateColumns: '130px 1fr' }}>
                <KV label="cluster_id" value={<InlineCode>{String(cluster.cluster_id)}</InlineCode>} />
                <KV label="faction" value={cluster.faction_label_canonical} />
                <KV label="compactness" value={<InlineCode>{cluster.cluster_compactness.toFixed(3)}</InlineCode>} />
                <KV label="modal_bc" value={`${cluster.modal_bc_axis_signature.engagement_profile} / ${cluster.modal_bc_axis_signature.damage_geometry}`} />
              </dl>
            )}
            {waveB && verdict && (
              <dl className="grid gap-x-4 mt-2 text-xs" style={{ gridTemplateColumns: '130px 1fr' }}>
                <KV label="kit_name" value={waveB.kit_name_canonical} />
                <KV label="ai_tell" value={<InlineCode>{waveB.ai_tell_compliance_score.toFixed(2)}</InlineCode>} />
                <KV label="status" value={<InlineCode>{waveB.final_compliance_status}</InlineCode>} />
              </dl>
            )}
          </TraceStep>

          {/* Step 6 — Visual (deferred) */}
          <TraceStep phase={6} phaseLabel="Phase 6 — Visual Coalescence (Deferred)" title="Cycle 15+ scope">
            <p className="text-xs text-white/50 leading-relaxed">
              Would produce: hero-card art + faction marquee + per-kit visual asset via Meshy + Control Rig + Niagara VFX pipeline. Style register: HD-2D pixel art (locked).
            </p>
          </TraceStep>

          {/* Step 7 — Joint-Gate */}
          {verdict && (
            <TraceStep
              phase={7}
              phaseLabel="Phase 7 — Joint-Gate Evaluation"
              title={
                <span>
                  Verdict:{' '}
                  <span className="inline-block bg-green-700 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                    SHIPPED-WORTHY
                  </span>
                </span>
              }
            >
              <dl className="grid gap-x-4 text-xs" style={{ gridTemplateColumns: '130px 1fr' }}>
                <KV label="mechanical_pass" value={<InlineCode>{verdict.mechanical_pass ? '1' : '0'}</InlineCode>} />
                <KV
                  label="cohesion_pass"
                  value={
                    <InlineCode>
                      {verdict.cohesion_pass ? '1' : '0'}
                      {verdict.kit_cohesion_score != null && ` (score ${verdict.kit_cohesion_score.toFixed(2)})`}
                    </InlineCode>
                  }
                />
                <KV label="cohort" value={<InlineCode>{verdict.cohort}</InlineCode>} />
              </dl>
            </TraceStep>
          )}
        </div>
      </div>
    </section>
  );
}
