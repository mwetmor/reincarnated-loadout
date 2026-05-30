// EngineStatePhaseDeepDive — 8 per-phase cards (Phases 0–7 + Phase 8 deferred)
// Mirrors .phase-card structure from gandalf HTML scaffolding.
// Phase α: status surface only. No "fire this phase" buttons (Phase β scope).

import type { EngineSeasonSummary, Phase4ArchiveFile, Phase5FactionClustersFile } from '../../data/engineStateTypes';

const PHASE_LEFT_BORDER: Record<number, string> = {
  0: 'border-l-violet-500',
  1: 'border-l-blue-500',
  2: 'border-l-teal-500',
  3: 'border-l-orange-500',
  4: 'border-l-green-500',
  5: 'border-l-fuchsia-500',
  6: 'border-l-slate-400',
  7: 'border-l-amber-400',
  8: 'border-l-slate-400',
};

const PHASE_BADGE_STYLE: Record<number, string> = {
  0: 'bg-violet-50 text-violet-600',
  1: 'bg-blue-50 text-blue-600',
  2: 'bg-teal-50 text-teal-600',
  3: 'bg-orange-50 text-orange-600',
  4: 'bg-green-50 text-green-600',
  5: 'bg-fuchsia-50 text-fuchsia-600',
  6: 'bg-slate-100 text-slate-500',
  7: 'bg-amber-50 text-amber-600',
  8: 'bg-slate-100 text-slate-500',
};

interface PhaseCardProps {
  phase: number;
  title: string;
  badge: string;
  desc: string;
  rows: Array<{ label: string; value: React.ReactNode }>;
  deferred?: boolean;
}

function PhaseCard({ phase, title, badge, desc, rows, deferred }: PhaseCardProps) {
  const border = PHASE_LEFT_BORDER[phase] ?? 'border-l-gray-300';
  const badgeStyle = PHASE_BADGE_STYLE[phase] ?? 'bg-gray-100 text-gray-500';
  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 border-l-4 ${border} p-5 ${deferred ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between mb-3 gap-2">
        <h3 className="text-base font-bold text-gray-900 leading-snug">{title}</h3>
        <span className={`flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${badgeStyle}`}>
          {badge}
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-3 leading-relaxed">{desc}</p>
      <div className="space-y-1.5">
        {rows.map((row, i) => (
          <div
            key={i}
            className="grid text-sm gap-x-3 py-1.5 border-b border-dotted border-gray-100 last:border-0"
            style={{ gridTemplateColumns: '110px 1fr' }}
          >
            <span className="text-[10px] font-mono uppercase tracking-wide text-gray-400 pt-0.5">
              {row.label}
            </span>
            <span className="text-gray-800 font-medium leading-snug">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-gray-100 text-gray-700 text-[11px] font-mono rounded px-1.5 py-0.5">
      {children}
    </code>
  );
}

interface Props {
  summary: EngineSeasonSummary;
  phase4: Phase4ArchiveFile;
  clusters: Phase5FactionClustersFile;
}

export function EngineStatePhaseDeepDive({ summary, phase4, clusters }: Props) {
  const bcCells = Math.round(summary.phase2_kit_count / 3);
  const totalVariants = phase4.variant_row_count ?? (phase4.total_kits - phase4.base_kit_count);
  const gauntletPassRate = summary.phase2_kit_count > 0
    ? `${((summary.phase3_passing_kit_count / summary.phase2_kit_count) * 100).toFixed(0)}% gauntlet pass rate`
    : '';

  const pmAlgo = clusters.clusters[0]?.pm1_algorithm ?? 'gmm_bic_sweep';

  const shipRate = summary.phase7_acceptance_rate != null
    ? `${(summary.phase7_acceptance_rate * 100).toFixed(1)}%`
    : '—';
  const heldMechanical = (summary.phase7_kits_evaluated ?? 0) - (summary.phase7_shipped_worthy ?? 0);

  return (
    <section className="my-8">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">§ 2</span>
        <h2 className="text-lg font-bold text-gray-900 tracking-tight">Per-phase deep dive</h2>
      </div>
      <p className="text-sm text-gray-400 mb-4 max-w-[70ch]">
        Each phase's inputs, processing, outputs, and production values for this season.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <PhaseCard
          phase={0}
          title="Phase 0 — Seed"
          badge="RNG Entry"
          desc="RNG seed deterministically governs the entire season. Same seed → same substrate samples, same BC discovery, same gauntlet results."
          rows={[
            { label: 'Season ID', value: <Code>{summary.season_id}</Code> },
            { label: 'Output', value: 'Deterministic substrate sampling for all downstream phases' },
          ]}
        />

        <PhaseCard
          phase={1}
          title="Phase 1 — BC Cell Discovery"
          badge="Substrate"
          desc={`Engine selects ${bcCells} BC cells from the 68,040-cell theoretical space. Each cell is a 5-tuple (engagement × tempo × amplitude × attribute × proxy_density).`}
          rows={[
            { label: 'Cells used', value: `${bcCells} of 68,040 theoretical` },
          ]}
        />

        <PhaseCard
          phase={2}
          title={`Phase 2 — Generation (${summary.phase2_kit_count} kits)`}
          badge="Substrate Binding"
          desc={`Per BC cell × 3 substrate samples = ${summary.phase2_kit_count} kits. Each kit composed of: BC tuple + element + cohort + chains + substrate weapon binding from 89K weapon library + 11 gear slots + T4 candidate set.`}
          rows={[
            { label: 'Kits generated', value: `${summary.phase2_kit_count} (3 samples × ${bcCells} cells)` },
          ]}
        />

        <PhaseCard
          phase={3}
          title="Phase 3 — Gauntlet Simulation"
          badge="Viability Test"
          desc="Each kit fights synthetic encounter battery; passes filtered by win_rate bracket. Produces 5-axis quality vector q1–q5 (win_rate / kpm_band / resource / defense / coherence)."
          rows={[
            {
              label: 'Kits passing',
              value: `${summary.phase3_passing_kit_count} of ${summary.phase2_kit_count} in WR-bracket (${gauntletPassRate})`,
            },
            { label: 'Q-vector', value: 'All kits scored on (win_rate / kpm / resource / defense / coherence) 5-tuple' },
            {
              label: 'Note',
              value: `Variant rows expand population to ${phase4.total_kits} by S2 enumeration before Phase 4`,
            },
          ]}
        />

        <PhaseCard
          phase={4}
          title="Phase 4 — Pareto-2 Archive"
          badge="Mechanical Curation"
          desc="Pareto-2 partition by (BC × cultural_lineage); per-partition non-dominated frontier selected; diversity + duplicate + novelty filters."
          rows={[
            { label: 'Accepted', value: `${phase4.accepted_count} (${((phase4.accepted_count / phase4.total_kits) * 100).toFixed(1)}% of ${phase4.total_kits} evaluated)` },
            { label: 'Rejected', value: `${phase4.rejected_count} (Pareto-dominated, duplicate, or low-novelty)` },
            { label: 'Math gates', value: <><Code>mg1</Code> Pareto + <Code>mg2</Code> Diversity + <Code>mg3</Code> Duplicate + <Code>mg4</Code> Novelty</> },
            { label: 'Variants', value: `${phase4.variant_accepted_count} variant rows accepted of ${totalVariants} variant rows` },
          ]}
        />

        <PhaseCard
          phase={5}
          title="Phase 5 — Cohesion Coalescence"
          badge="LLM Naming"
          desc="Path X wire-up: Phase 4 archive → PM-1 GMM-BIC clustering → Wave A faction naming → F-C relationships → Wave-S season naming → Wave B per-kit naming."
          rows={[
            { label: 'PM-1 algo', value: <><Code>{pmAlgo}</Code> over k∈&#123;3,4&#125;; selected k={summary.phase5_cluster_count}</> },
            { label: 'Wave A', value: `${summary.phase5_cluster_count} faction names + narratives + thematic tags` },
            { label: 'Wave-S', value: <em>{summary.wave_s_season_name_canonical} (compliance {summary.wave_s_ai_tell_compliance_score.toFixed(2)}, {summary.wave_s_final_compliance_status})</em> },
            { label: 'Wave B', value: `${summary.phase2_kit_count} kits named (100% coverage post-remediation)` },
            { label: 'Total LLM', value: summary.phase5_llm_cost_usd != null ? `$${summary.phase5_llm_cost_usd.toFixed(3)} — Wave A + Wave-S + Wave B` : '—' },
          ]}
        />

        <PhaseCard
          phase={6}
          title="Phase 6 — Visual Coalescence"
          badge="Deferred"
          desc="CV pipeline + Meshy 3D + Control Rig + Niagara VFX. Cycle 15+ scope per doc 38 § 4 architecture-validation spike."
          rows={[
            { label: 'Status', value: 'Cycle 15+ deferred per doc 39 § 5.6' },
          ]}
          deferred
        />

        <PhaseCard
          phase={7}
          title="Phase 7 — Joint-Gate Evaluation"
          badge="Ship/Hold Verdict"
          desc="Two-layer gate: mechanical (gauntlet pass rate vs cohort floor) AND cohesion (cluster compactness + kit cohesion score). Both must pass for shipped_worthy."
          rows={[
            { label: 'Shipped', value: `${summary.phase7_shipped_worthy} (${shipRate} acceptance rate of archive)` },
            { label: 'Held', value: `${heldMechanical} (HELD-mechanical-fail-floor verdict)` },
            { label: 'Gates', value: 'mechanical_pass × cohesion_pass = ship' },
          ]}
        />

        <PhaseCard
          phase={8}
          title="Phase 8 — Profile Assembly + Export"
          badge="Deferred"
          desc="Reincarnated v1 export profile + per-shipped-worthy character output package. Cycle 16+ scope."
          rows={[
            { label: 'Status', value: 'Cycle 16+ deferred per doc 39 § 5.8' },
          ]}
          deferred
        />

      </div>
    </section>
  );
}
