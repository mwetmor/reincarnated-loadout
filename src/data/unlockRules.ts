import type { Skill } from './types';
import { TIER_UNLOCK_THRESHOLDS } from './constants';

export function spInTiersBelow(
  tier: number,
  allocations: Record<string, number>,
  skills: Skill[]
): number {
  return skills
    .filter((s) => s.tier < tier)
    .reduce((sum, s) => sum + (allocations[s.id] ?? 0), 0);
}

export function isTierUnlocked(
  tier: number,
  allocations: Record<string, number>,
  skills: Skill[]
): boolean {
  if (tier <= 1) return true;
  const threshold = TIER_UNLOCK_THRESHOLDS[tier];
  if (threshold === undefined) return false;
  return spInTiersBelow(tier, allocations, skills) >= threshold;
}

export function canInvest(
  skillId: string,
  allocations: Record<string, number>,
  skills: Skill[],
  totalSP: number,
  spBudget: number,
  maxRank: number
): { ok: boolean; reason?: string } {
  const skill = skills.find((s) => s.id === skillId);
  if (!skill) return { ok: false, reason: 'Skill not found' };

  const current = allocations[skillId] ?? 0;
  if (current >= maxRank) return { ok: false, reason: `Max rank (${maxRank}) reached` };
  if (totalSP >= spBudget) return { ok: false, reason: `SP budget (${spBudget}) exhausted` };
  if (!isTierUnlocked(skill.tier, allocations, skills)) {
    const threshold = TIER_UNLOCK_THRESHOLDS[skill.tier];
    const current = spInTiersBelow(skill.tier, allocations, skills);
    return { ok: false, reason: `Tier ${skill.tier} locked — need ${threshold} SP in earlier tiers (have ${current})` };
  }
  return { ok: true };
}

export function canDivest(
  skillId: string,
  allocations: Record<string, number>
): { ok: boolean; reason?: string } {
  const current = allocations[skillId] ?? 0;
  if (current <= 0) return { ok: false, reason: 'No SP invested' };
  return { ok: true };
}
