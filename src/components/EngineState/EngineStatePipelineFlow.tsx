// EngineStatePipelineFlow — 9-stage pipeline flow diagram
// Mirrors .pipeline CSS Grid from gandalf HTML scaffolding.
// Phase α: status surface only. No phase trigger buttons (Phase β scope — out of scope).

import type { EngineSeasonSummary } from '../../data/engineStateTypes';

const PHASE_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  0: { bg: 'bg-violet-600', text: 'text-violet-600', border: 'border-violet-200' },
  1: { bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-200' },
  2: { bg: 'bg-teal-600', text: 'text-teal-600', border: 'border-teal-200' },
  3: { bg: 'bg-orange-600', text: 'text-orange-600', border: 'border-orange-200' },
  4: { bg: 'bg-green-600', text: 'text-green-600', border: 'border-green-200' },
  5: { bg: 'bg-fuchsia-600', text: 'text-fuchsia-600', border: 'border-fuchsia-200' },
  6: { bg: 'bg-slate-400', text: 'text-slate-400', border: 'border-slate-200' },
  7: { bg: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-200' },
  8: { bg: 'bg-slate-400', text: 'text-slate-400', border: 'border-slate-200' },
};

interface StageProps {
  phase: number;
  label: string;
  count: string | number;
  sub: string;
  deferred?: boolean;
  isLast?: boolean;
}

function PipelineStage({ phase, label, count, sub, deferred, isLast }: StageProps) {
  const colors = PHASE_COLORS[phase] ?? PHASE_COLORS[0];
  return (
    <div
      className={`relative flex flex-col items-center text-center px-2 py-3 ${
        !isLast ? 'border-r border-dashed border-gray-200' : ''
      } ${deferred ? 'opacity-50' : ''}`}
    >
      <div
        className={`w-9 h-9 rounded-full ${colors.bg} flex items-center justify-center text-white font-bold text-sm mb-1.5 flex-shrink-0`}
      >
        {phase}
      </div>
      <div className="text-[9px] font-semibold uppercase tracking-wider text-gray-600 mb-1 whitespace-nowrap">
        {label}
      </div>
      <div className={`text-xl font-bold ${deferred ? 'text-gray-400' : 'text-gray-900'} leading-none`}>
        {count}
      </div>
      <div className="text-[9px] text-gray-400 mt-0.5 leading-snug">{sub}</div>
      {!isLast && (
        <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 text-gray-300 text-sm pointer-events-none z-10">
          →
        </span>
      )}
    </div>
  );
}

interface Props {
  summary: EngineSeasonSummary;
}

export function EngineStatePipelineFlow({ summary }: Props) {
  const bcCells = Math.round(summary.phase2_kit_count / 3);
  const seedBase = summary.season_id.replace('cycle-14-wave-5-season-', '14');
  const shipRate = summary.phase7_acceptance_rate != null
    ? `${(summary.phase7_acceptance_rate * 100).toFixed(1)}%`
    : '—';

  return (
    <section className="my-8">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">§ 1</span>
        <h2 className="text-lg font-bold text-gray-900 tracking-tight">
          Engine Pipeline — Season throughput
        </h2>
      </div>
      <p className="text-sm text-gray-400 mb-4 max-w-[70ch]">
        Eight phases. Substrate enters at Phase 0 as RNG seed; player-facing kits exit at Phase 8 export.
        Phase 6 visual coalescence and Phase 8 export are deferred to Cycle 15+/16+.
      </p>
      <div className="bg-white border border-gray-200 rounded-lg p-4 overflow-x-auto">
        <div className="grid min-w-[900px]" style={{ gridTemplateColumns: 'repeat(9, minmax(90px, 1fr))' }}>
          <PipelineStage phase={0} label="Seed" count={seedBase} sub="RNG seed_base" />
          <PipelineStage phase={1} label="BC Cells" count={bcCells} sub="cell discovery" />
          <PipelineStage phase={2} label="Generation" count={summary.phase2_kit_count} sub={`3 samples × ${bcCells} cells`} />
          <PipelineStage phase={3} label="Gauntlet Sim" count={summary.phase3_passing_kit_count} sub="WR-bracket pass" />
          <PipelineStage
            phase={4}
            label="Pareto Archive"
            count={summary.phase4_accepted_count}
            sub={`accepted of ${summary.phase4_accepted_count + summary.phase4_rejected_count}`}
          />
          <PipelineStage phase={5} label="Cohesion" count={summary.phase5_cluster_count} sub="faction clusters" />
          <PipelineStage phase={6} label="Visual" count="—" sub="deferred C15+" deferred />
          <PipelineStage
            phase={7}
            label="Joint-Gate"
            count={summary.phase7_shipped_worthy}
            sub={`shipped (${shipRate})`}
          />
          <PipelineStage phase={8} label="Export" count="—" sub="deferred C16+" deferred isLast />
        </div>
      </div>
    </section>
  );
}
