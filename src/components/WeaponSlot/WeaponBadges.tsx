// WeaponBadges — Amendment 2 (engine generation run, 2026-05-25)
// Cultural tag badge, period tag badge, quality-tier badge for weapon display.
// Always visible in Player-mode AND Design-mode (weapon enrichment, not engine-layer-only).
// Null-safe: badges hide when field absent (pre-Cycle-12 weapons lack these fields).
//
// Fields consumed (per parked-amendments § Amendment 2):
//   - cultural_lineage_canonical  — e.g. "european" / "east_asian" / "mesoamerican"
//   - historical_period_canonical — e.g. "classical" / "medieval" / "contemporary" / "mythological"
//   - quality_tier                — S / A / B / C — INFORMATIONAL quality grade
//
// IMPORTANT: quality_tier is NOT ARPG drop rarity (common/uncommon/rare/epic/legendary).
// That mechanic is v1.1+ territory. This badge surfaces the substrate curation quality grade
// (per composition policy v1 § 1) as an INFORMATIONAL display for T4 post-mortem review.
//
// Visual distinction from M5 ProvenanceBadge:
//   - ProvenanceBadge = library provenance (amber = engine gap-fill, gray = substrate library)
//   - Quality-tier badge = quality grade (emerald/lime/yellow/orange per S/A/B/C tier)
//   - Cultural/period = teal informational chips

// Human-readable labels for cultural_lineage_canonical values.
const CULTURAL_LABELS: Record<string, string> = {
  european:         'European',
  east_asian:       'East Asian',
  east_asian_japanese: 'Japanese',
  east_asian_chinese:  'Chinese',
  mesoamerican:     'Mesoamerican',
  norse:            'Norse',
  greek:            'Greek',
  celtic:           'Celtic',
  egyptian:         'Egyptian',
  vedic:            'Vedic',
  slavic:           'Slavic',
  sumerian:         'Sumerian',
  pan_fantasy:      'Pan-Fantasy',
  hybrid:           'Hybrid',
};

// Human-readable labels for historical_period_canonical values.
const PERIOD_LABELS: Record<string, string> = {
  classical:        'Classical',
  pre_classical:    'Pre-Classical',
  medieval:         'Medieval',
  early_modern:     'Early Modern',
  industrial:       'Industrial',
  modern:           'Modern',
  contemporary:     'Contemporary',
  mythological:     'Mythological',
  fictional:        'Fictional',
  unknown:          'Unknown Period',
};

// Quality tier visual styling (distinct from M5 ProvenanceBadge amber/gray treatment).
// INFORMATIONAL ONLY — not ARPG rarity.
const QUALITY_TIER_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  S: { bg: 'bg-emerald-950', text: 'text-emerald-300', border: 'border-emerald-700', label: 'Tier S' },
  A: { bg: 'bg-lime-950',    text: 'text-lime-400',    border: 'border-lime-700',    label: 'Tier A' },
  B: { bg: 'bg-yellow-950',  text: 'text-yellow-500',  border: 'border-yellow-700',  label: 'Tier B' },
  C: { bg: 'bg-orange-950',  text: 'text-orange-500',  border: 'border-orange-700',  label: 'Tier C' },
};

function getCulturalLabel(val: string): string {
  return CULTURAL_LABELS[val] ?? val.replace(/_/g, ' ');
}

function getPeriodLabel(val: string): string {
  return PERIOD_LABELS[val] ?? val.replace(/_/g, ' ');
}

interface WeaponBadgesProps {
  culturalLineage?: string | null;
  historicalPeriod?: string | null;
  qualityTier?: string | null;
  className?: string;
}

export function WeaponBadges({
  culturalLineage,
  historicalPeriod,
  qualityTier,
  className = '',
}: WeaponBadgesProps) {
  // If all fields absent, render nothing (pre-Cycle-12 weapons).
  if (!culturalLineage && !historicalPeriod && !qualityTier) return null;

  const tierStyle = qualityTier ? QUALITY_TIER_STYLES[qualityTier] : null;

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {/* Cultural lineage badge */}
      {culturalLineage && (
        <span
          title={`Cultural lineage: ${culturalLineage}`}
          className="inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono bg-teal-950 text-teal-400 border-teal-800"
        >
          {getCulturalLabel(culturalLineage)}
        </span>
      )}

      {/* Historical period badge */}
      {historicalPeriod && (
        <span
          title={`Historical period: ${historicalPeriod}`}
          className="inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono bg-slate-900 text-slate-400 border-slate-700"
        >
          {getPeriodLabel(historicalPeriod)}
        </span>
      )}

      {/* Quality-tier badge — INFORMATIONAL curation quality grade (NOT ARPG rarity) */}
      {qualityTier && tierStyle && (
        <span
          title={`Quality tier: ${qualityTier} — substrate curation quality grade (informational; not ARPG drop rarity)`}
          className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono font-semibold ${tierStyle.bg} ${tierStyle.text} ${tierStyle.border}`}
        >
          {tierStyle.label}
        </span>
      )}
      {/* Quality-tier present but unrecognized tier value — fallback neutral */}
      {qualityTier && !tierStyle && (
        <span
          title={`Quality tier: ${qualityTier}`}
          className="inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono bg-gray-900 text-gray-400 border-gray-700"
        >
          Tier {qualityTier}
        </span>
      )}
    </div>
  );
}
