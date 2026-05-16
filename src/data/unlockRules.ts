import type { Skill } from './types';
import { TIER_UNLOCK_THRESHOLDS } from './constants';

/**
 * SP invested in tiers strictly below `tier`.
 * If `chainId` is provided, counts only skills in that chain — enabling per-chain gate logic.
 */
export function spInTiersBelow(
  tier: number,
  allocations: Record<string, number>,
  skills: Skill[],
  chainId?: string
): number {
  return skills
    .filter((s) => s.tier < tier && (chainId === undefined || s.chain_id === chainId))
    .reduce((sum, s) => sum + (allocations[s.id] ?? 0), 0);
}

/**
 * Whether a tier is unlocked.
 * If `chainId` is provided, gate is evaluated per-chain (SP in that chain's lower tiers).
 * Without `chainId`, falls back to tree-wide count (used for read-only / summary views).
 */
export function isTierUnlocked(
  tier: number,
  allocations: Record<string, number>,
  skills: Skill[],
  chainId?: string
): boolean {
  if (tier <= 1) return true;
  const threshold = TIER_UNLOCK_THRESHOLDS[tier];
  if (threshold === undefined) return false;
  return spInTiersBelow(tier, allocations, skills, chainId) >= threshold;
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
  // Per-chain gate: check only this skill's chain's lower-tier SP
  if (!isTierUnlocked(skill.tier, allocations, skills, skill.chain_id)) {
    const threshold = TIER_UNLOCK_THRESHOLDS[skill.tier];
    const chainSP = spInTiersBelow(skill.tier, allocations, skills, skill.chain_id);
    return { ok: false, reason: `Tier ${skill.tier} locked — need ${threshold} SP in this chain's earlier tiers (have ${chainSP})` };
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
