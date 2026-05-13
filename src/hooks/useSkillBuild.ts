import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ClassData } from '../data/types';
import { SP_BUDGET, MAX_SKILL_RANK, LS_KEY } from '../data/constants';
import { canInvest, canDivest, isTierUnlocked } from '../data/unlockRules';

interface UseSkillBuildReturn {
  allocations: Record<string, number>;
  totalSP: number;
  remainingSP: number;
  invest: (skillId: string) => { ok: boolean; reason?: string };
  divest: (skillId: string) => { ok: boolean; reason?: string };
  reset: () => void;
  save: () => void;
  isTierUnlockedForClass: (tier: number) => boolean;
  canInvestSkill: (skillId: string) => { ok: boolean; reason?: string };
  canDivestSkill: (skillId: string) => { ok: boolean; reason?: string };
}

function loadFromStorage(classId: string, seasonId: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const saved = JSON.parse(raw);
    if (saved.version === 1 && saved.classId === classId && saved.seasonId === seasonId) {
      return saved.allocations ?? {};
    }
  } catch {
    // ignore corrupt storage
  }
  return {};
}

export function useSkillBuild(
  classData: ClassData | null,
  seasonId: string
): UseSkillBuildReturn {
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  // Load persisted state when class changes
  useEffect(() => {
    if (!classData) {
      setAllocations({});
      return;
    }
    setAllocations(loadFromStorage(classData.id, seasonId));
  }, [classData?.id, seasonId]);

  const skills = classData?.skills ?? [];

  const totalSP = useMemo(
    () => Object.values(allocations).reduce((s, v) => s + v, 0),
    [allocations]
  );

  const remainingSP = SP_BUDGET - totalSP;

  const isTierUnlockedForClass = useCallback(
    (tier: number) => isTierUnlocked(tier, allocations, skills),
    [allocations, skills]
  );

  const canInvestSkill = useCallback(
    (skillId: string) => canInvest(skillId, allocations, skills, totalSP, SP_BUDGET, MAX_SKILL_RANK),
    [allocations, skills, totalSP]
  );

  const canDivestSkill = useCallback(
    (skillId: string) => canDivest(skillId, allocations),
    [allocations]
  );

  const invest = useCallback(
    (skillId: string) => {
      const check = canInvest(skillId, allocations, skills, totalSP, SP_BUDGET, MAX_SKILL_RANK);
      if (!check.ok) return check;
      setAllocations((prev) => ({ ...prev, [skillId]: (prev[skillId] ?? 0) + 1 }));
      return { ok: true };
    },
    [allocations, skills, totalSP]
  );

  const divest = useCallback(
    (skillId: string) => {
      const check = canDivest(skillId, allocations);
      if (!check.ok) return check;
      setAllocations((prev) => {
        const next = { ...prev, [skillId]: (prev[skillId] ?? 0) - 1 };
        if (next[skillId] <= 0) delete next[skillId];
        return next;
      });
      return { ok: true };
    },
    [allocations]
  );

  const reset = useCallback(() => setAllocations({}), []);

  const save = useCallback(() => {
    if (!classData) return;
    const state = {
      version: 1,
      classId: classData.id,
      seasonId,
      allocations,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }, [classData, seasonId, allocations]);

  return {
    allocations,
    totalSP,
    remainingSP,
    invest,
    divest,
    reset,
    save,
    isTierUnlockedForClass,
    canInvestSkill,
    canDivestSkill,
  };
}
