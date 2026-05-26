import type { SeasonSummaryCard } from '../../hooks/useAnalytics';

// Substrate color map — internal canonical keys for display color only.
// Matches ELEMENT_COLORS in constants.ts for canonical-4; extends with canonical-7 additions.
const SUBSTRATE_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  fire:      { bg: 'bg-orange-950', text: 'text-orange-300', dot: '#f97316' },
  water:     { bg: 'bg-blue-950',   text: 'text-blue-300',   dot: '#60a5fa' },
  earth:     { bg: 'bg-amber-950',  text: 'text-amber-300',  dot: '#f59e0b' },
  wind:      { bg: 'bg-teal-950',   text: 'text-teal-300',   dot: '#2dd4bf' },
  lightning: { bg: 'bg-yellow-950', text: 'text-yellow-300', dot: '#eab308' },
  holy:      { bg: 'bg-violet-950', text: 'text-violet-300', dot: '#a78bfa' },
  shadow:    { bg: 'bg-purple-950', text: 'text-purple-300', dot: '#c084fc' },
  physical:  { bg: 'bg-slate-800',  text: 'text-slate-300',  dot: '#94a3b8' },
};

function substrateColors(sub: string) {
  return SUBSTRATE_COLOR[sub] ?? { bg: 'bg-gray-900', text: 'text-gray-400', dot: '#6b7280' };
}

interface Props {
  cards: SeasonSummaryCard[];
}

function SeasonCard({ card }: { card: SeasonSummaryCard }) {
  const themeColors = substrateColors(card.themeElement);
  const hasNewSubstrates = card.newSubstrates.length > 0;

  return (
    <div
      className={`rounded-lg border p-3 flex flex-col gap-2 text-xs font-mono ${
        card.isCanonical7
          ? 'border-violet-800/60 bg-gray-900/80'
          : 'border-gray-800 bg-gray-900/50'
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {card.isCanonical7 && (
            <span
              className="text-[9px] text-violet-400 bg-violet-900/40 border border-violet-800/50 rounded px-1 py-0.5 flex-shrink-0"
              title="Canonical-7 substrate variety — includes lightning, holy, shadow"
            >
              C7
            </span>
          )}
          <span className="text-gray-200 font-semibold truncate">{card.label}</span>
        </div>
        <span
          className={`flex-shrink-0 text-[9px] rounded px-1 py-0.5 ${
            card.validationPassed
              ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/50'
              : 'bg-gray-800 text-gray-600 border border-gray-700'
          }`}
        >
          {card.validationPassed ? 'PASS' : 'FAIL'}
        </span>
      </div>

      {/* Theme + anchor */}
      <div className="space-y-0.5">
        <div className="flex items-center gap-1">
          <span className="text-gray-600">theme</span>
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0`}
            style={{ backgroundColor: themeColors.dot }}
          />
          <span className={themeColors.text}>{card.themeElement}</span>
        </div>
        <p className="text-gray-600 truncate" title={card.anchorName}>
          <span className="text-gray-700">anchor</span> {card.anchorName}
        </p>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 text-[10px]">
        <span>
          <span className="text-gray-600">cls </span>
          <span className="text-gray-300">{card.classCount}</span>
        </span>
        <span>
          <span className="text-gray-600">fails </span>
          <span className={card.convergenceFailures > 0 ? 'text-amber-400' : 'text-gray-500'}>
            {card.convergenceFailures}
          </span>
        </span>
        <span>
          <span className="text-gray-600">mod </span>
          <span className="text-gray-400">{card.avgModifier.toFixed(3)}</span>
        </span>
      </div>

      {/* Substrate chips */}
      <div className="flex flex-wrap gap-1">
        {card.substrates.map((sub) => {
          const colors = substrateColors(sub);
          const isNew = card.newSubstrates.includes(sub);
          return (
            <span
              key={sub}
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] border ${colors.bg} ${colors.text} ${
                isNew ? 'border-violet-600/60' : 'border-gray-700/50'
              }`}
              title={isNew ? `${sub} — new in canonical-7` : sub}
            >
              {sub}
              {isNew && <span className="text-violet-400 ml-0.5">*</span>}
            </span>
          );
        })}
      </div>

      {/* New-substrate callout */}
      {hasNewSubstrates && (
        <p className="text-[9px] text-violet-400/70">
          * canonical-7: {card.newSubstrates.join(', ')}
        </p>
      )}
    </div>
  );
}

// Engine v2 milestone seasons: v2_narrow (2026-05-25 narrow generation run).
// These are distinguished from historical canonical-4 seasons — they use the new engine
// but are pre-elemental (physical-only) by design, not legacy limitation.
function isEngineV2Season(id: string): boolean {
  return id === 'v2_narrow';
}

export function SeasonSummaryCards({ cards }: Props) {
  if (!cards.length) return null;

  const historicalCards = cards.filter(
    (c) => !c.isCanonical7 && c.seasonId !== 'season_002328' && !isEngineV2Season(c.seasonId)
  );
  const canonical7Cards = cards.filter((c) => c.isCanonical7);
  const yomiCards = cards.filter((c) => c.seasonId === 'season_002328');
  const engineV2Cards = cards.filter((c) => isEngineV2Season(c.seasonId));

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-200 leading-tight">
          Per-Season Summary
        </h2>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
          {cards.length} seasons · C7 = canonical-7 (lightning / holy / shadow added) · * = substrate new to that group · PASS/FAIL = validation_passed from manifest
        </p>
      </div>

      {/* Historical seasons */}
      {historicalCards.length > 0 && (
        <div>
          <p className="text-[10px] font-mono text-gray-600 uppercase tracking-wide mb-2">
            Historical (canonical-4)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {historicalCards.map((c) => <SeasonCard key={c.seasonId} card={c} />)}
          </div>
        </div>
      )}

      {/* Canonical-7 seasons */}
      {canonical7Cards.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[10px] font-mono text-violet-400 uppercase tracking-wide">
              Canonical-7 — standard-demo-regen-2026-05-17
            </p>
            <span className="text-[9px] font-mono text-violet-600">
              lightning + holy + shadow substrate variety
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {canonical7Cards.map((c) => <SeasonCard key={c.seasonId} card={c} />)}
          </div>
        </div>
      )}

      {/* Yomi (special gear-pool season) */}
      {yomiCards.length > 0 && (
        <div>
          <p className="text-[10px] font-mono text-gray-600 uppercase tracking-wide mb-2">
            Yomi (gear-pool season)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {yomiCards.map((c) => <SeasonCard key={c.seasonId} card={c} />)}
          </div>
        </div>
      )}

      {/* Engine v2 milestone seasons (v2_narrow: pre-elemental, physical-only by design) */}
      {engineV2Cards.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[10px] font-mono text-amber-500 uppercase tracking-wide">
              Engine v2 — Narrow Milestone
            </p>
            <span className="text-[9px] font-mono text-amber-700">
              pre-elemental · physical-only · new engine architecture
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {engineV2Cards.map((c) => <SeasonCard key={c.seasonId} card={c} />)}
          </div>
        </div>
      )}
    </div>
  );
}
