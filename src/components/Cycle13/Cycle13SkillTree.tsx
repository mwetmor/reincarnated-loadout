/**
 * Cycle13SkillTree.tsx — Interactive skill tree for Cycle 13 characters
 *
 * Block A3: per-node investment edit with constraints (passive max=5, active max=15, T4=0/1)
 * Block A3: T4-unlock threshold visualization at 70% of chain investment
 * Block A4: one-T4-at-a-time constraint + respec mechanism
 *
 * Source: cycle13_characters.db → public/data/cycle13/ static export
 * Chain structure derived from chain_composition JSON + t4_candidate data.
 */
import type { Cycle13Character, Cycle13T4Candidate } from '../../data/cycle13Types';
import {
  PASSIVE_MAX,
  ACTIVE_MAX,
  T4_UNLOCK_THRESHOLD_POINTS,
  CHAIN_INVESTMENT_MAX,
  type ChainNodeState,
  countUnlockedT4Chains,
} from '../../hooks/useCycle13Data';

// ── Investment control (slider + badge) ────────────────────────────────────

interface InvestmentControlProps {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
  colorClass?: string;
}

function InvestmentControl({ label, value, max, onChange, colorClass = 'text-violet-300' }: InvestmentControlProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-gray-500 w-14 flex-shrink-0">{label}</span>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-violet-500 cursor-pointer h-1.5"
        aria-label={`${label} investment (0–${max})`}
      />
      <span className={`text-xs font-mono font-bold w-8 text-right ${colorClass}`}>
        {value}/{max}
      </span>
    </div>
  );
}

// ── T4 unlock threshold bar ─────────────────────────────────────────────────

interface T4ThresholdBarProps {
  chainInvestment: number; // passive + active
  isUnlocked: boolean;
}

function T4ThresholdBar({ chainInvestment, isUnlocked }: T4ThresholdBarProps) {
  const pct = Math.min(100, (chainInvestment / CHAIN_INVESTMENT_MAX) * 100);
  const thresholdPct = (T4_UNLOCK_THRESHOLD_POINTS / CHAIN_INVESTMENT_MAX) * 100; // 70%

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[9px] font-mono text-gray-600">
          Chain investment: {chainInvestment}/{CHAIN_INVESTMENT_MAX}
        </span>
        {isUnlocked ? (
          <span className="text-[9px] font-mono font-bold text-amber-400">T4 UNLOCKED</span>
        ) : (
          <span className="text-[9px] font-mono text-gray-700">
            {T4_UNLOCK_THRESHOLD_POINTS - chainInvestment > 0
              ? `${T4_UNLOCK_THRESHOLD_POINTS - chainInvestment} to unlock T4`
              : 'at threshold'}
          </span>
        )}
      </div>
      <div className="relative h-1.5 rounded-full bg-gray-800">
        {/* Progress fill */}
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-200 ${
            isUnlocked ? 'bg-amber-500' : 'bg-violet-600'
          }`}
          style={{ width: `${pct}%` }}
        />
        {/* Threshold marker at 70% */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-amber-500/60 rounded"
          style={{ left: `${thresholdPct}%` }}
          title="70% threshold — T4 unlock"
        />
      </div>
    </div>
  );
}

// ── T4 candidate display ────────────────────────────────────────────────────

interface T4CandidatePanelProps {
  candidate: Cycle13T4Candidate;
  chainId: string;
  isChainUnlocked: boolean;
  isSelected: boolean;
  isDisabledByOtherT4: boolean;
  onSelect: () => void;
  onDeselect: () => void;
}

function T4CandidatePanel({
  candidate,
  chainId,
  isChainUnlocked,
  isSelected,
  isDisabledByOtherT4,
  onSelect,
  onDeselect,
}: T4CandidatePanelProps) {
  const scopeData = candidate.scope_projection_data;
  const activeScope = candidate.t4_scope ?? 'chain_wide_parallel';
  const activeScopeData = scopeData?.[activeScope];

  return (
    <div
      className={`mt-2 rounded-md border p-2.5 transition-colors ${
        isSelected
          ? 'border-amber-500 bg-amber-950/30'
          : isChainUnlocked && !isDisabledByOtherT4
          ? 'border-gray-600 bg-gray-900/40 hover:border-amber-700/60 cursor-pointer'
          : 'border-gray-800 bg-gray-900/20 opacity-50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono font-bold text-amber-400">T4</span>
            <span className="text-[10px] font-mono text-gray-400">
              {candidate.category_a_strategy.replace(/_/g, ' ')}
            </span>
            <span className="text-[9px] font-mono text-gray-600">·</span>
            <span className="text-[10px] font-mono text-gray-500">
              {candidate.category_bc_strategy.replace(/_/g, ' ')}
            </span>
            <span className={`text-[9px] font-mono px-1 py-0 rounded border ${
              candidate.t4_category_bc === 'A' ? 'text-cyan-400 border-cyan-800' :
              candidate.t4_category_bc === 'B' ? 'text-violet-400 border-violet-800' :
              'text-gray-400 border-gray-700'
            }`}>
              Cat-{candidate.t4_category_bc}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            <span className="text-[9px] font-mono text-gray-600">
              scope: {(candidate.t4_scope ?? 'chain_wide_parallel').replace(/_/g, ' ')}
            </span>
            <span className="text-[9px] font-mono text-gray-600">
              mode: {candidate.parallel_chain_mode}
            </span>
            {candidate.target_chain_id && (
              <span className="text-[9px] font-mono text-gray-600">
                target: {candidate.target_chain_id}
              </span>
            )}
            <span className="text-[9px] font-mono text-gray-600">
              chain: {chainId}
            </span>
          </div>
          {/* Scope projection scores */}
          {activeScopeData && (
            <div className="mt-1.5 flex gap-3">
              <span className="text-[9px] font-mono text-gray-600">
                synergy: <span className="text-emerald-400 font-bold">{activeScopeData.net_synergy_score.toFixed(1)}</span>
              </span>
              <span className="text-[9px] font-mono text-gray-600">
                weighted: <span className="text-cyan-400">{activeScopeData.weighted_score.toFixed(1)}</span>
              </span>
              {(candidate.pattern_9_warn === 1 || candidate.pattern_10_warn === 1) && (
                <span className="text-[9px] font-mono text-yellow-600">
                  {candidate.pattern_9_warn === 1 ? 'P9-WARN' : ''}{candidate.pattern_10_warn === 1 ? ' P10-WARN' : ''}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Select / Deselect button */}
        {isChainUnlocked && (
          <button
            onClick={isSelected ? onDeselect : isDisabledByOtherT4 ? undefined : onSelect}
            disabled={!isSelected && isDisabledByOtherT4}
            className={`flex-shrink-0 text-[10px] font-mono px-2 py-1 rounded border transition-colors ${
              isSelected
                ? 'border-amber-500 text-amber-400 hover:border-red-500 hover:text-red-400 cursor-pointer'
                : isDisabledByOtherT4
                ? 'border-gray-800 text-gray-700 cursor-not-allowed'
                : 'border-amber-700 text-amber-600 hover:border-amber-500 hover:text-amber-400 cursor-pointer'
            }`}
          >
            {isSelected ? 'Deselect' : 'Select T4'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Chain panel ─────────────────────────────────────────────────────────────

interface ChainPanelProps {
  chain: ChainNodeState;
  t4Candidates: Cycle13T4Candidate[]; // candidates that match this chain
  anyT4Selected: boolean;
  onPassiveChange: (v: number) => void;
  onActiveChange: (v: number) => void;
  onT4Select: () => void;
  onT4Deselect: () => void;
}

function ChainPanel({
  chain,
  t4Candidates,
  anyT4Selected,
  onPassiveChange,
  onActiveChange,
  onT4Select,
  onT4Deselect,
}: ChainPanelProps) {
  const investment = chain.passive + chain.active;
  const isT4Unlocked = chain.isT4Chain && investment >= T4_UNLOCK_THRESHOLD_POINTS;

  // Chain label
  const label = chain.isT4Chain
    ? `${chain.chainId.replace(/_/g, ' ').replace('t4 chain', 'T4 Chain')} (T4)`
    : chain.chainId.replace(/_/g, ' ').replace('supporting chain', 'Support Chain');

  return (
    <div className={`rounded-lg border p-3 ${
      chain.isT4Chain ? 'border-gray-700 bg-gray-900/30' : 'border-gray-800 bg-gray-900/20'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-mono font-semibold ${
          chain.isT4Chain ? 'text-gray-300' : 'text-gray-500'
        }`}>
          {label}
        </span>
        {chain.isT4Chain && (
          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
            isT4Unlocked
              ? 'text-amber-400 border-amber-700 bg-amber-950/30'
              : 'text-gray-600 border-gray-700'
          }`}>
            {isT4Unlocked ? 'T4 UNLOCKED' : 'T4 LOCKED'}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <InvestmentControl
          label="Passive"
          value={chain.passive}
          max={PASSIVE_MAX}
          onChange={onPassiveChange}
          colorClass="text-cyan-400"
        />
        <InvestmentControl
          label="Active"
          value={chain.active}
          max={ACTIVE_MAX}
          onChange={onActiveChange}
          colorClass="text-violet-300"
        />
      </div>

      {chain.isT4Chain && (
        <>
          <T4ThresholdBar chainInvestment={investment} isUnlocked={isT4Unlocked} />
          {/* T4 candidates */}
          {t4Candidates.length > 0 ? (
            t4Candidates.map((cand) => (
              <T4CandidatePanel
                key={cand.candidate_id}
                candidate={cand}
                chainId={chain.chainId}
                isChainUnlocked={isT4Unlocked}
                isSelected={chain.t4Selected}
                isDisabledByOtherT4={anyT4Selected && !chain.t4Selected}
                onSelect={onT4Select}
                onDeselect={onT4Deselect}
              />
            ))
          ) : (
            <p className="text-[10px] font-mono text-gray-700 mt-2">No T4 candidates mapped to this chain</p>
          )}
        </>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

interface Cycle13SkillTreeProps {
  char: Cycle13Character;
  t4Candidates: Cycle13T4Candidate[];
  chains: ChainNodeState[];
  onChainChange: (chainId: string, field: 'passive' | 'active', value: number) => void;
  onT4Select: (chainId: string) => void;
  onT4Deselect: (chainId: string) => void;
}

export function Cycle13SkillTree({
  char,
  t4Candidates,
  chains,
  onChainChange,
  onT4Select,
  onT4Deselect,
}: Cycle13SkillTreeProps) {
  const unlockedCount = countUnlockedT4Chains(chains);
  const anyT4Selected = chains.some((c) => c.t4Selected);
  const selectedT4Chain = chains.find((c) => c.t4Selected);

  // Map T4 candidates to their chain IDs
  // Candidates attach to a chain by: candidate_id starts with element_t4_chain_N or target_chain_id
  function candidatesForChain(chainId: string): Cycle13T4Candidate[] {
    return t4Candidates.filter((cand) => {
      // "t4_chain_1" → candidate_id contains "t4_chain_1"
      // "t4_chain_2" → candidate_id contains "t4_chain_2"
      const chainNum = chainId.replace('t4_chain_', '');
      return cand.candidate_id.includes(`t4_chain_${chainNum}_`) ||
        cand.target_chain_id === chainId;
    });
  }

  return (
    <div className="space-y-3">
      {/* Summary row */}
      <div className="flex flex-wrap gap-3 items-center text-[10px] font-mono">
        <span className="text-gray-500">
          Chains: <span className="text-gray-300">{char.chain_composition.total_chains}</span>
          {' '}({char.chain_composition.t4_chains} T4 + {char.chain_composition.supporting_chains} support)
        </span>
        <span className="text-gray-500">
          T4 unlocked: <span className={unlockedCount > 0 ? 'text-amber-400' : 'text-gray-500'}>
            {unlockedCount}/{char.chain_composition.t4_chains}
          </span>
        </span>
        {anyT4Selected && selectedT4Chain && (
          <span className="text-amber-400 font-bold">
            Selected: {selectedT4Chain.chainId.replace(/_/g, ' ')}
          </span>
        )}
        {unlockedCount > 1 && (
          <span className="text-[9px] font-mono text-sky-500">
            Block A4: multiple T4s unlocked — respec available
          </span>
        )}
      </div>

      {/* Block A4 respec notice */}
      {unlockedCount > 1 && anyT4Selected && (
        <div className="rounded border border-sky-800 bg-sky-950/30 px-3 py-2">
          <p className="text-[10px] font-mono text-sky-400">
            T4 Respec available — {unlockedCount} chains above 70% threshold. Deselect current T4 then select another.
          </p>
        </div>
      )}

      {/* Chain panels */}
      <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-3">
        {chains.map((chain) => (
          <ChainPanel
            key={chain.chainId}
            chain={chain}
            t4Candidates={chain.isT4Chain ? candidatesForChain(chain.chainId) : []}
            anyT4Selected={anyT4Selected}
            onPassiveChange={(v) => onChainChange(chain.chainId, 'passive', v)}
            onActiveChange={(v) => onChainChange(chain.chainId, 'active', v)}
            onT4Select={() => onT4Select(chain.chainId)}
            onT4Deselect={() => onT4Deselect(chain.chainId)}
          />
        ))}
      </div>

      {/* Investment summary */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-gray-600 border-t border-gray-800 pt-2">
        {chains.map((c) => (
          <span key={c.chainId}>
            {c.chainId}: passive {c.passive}/{PASSIVE_MAX} · active {c.active}/{ACTIVE_MAX}
            {c.isT4Chain ? ` · T4 ${c.t4Selected ? 'selected' : 'unselected'}` : ''}
          </span>
        ))}
      </div>
    </div>
  );
}
