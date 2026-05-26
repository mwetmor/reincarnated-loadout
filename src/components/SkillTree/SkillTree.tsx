import { useState } from 'react';
import type { ClassData, Skill, SeasonManifest } from '../../data/types';
import { resolveElementDisplay } from '../../data/types';
import { SkillNode } from './SkillNode';
import { SkillDetailPanel } from './SkillDetailPanel';
// Cycle 11 Wave 3b — M3 + M6 T4 alteration display (MIGRATION.md v1.3)
import { T4AlterationPanel } from './T4AlterationPanel';
import { T4ComparisonPanel } from './T4ComparisonPanel';

interface SkillTreeProps {
  classData: ClassData;
  manifest: SeasonManifest;
  allocations: Record<string, number>;
  isTierUnlocked: (tier: number, chainId?: string) => boolean;
  canInvestSkill: (id: string) => { ok: boolean; reason?: string };
  canDivestSkill: (id: string) => { ok: boolean; reason?: string };
  onInvest: (id: string) => void;
  onDivest: (id: string) => void;
  // Design-mode: when true, T4AlterationPanel shows "Mechanical Effects" sub-section.
  designMode?: boolean;
}

const TIERS = [1, 2, 3, 4];
const CHAINS = ['chain_A', 'chain_B', 'chain_C', 'chain_D'];
const CHAIN_LABELS = { chain_A: 'A', chain_B: 'B', chain_C: 'C', chain_D: 'D' };

// L-02 pattern fix (cipher migration): same hardening as SkillDetailPanel.
// Uses seasonal_elements first (v1.5+), then elements (pre-v1.5), then "Unknown".
// Never returns raw canonical-four string on failure.
function resolveElementName(canonical: string, manifest: SeasonManifest): string {
  return resolveElementDisplay(canonical, manifest, `SkillTree:${canonical}`);
}

type NodeState = 'locked' | 'available' | 'selected' | 'invested';

export function SkillTree({
  classData,
  manifest,
  allocations,
  isTierUnlocked,
  canInvestSkill,
  canDivestSkill,
  onInvest,
  onDivest,
  designMode = false,
}: SkillTreeProps) {
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

  const skills = classData.skills;

  // Index skills by tier → chain → position
  const grid: Map<string, Skill[]> = new Map();
  for (const skill of skills) {
    const key = `${skill.tier}:${skill.chain_id}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key)!.push(skill);
  }
  // Sort by chain_position — null-safe: absent on Phase 5 skills (fallback to 0 preserves order).
  // TODO(drax): remove ?? 0 when engine unifies Skill.chain_position field.
  for (const [, cell] of grid) {
    cell.sort((a, b) => (a.chain_position ?? 0) - (b.chain_position ?? 0));
  }

  // Determine which tiers actually have skills
  const tiersWithSkills = TIERS.filter((t) =>
    CHAINS.some((c) => (grid.get(`${t}:${c}`) ?? []).length > 0)
  );

  const selectedSkill = selectedSkillId ? skills.find((s) => s.id === selectedSkillId) ?? null : null;
  const selectedRank = selectedSkillId ? (allocations[selectedSkillId] ?? 0) : 0;

  function getNodeState(skill: Skill): NodeState {
    // Per-chain gate: a skill is locked if its chain hasn't met the tier threshold
    if (!isTierUnlocked(skill.tier, skill.chain_id)) return 'locked';
    if (skill.id === selectedSkillId) return 'selected';
    if ((allocations[skill.id] ?? 0) > 0) return 'invested';
    return 'available';
  }

  function handleNodeClick(skillId: string) {
    setSelectedSkillId((prev) => (prev === skillId ? null : skillId));
  }

  // M3 + M6: t4_alteration_output from class JSON (MIGRATION.md v1.3)
  // Null-safe: panels hide themselves when alteration is null/absent.
  const t4Alteration = classData.t4_alteration_output ?? null;

  return (
    <div className="flex flex-col gap-4">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      {/* Tree Grid — horizontal scroll fallback at very small widths */}
      <div className="flex-1 min-w-0 overflow-x-auto">
        {/* Chain header */}
        <div className="grid gap-1.5 sm:gap-2 mb-2 min-w-[280px]" style={{ gridTemplateColumns: '2rem repeat(4, 1fr)' }}>
          <div /> {/* tier label spacer */}
          {CHAINS.map((chain) => (
            <div key={chain} className="text-center">
              <span className="text-xs font-mono text-gray-500 uppercase">
                {CHAIN_LABELS[chain as keyof typeof CHAIN_LABELS]}
              </span>
            </div>
          ))}
        </div>

        {/* Tier rows */}
        <div className="space-y-1.5 sm:space-y-2 min-w-[280px]">
          {tiersWithSkills.map((tier) => {
            // Per-chain gates: tier row overlay only shows when EVERY chain with skills
            // in this tier is locked. Once any chain unlocks, individual SkillNode lock
            // icons handle the per-cell locked state.
            const chainsWithSkillsInTier = CHAINS.filter(
              (c) => (grid.get(`${tier}:${c}`) ?? []).length > 0
            );
            const allChainsLocked =
              chainsWithSkillsInTier.length > 0 &&
              chainsWithSkillsInTier.every((c) => !isTierUnlocked(tier, c));
            return (
              <div key={tier} className="relative">
                {/* Locked overlay — only when all chains in this tier are locked */}
                {allChainsLocked && (
                  <div className="absolute inset-0 z-10 rounded-lg bg-gray-950/60 flex items-center justify-center pointer-events-none">
                    <span className="text-xs text-gray-600 font-mono bg-gray-950 px-2 py-0.5 rounded border border-gray-700">
                      T{tier} locked
                    </span>
                  </div>
                )}
                <div
                  className={`grid gap-1.5 sm:gap-2 items-start ${allChainsLocked ? 'pointer-events-none' : ''}`}
                  style={{ gridTemplateColumns: '2rem repeat(4, 1fr)' }}
                >
                  {/* Tier label */}
                  <div className="flex items-center justify-center">
                    <span
                      className={`text-xs font-mono font-bold ${
                        !allChainsLocked ? 'text-gray-400' : 'text-gray-700'
                      }`}
                    >
                      T{tier}
                    </span>
                  </div>

                  {/* Chain cells */}
                  {CHAINS.map((chain) => {
                    const cellSkills = grid.get(`${tier}:${chain}`) ?? [];
                    return (
                      <div key={chain} className="flex flex-col gap-1.5 items-center">
                        {cellSkills.map((skill) => (
                          <SkillNode
                            key={skill.id}
                            skill={skill}
                            state={getNodeState(skill)}
                            rank={allocations[skill.id] ?? 0}
                            seasonElementName={resolveElementName(skill.canonical_element, manifest)}
                            onClick={() => handleNodeClick(skill.id)}
                          />
                        ))}
                        {cellSkills.length === 0 && (
                          <div className="w-16 h-16 rounded-lg border border-dashed border-gray-800 opacity-30" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Panel — right on desktop, below on mobile */}
      <div className="w-full lg:w-64 xl:w-72 flex-shrink-0">
        <SkillDetailPanel
          skill={selectedSkill}
          rank={selectedRank}
          manifest={manifest}
          canInvest={canInvestSkill(selectedSkillId ?? '')}
          canDivest={canDivestSkill(selectedSkillId ?? '')}
          onInvest={() => selectedSkillId && onInvest(selectedSkillId)}
          onDivest={() => selectedSkillId && onDivest(selectedSkillId)}
          onClose={() => setSelectedSkillId(null)}
        />
      </div>
    </div>

    {/* M3 — T4 alteration panel (Cycle 11 Wave 3b, MIGRATION.md v1.3).
        Null-safe: hides when t4_alteration_output is null (pre-§8 seasons / no alteration).
        Tier 2 framing: INTENT METADATA — not combat-affecting until Cycle 12 Layer 6.
        2026-05-26 fix: when t4 data is absent AND designMode is on, render an explicit placeholder
        rather than silently collapsing — prevents "T4 details evaporate on season change" symptom
        (root cause: only sample-season and v2_narrow have t4_alteration_output; real seasons do not). */}
    {t4Alteration ? (
      <T4AlterationPanel alteration={t4Alteration} designMode={designMode} />
    ) : designMode ? (
      <div className="rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold bg-gray-900 text-gray-600 border-gray-700">
            T4
          </span>
          <span className="text-[11px] font-mono text-gray-600">
            No T4 alteration data — this season predates §8 engine generation
          </span>
        </div>
      </div>
    ) : null}

    {/* M6 — T4 comparison panel (TOGGLE per Q2 RATIFIED; mobile-friendly).
        Null-safe: toggle hidden when t4_alteration_output is null.
        Per Q3 RATIFIED: main-weapon-only context; no off-hand surface here. */}
    {t4Alteration && (
      <T4ComparisonPanel alteration={t4Alteration} />
    )}
    </div>
  );
}
