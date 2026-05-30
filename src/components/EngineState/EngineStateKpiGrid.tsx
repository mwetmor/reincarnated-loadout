// EngineStateKpiGrid — numeric KPI tiles mirroring .kpi-grid from gandalf HTML
// Phase α: status surface only.

import type { EngineSeasonSummary } from '../../data/engineStateTypes';

interface KpiTileProps {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
}

function KpiTile({ label, value, unit, sub }: KpiTileProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-md p-4">
      <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-gray-900 leading-none">{value}</span>
        {unit && <span className="text-sm font-normal text-gray-400">{unit}</span>}
      </div>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

interface Props {
  summary: EngineSeasonSummary;
}

export function EngineStateKpiGrid({ summary }: Props) {
  const shipRate = summary.phase7_acceptance_rate != null
    ? `${(summary.phase7_acceptance_rate * 100).toFixed(1)}% of archive`
    : null;

  const llmCost = summary.phase5_llm_cost_usd != null
    ? `$${summary.phase5_llm_cost_usd.toFixed(3)}`
    : null;

  const bcCells = Math.round(summary.phase2_kit_count / 3); // 3 samples per cell

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 my-6">
      <KpiTile
        label="Phase 2 Kits"
        value={summary.phase2_kit_count}
        sub={`${bcCells} BC cells × 3 substrate samples`}
      />
      <KpiTile
        label="Phase 4 Archived"
        value={summary.phase4_accepted_count}
        sub={`Pareto winners (${summary.phase4_rejected_count} rejected)`}
      />
      <KpiTile
        label="Phase 5 Clusters"
        value={summary.phase5_cluster_count}
        sub="PM-1 GMM-BIC selected"
      />
      <KpiTile
        label="Phase 7 Shipped"
        value={summary.phase7_shipped_worthy}
        sub={shipRate ?? `of ${summary.phase7_kits_evaluated} evaluated`}
      />
      {llmCost && (
        <KpiTile
          label="LLM Cost"
          value={llmCost}
          sub="Wave A + Wave-S + Wave B"
        />
      )}
      <KpiTile
        label="Wave-S Compliance"
        value={summary.wave_s_ai_tell_compliance_score.toFixed(2)}
        sub={`AI-tell ${summary.wave_s_final_compliance_status} verdict`}
      />
    </div>
  );
}
