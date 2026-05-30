// EngineStateObservations — closing observations section
// Mirrors § 5 callout-grid from gandalf HTML scaffolding.
// Phase α: static text per HTML (no dynamic data needed for observations).

import type { EngineSeasonSummary, Phase7KitVerdictsFile } from '../../data/engineStateTypes';

type CalloutVariant = 'resolved' | 'warning' | 'info' | 'error';

interface CalloutProps {
  variant: CalloutVariant;
  title: string;
  children: React.ReactNode;
}

const VARIANT_STYLES: Record<CalloutVariant, { border: string; titleColor: string; bg: string }> = {
  resolved: { border: 'border-l-green-500', titleColor: 'text-green-700', bg: 'bg-green-50/50' },
  warning:  { border: 'border-l-amber-500', titleColor: 'text-amber-700', bg: 'bg-amber-50/50' },
  info:     { border: 'border-l-teal-500',  titleColor: 'text-teal-700',  bg: 'bg-teal-50/50'  },
  error:    { border: 'border-l-red-500',   titleColor: 'text-red-700',   bg: 'bg-red-50/50'   },
};

function Callout({ variant, title, children }: CalloutProps) {
  const s = VARIANT_STYLES[variant];
  return (
    <div className={`${s.bg} border border-gray-200 border-l-4 ${s.border} rounded p-4`}>
      <h4 className={`text-[10px] font-bold uppercase tracking-wider ${s.titleColor} mb-1.5`}>{title}</h4>
      <div className="text-xs text-gray-700 leading-relaxed">{children}</div>
    </div>
  );
}

interface Props {
  summary: EngineSeasonSummary;
  phase7Verdicts: Phase7KitVerdictsFile;
}

export function EngineStateObservations({ summary, phase7Verdicts }: Props) {
  const shippedCount = phase7Verdicts.shipped_count;
  const totalEvaluated = summary.phase7_kits_evaluated;
  const heldCount = totalEvaluated - shippedCount;

  // Detect if all held kits are in defensive cohort (from verdict log)
  const heldVerdicts = phase7Verdicts.kit_verdicts.filter(
    (v) => v.verdict !== 'SHIPPED-WORTHY'
  );
  const defensiveHeld = heldVerdicts.filter((v) => v.cohort === 'defensive').length;
  const allHeldAreDefensive = heldCount > 0 && defensiveHeld === heldCount;

  return (
    <section className="my-8">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">§ 5</span>
        <h2 className="text-lg font-bold text-gray-900 tracking-tight">
          Live engine state observations
        </h2>
      </div>
      <p className="text-sm text-gray-400 mb-4 max-w-[70ch]">
        Patterns surfaced during this analysis worth flagging.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        <Callout variant="resolved" title="Phase 5 element-distribution aggregator">
          Post-fix: cluster element distributions now read substrate-honest (physical dominant where substrate has physical highest).
          Cascade-r4 aggregator remediation landed; faction names regenerated under correct distributions.
        </Callout>

        <Callout variant="resolved" title="Wave B BC-narrative coherence">
          Pre-fix: melee kits were narrativized as ranged channelers. Post-remediation: per-kit BC signature is load-bearing in Wave B prompt.
          100% coverage across {summary.phase2_kit_count} kits.
        </Callout>

        {allHeldAreDefensive && (
          <Callout variant="error" title={`Defensive cohort 0% ship rate — ${heldCount} held`}>
            All held kits are defensive cohort. Three compositional gaps: (1) Cohort weight mismatch — generating ~25-33% defensive vs ~5% genre empirical;
            (2) Missing canonical defensive-viable mechanism (thorns/reflect/attrition);
            (3) Encounter battery lacks defensive-friendly variants.
            KR routing to rocket: split GPR into tier_1_outcome × in_band × sg_overall sub-metrics.
          </Callout>
        )}

        <Callout variant="warning" title="gauntlet_pass_rate is composite, not raw win rate">
          gauntlet_pass_rate is the PLAYABLE-AND-IN-BAND composite criterion: requires win AND in-cohort-KPM-band AND survival AND no sg_overall BLOCK.
          Raw win rate not directly emitted to Phase 7 verdict log — composite GPR is the load-bearing metric.
        </Callout>

        <Callout variant="info" title="Substrate-led discipline empirically visible">
          Near-zero substrate duplication across {summary.phase2_kit_count} kits.
          Cultural lineage and period spans multiple distinct traditions.
          Substrate vote at Phase 2 is honest to the catalogue's diversity.
        </Callout>

        {summary.phase5_cluster_count > 0 && (
          <Callout variant="info" title="Cluster cardinality variance is substrate-elected">
            PM-1 clustering produces natural cardinality variance — mega-cluster (many members) vs distinctive cluster (few members) per season.
            This is substrate-led per Wanderer architecture principle (Amendment 1). Not a bug.
          </Callout>
        )}

      </div>
    </section>
  );
}
