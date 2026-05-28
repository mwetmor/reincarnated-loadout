import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ClassData } from '../data/types';
import { SP_BUDGET, MAX_SKILL_RANK, LS_KEY } from '../data/constants';
import { canInvest, canDivest, isTierUnlocked } from '../data/unlockRules';

// Part 3 — Per-kit build persistence (Dispatch B).
// localStorage schema (version 2 — Dispatch B):
//   {
//     version: 2,
//     classId: string,
//     seasonId: string,
//     allocations: Record<string, number>,   // current working state (auto-saved)
//     savedBuilds: Array<{                   // named manual snapshots
//       name: string,
//       allocations: Record<string, number>,
//       savedAt: string (ISO)
//     }>,
//     savedAt: string (ISO)
//   }
// Version 1 records (single-build; no savedBuilds) are migrated on load to version 2
// with an empty savedBuilds array. The current allocations are preserved.
//
// Auto-save behavior: allocations are auto-saved on invest/divest after AUTO_SAVE_DEBOUNCE_MS.
// Manual save (Save Build button) creates/updates a named snapshot in savedBuilds.
// Reset clears allocations to {} but does NOT clear savedBuilds (user can restore).

const AUTO_SAVE_DEBOUNCE_MS = 800;

export interface SavedBuild {
  name: string;
  allocations: Record<string, number>;
  savedAt: string;
}

interface StoredBuildState {
  version: 2;
  classId: string;
  seasonId: string;
  allocations: Record<string, number>;
  savedBuilds: SavedBuild[];
  savedAt: string;
}

function loadFromStorage(classId: string, seasonId: string): { allocations: Record<string, number>; savedBuilds: SavedBuild[] } {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { allocations: {}, savedBuilds: [] };
    const saved = JSON.parse(raw);
    // Version 1 migration: allocations present, version 1, matching class+season
    if (saved.version === 1 && saved.classId === classId && saved.seasonId === seasonId) {
      return { allocations: saved.allocations ?? {}, savedBuilds: [] };
    }
    // Version 2: full schema
    if (saved.version === 2 && saved.classId === classId && saved.seasonId === seasonId) {
      return { allocations: saved.allocations ?? {}, savedBuilds: saved.savedBuilds ?? [] };
    }
  } catch {
    // ignore corrupt storage
  }
  return { allocations: {}, savedBuilds: [] };
}

function saveToStorage(
  classId: string,
  seasonId: string,
  allocations: Record<string, number>,
  savedBuilds: SavedBuild[]
): void {
  try {
    const state: StoredBuildState = {
      version: 2,
      classId,
      seasonId,
      allocations,
      savedBuilds,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable — silently skip
  }
}

interface UseSkillBuildReturn {
  allocations: Record<string, number>;
  totalSP: number;
  remainingSP: number;
  invest: (skillId: string) => { ok: boolean; reason?: string };
  divest: (skillId: string) => { ok: boolean; reason?: string };
  reset: () => void;
  save: () => void;
  savedBuilds: SavedBuild[];
  loadBuild: (build: SavedBuild) => void;
  isTierUnlockedForClass: (tier: number, chainId?: string) => boolean;
  canInvestSkill: (skillId: string) => { ok: boolean; reason?: string };
  canDivestSkill: (skillId: string) => { ok: boolean; reason?: string };
}

export function useSkillBuild(
  classData: ClassData | null,
  seasonId: string,
  // Part 3 — URL param override: when present, seeds initial allocations from URL
  // (overrides localStorage). Caller passes parsed URL allocations on first render;
  // null on subsequent class changes (localStorage takes over). One-shot on mount.
  urlAllocations?: Record<string, number> | null
): UseSkillBuildReturn {
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [savedBuilds, setSavedBuilds] = useState<SavedBuild[]>([]);

  // Auto-save debounce ref (Part 3). Cleared on unmount / class change.
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted state when class changes.
  // Part 1 compliance: empty state ({}) is rank-0 — no pre-investment.
  // loadFromStorage returns {} when no prior state exists for this class+season.
  // Part 3 URL override: urlAllocations takes priority over localStorage on first class load.
  useEffect(() => {
    if (!classData) {
      setAllocations({});
      setSavedBuilds([]);
      return;
    }
    const { allocations: loaded, savedBuilds: loadedBuilds } = loadFromStorage(classData.id, seasonId);
    // URL params override localStorage (shareable build link takes priority)
    setAllocations(urlAllocations ?? loaded);
    setSavedBuilds(loadedBuilds);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classData?.id, seasonId]);
  // Note: urlAllocations intentionally excluded from deps — it's a one-shot init value
  // (parsed once from URL on mount). Including it would re-seed on every re-render.

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  const skills = classData?.skills ?? [];

  const totalSP = useMemo(
    () => Object.values(allocations).reduce((s, v) => s + v, 0),
    [allocations]
  );

  const remainingSP = SP_BUDGET - totalSP;

  const isTierUnlockedForClass = useCallback(
    (tier: number, chainId?: string) => isTierUnlocked(tier, allocations, skills, chainId),
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

  // Part 3 — auto-save helper: debounced write of current allocations + savedBuilds.
  // Called after invest/divest. Does NOT add to savedBuilds; just preserves working state.
  const scheduleAutoSave = useCallback(
    (nextAllocations: Record<string, number>, currentSavedBuilds: SavedBuild[]) => {
      if (!classData) return;
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        saveToStorage(classData.id, seasonId, nextAllocations, currentSavedBuilds);
      }, AUTO_SAVE_DEBOUNCE_MS);
    },
    [classData, seasonId]
  );

  const invest = useCallback(
    (skillId: string) => {
      const check = canInvest(skillId, allocations, skills, totalSP, SP_BUDGET, MAX_SKILL_RANK);
      if (!check.ok) return check;
      setAllocations((prev) => {
        const next = { ...prev, [skillId]: (prev[skillId] ?? 0) + 1 };
        scheduleAutoSave(next, savedBuilds);
        return next;
      });
      return { ok: true };
    },
    [allocations, skills, totalSP, savedBuilds, scheduleAutoSave]
  );

  const divest = useCallback(
    (skillId: string) => {
      const check = canDivest(skillId, allocations);
      if (!check.ok) return check;
      setAllocations((prev) => {
        const next = { ...prev, [skillId]: (prev[skillId] ?? 0) - 1 };
        if (next[skillId] <= 0) delete next[skillId];
        scheduleAutoSave(next, savedBuilds);
        return next;
      });
      return { ok: true };
    },
    [allocations, savedBuilds, scheduleAutoSave]
  );

  // Part 2 — reset: clears allocations to rank-0 {}; does NOT clear savedBuilds.
  // Per dispatch: "reset doesn't lose persisted state until next save."
  // Auto-saves the reset state (empty allocations) so next load is also rank-0.
  const reset = useCallback(() => {
    if (!classData) return;
    const empty: Record<string, number> = {};
    setAllocations(empty);
    scheduleAutoSave(empty, savedBuilds);
  }, [classData, savedBuilds, scheduleAutoSave]);

  // Part 3 — manual save: adds a named snapshot to savedBuilds.
  // Auto-increments name as "Build 1", "Build 2", etc.
  const save = useCallback(() => {
    if (!classData) return;
    const nextBuilds: SavedBuild[] = [
      ...savedBuilds,
      {
        name: `Build ${savedBuilds.length + 1}`,
        allocations: { ...allocations },
        savedAt: new Date().toISOString(),
      },
    ];
    setSavedBuilds(nextBuilds);
    saveToStorage(classData.id, seasonId, allocations, nextBuilds);
  }, [classData, seasonId, allocations, savedBuilds]);

  // Part 3 — load a previously saved named snapshot.
  const loadBuild = useCallback(
    (build: SavedBuild) => {
      setAllocations({ ...build.allocations });
      // auto-save the loaded state as working state (so it persists if browser closes)
      if (classData) {
        saveToStorage(classData.id, seasonId, build.allocations, savedBuilds);
      }
    },
    [classData, seasonId, savedBuilds]
  );

  return {
    allocations,
    totalSP,
    remainingSP,
    invest,
    divest,
    reset,
    save,
    savedBuilds,
    loadBuild,
    isTierUnlockedForClass,
    canInvestSkill,
    canDivestSkill,
  };
}
