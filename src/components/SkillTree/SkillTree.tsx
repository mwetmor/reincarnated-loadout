import { useState } from 'react';
import type { ClassData, Skill, SeasonManifest } from '../../data/types';
import { SkillNode } from './SkillNode';
import { SkillDetailPanel } from './SkillDetailPanel';

interface SkillTreeProps {
  classData: ClassData;
  manifest: SeasonManifest;
  allocations: Record<string, number>;
  isTierUnlocked: (tier: number) => boolean;
  canInvestSkill: (id: string) => { ok: boolean; reason?: string };
  canDivestSkill: (id: string) => { ok: boolean; reason?: string };
  onInvest: (id: string) => void;
  onDivest: (id: string) => void;
}

const TIERS = [1, 2, 3, 4];
const CHAINS = ['chain_A', 'chain_B', 'chain_C', 'chain_D'];
const CHAIN_LABELS = { chain_A: 'A', chain_B: 'B', chain_C: 'C', chain_D: 'D' };

function resolveElementName(canonical: string, manifest: SeasonManifest): string {
  return manifest.elements[canonical]?.name ?? canonical;
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
  // Sort by chain_position
  for (const [, cell] of grid) {
    cell.sort((a, b) => a.chain_position - b.chain_position);
  }

  // Determine which tiers actually have skills
  const tiersWithSkills = TIERS.filter((t) =>
    CHAINS.some((c) => (grid.get(`${t}:${c}`) ?? []).length > 0)
  );

  const selectedSkill = selectedSkillId ? skills.find((s) => s.id === selectedSkillId) ?? null : null;
  const selectedRank = selectedSkillId ? (allocations[selectedSkillId] ?? 0) : 0;

  function getNodeState(skill: Skill): NodeState {
    if (!isTierUnlocked(skill.tier)) return 'locked';
    if (skill.id === selectedSkillId) return 'selected';
    if ((allocations[skill.id] ?? 0) > 0) return 'invested';
    return 'available';
  }

  function handleNodeClick(skillId: string) {
    setSelectedSkillId((prev) => (prev === skillId ? null : skillId));
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      {/* Tree Grid */}
      <div className="flex-1 min-w-0">
        {/* Chain header */}
        <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: '2.5rem repeat(4, 1fr)' }}>
          <div /> {/* tier label spacer */}
          {CHAINS.map((chain) => (
            <div key={chain} className="text-center">
              <span className="text-xs font-mono text-gray-500 uppercase">
                Chain {CHAIN_LABELS[chain as keyof typeof CHAIN_LABELS]}
              </span>
            </div>
          ))}
        </div>

        {/* Tier rows */}
        <div className="space-y-2">
          {tiersWithSkills.map((tier) => {
            const unlocked = isTierUnlocked(tier);
            return (
              <div key={tier} className="relative">
                {/* Locked overlay line */}
                {!unlocked && (
                  <div className="absolute inset-0 z-10 rounded-lg bg-gray-950/60 flex items-center justify-center pointer-events-none">
                    <span className="text-xs text-gray-600 font-mono bg-gray-950 px-2 py-0.5 rounded border border-gray-700">
                      T{tier} locked
                    </span>
                  </div>
                )}
                <div
                  className={`grid gap-2 items-start ${unlocked ? '' : 'pointer-events-none'}`}
                  style={{ gridTemplateColumns: '2.5rem repeat(4, 1fr)' }}
                >
                  {/* Tier label */}
                  <div className="flex items-center justify-center">
                    <span
                      className={`text-xs font-mono font-bold ${
                        unlocked ? 'text-gray-400' : 'text-gray-700'
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
  );
}
