import { useMemo } from 'react';
import { useSeasonData } from './useSeasonData';

export interface WinRateBin {
  label: string;
  regular: number;
  outlier: number;
}

export interface ArchetypeSeasonRow {
  season: string;
  seasonLabel: string;
  [archetype: string]: number | string;
}

export interface ModifierRange {
  archetype: string;
  label: string;
  min_val: number;
  range: number;
  mean: number;
  max: number;
}

export interface ElementSlice {
  element: string;
  label: string;
  count: number;
}

export interface IterRange {
  archetype: string;
  label: string;
  min_val: number;
  range: number;
  mean: number;
  max: number;
}

export interface EnergySlice {
  energy: string;
  label: string;
  count: number;
}

// Tier 3 chart types

/** Per-archetype average stat allocation as % of budget (270 points). */
export interface StatRadarEntry {
  archetype: string;
  label: string;
  strength: number;
  dexterity: number;
  intelligence: number;
  wisdom: number;
  vitality: number;
}

/** One data point on the season timeline. */
export interface SeasonTimelinePoint {
  season: string;
  label: string;
  anchorName: string;
  avgModifier: number;
  classCount: number;
}

/** Per-archetype avg skill count by tier (Yomi season only; older seasons lack tier field). */
export interface SkillTierBar {
  archetype: string;
  label: string;
  t1: number;
  t2: number;
  t3: number;
  t4: number;
}

export interface AnalyticsData {
  winRateBins: WinRateBin[];
  archetypeBySeasonRows: ArchetypeSeasonRow[];
  allArchetypes: string[];
  modifierRanges: ModifierRange[];
  elementSlices: ElementSlice[];
  iterRanges: IterRange[];
  energySlices: EnergySlice[];
  totalClasses: number;
  totalSeasons: number;
  // Tier 3
  statRadarEntries: StatRadarEntry[];
  globalStatAvg: Omit<StatRadarEntry, 'archetype' | 'label'>;
  seasonTimeline: SeasonTimelinePoint[];
  skillTierBars: SkillTierBar[];
}

function seasonLabel(id: string): string {
  if (id === 'season_002328') return 'Yomi';
  const m = id.match(/season_0*(\d+)/);
  return m ? `S${parseInt(m[1], 10)}` : id;
}

function archetypeLabel(tag: string): string {
  return tag.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function elementLabel(el: string): string {
  return el.charAt(0).toUpperCase() + el.slice(1);
}

function energyLabel(e: string): string {
  if (e === 'stamina-as-resource') return 'Stamina';
  return e.charAt(0).toUpperCase() + e.slice(1);
}

export { archetypeLabel };

export function useAnalytics(): AnalyticsData | null {
  const { analyticsSeasons } = useSeasonData();

  return useMemo(() => {
    if (!analyticsSeasons.length) return null;

    const allClasses = analyticsSeasons.flatMap((s) => s.classes);

    // 1. Win-rate histogram
    const BINS = [
      { label: '0.30–0.40', lo: 0.3, hi: 0.4 },
      { label: '0.40–0.50', lo: 0.4, hi: 0.5 },
      { label: '0.50–0.60', lo: 0.5, hi: 0.6 },
      { label: '0.60–0.70', lo: 0.6, hi: 0.7 },
      { label: '0.70+', lo: 0.7, hi: Infinity },
    ];
    const binCounts = BINS.map((b) => ({ ...b, regular: 0, outlier: 0 }));
    for (const cls of allClasses) {
      const bm = cls.balance_metadata;
      if (!bm) continue;
      const wr = bm.actual_winrate;
      const isOutlier = bm.target_winrate != null && bm.target_winrate !== 0.5;
      for (const bin of binCounts) {
        if (wr >= bin.lo && wr < bin.hi) {
          isOutlier ? bin.outlier++ : bin.regular++;
          break;
        }
      }
    }
    const winRateBins: WinRateBin[] = binCounts.map(({ label, regular, outlier }) => ({
      label,
      regular,
      outlier,
    }));

    // 2. Archetype distribution by season
    const archetypeSet = new Set<string>();
    for (const cls of allClasses) archetypeSet.add(cls.archetype_tag);
    const allArchetypes = Array.from(archetypeSet).sort();

    const archetypeBySeasonRows: ArchetypeSeasonRow[] = analyticsSeasons.map((s) => {
      const row: ArchetypeSeasonRow = { season: s.seasonId, seasonLabel: seasonLabel(s.seasonId) };
      for (const a of allArchetypes) row[a] = 0;
      for (const cls of s.classes) {
        row[cls.archetype_tag] = (row[cls.archetype_tag] as number) + 1;
      }
      return row;
    });

    // 3. Modifier range by archetype (floating bar data)
    const modMap = new Map<string, number[]>();
    for (const cls of allClasses) {
      const mod = cls.balance_metadata?.final_modifier;
      if (mod == null) continue;
      if (!modMap.has(cls.archetype_tag)) modMap.set(cls.archetype_tag, []);
      modMap.get(cls.archetype_tag)!.push(mod);
    }
    const modifierRanges: ModifierRange[] = Array.from(modMap.entries())
      .map(([arch, vals]) => {
        const mn = Math.min(...vals);
        const mx = Math.max(...vals);
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        return { archetype: arch, label: archetypeLabel(arch), min_val: mn, range: mx - mn, mean, max: mx };
      })
      .sort((a, b) => a.mean - b.mean);

    // 4. Element distribution
    const elemMap = new Map<string, number>();
    for (const cls of allClasses) {
      elemMap.set(cls.dominant_element, (elemMap.get(cls.dominant_element) ?? 0) + 1);
    }
    const elementSlices: ElementSlice[] = Array.from(elemMap.entries())
      .map(([element, count]) => ({ element, label: elementLabel(element), count }))
      .sort((a, b) => b.count - a.count);

    // 5. Convergence iterations by archetype
    const iterMap = new Map<string, number[]>();
    for (const cls of allClasses) {
      const iters = cls.balance_metadata?.convergence_iterations;
      if (iters == null) continue;
      if (!iterMap.has(cls.archetype_tag)) iterMap.set(cls.archetype_tag, []);
      iterMap.get(cls.archetype_tag)!.push(iters);
    }
    const iterRanges: IterRange[] = Array.from(iterMap.entries())
      .map(([arch, vals]) => {
        const mn = Math.min(...vals);
        const mx = Math.max(...vals);
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        return { archetype: arch, label: archetypeLabel(arch), min_val: mn, range: mx - mn, mean, max: mx };
      })
      .sort((a, b) => a.mean - b.mean);

    // 6. Energy type distribution
    const energyMap = new Map<string, number>();
    for (const cls of allClasses) {
      const e = cls.energy_type ?? 'unknown';
      energyMap.set(e, (energyMap.get(e) ?? 0) + 1);
    }
    const energySlices: EnergySlice[] = Array.from(energyMap.entries())
      .map(([energy, count]) => ({ energy, label: energyLabel(energy), count }))
      .sort((a, b) => b.count - a.count);

    // 7. Stat radar — avg stat allocation per archetype (values as % of 270-point budget)
    const STAT_BUDGET = 270;
    const statBuckets = new Map<string, { str: number[]; dex: number[]; int: number[]; wis: number[]; vit: number[] }>();
    for (const cls of allClasses) {
      const dist = cls.stat_distribution;
      if (!dist) continue;
      if (!statBuckets.has(cls.archetype_tag)) {
        statBuckets.set(cls.archetype_tag, { str: [], dex: [], int: [], wis: [], vit: [] });
      }
      const b = statBuckets.get(cls.archetype_tag)!;
      b.str.push(dist.strength);
      b.dex.push(dist.dexterity);
      b.int.push(dist.intelligence);
      b.wis.push(dist.wisdom);
      b.vit.push(dist.vitality);
    }

    const pct = (arr: number[]) =>
      arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length / STAT_BUDGET) * 1000) / 10 : 0;

    const statRadarEntries: StatRadarEntry[] = Array.from(statBuckets.entries())
      .map(([arch, b]) => ({
        archetype: arch,
        label: archetypeLabel(arch),
        strength: pct(b.str),
        dexterity: pct(b.dex),
        intelligence: pct(b.int),
        wisdom: pct(b.wis),
        vitality: pct(b.vit),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const allStr = allClasses.map((c) => c.stat_distribution?.strength ?? 0);
    const allDex = allClasses.map((c) => c.stat_distribution?.dexterity ?? 0);
    const allInt = allClasses.map((c) => c.stat_distribution?.intelligence ?? 0);
    const allWis = allClasses.map((c) => c.stat_distribution?.wisdom ?? 0);
    const allVit = allClasses.map((c) => c.stat_distribution?.vitality ?? 0);
    const globalStatAvg = {
      strength: pct(allStr),
      dexterity: pct(allDex),
      intelligence: pct(allInt),
      wisdom: pct(allWis),
      vitality: pct(allVit),
    };

    // 8. Season timeline — avg final_modifier per season (sorted chronologically)
    const seasonTimeline: SeasonTimelinePoint[] = analyticsSeasons.map((s) => {
      const mods = s.classes
        .map((c) => c.balance_metadata?.final_modifier)
        .filter((v): v is number => v != null);
      const avg = mods.length ? mods.reduce((a, b) => a + b, 0) / mods.length : 0;
      return {
        season: s.seasonId,
        label: seasonLabel(s.seasonId),
        anchorName: s.manifest.anchor?.name ?? s.seasonId,
        avgModifier: Math.round(avg * 10000) / 10000,
        classCount: s.classes.length,
      };
    });

    // 9. Skill tier composition — avg skill count per tier, per archetype
    //    Only seasons where skills carry a tier field (season_002328 / Yomi); older schemas skip.
    const tierBuckets = new Map<string, { t1: number[]; t2: number[]; t3: number[]; t4: number[] }>();
    for (const cls of allClasses) {
      if (!cls.skills?.length) continue;
      // Older season skills don't have a tier field; detect at runtime via cast
      const firstTier = (cls.skills[0] as { tier?: number }).tier;
      if (firstTier == null) continue;
      if (!tierBuckets.has(cls.archetype_tag)) {
        tierBuckets.set(cls.archetype_tag, { t1: [], t2: [], t3: [], t4: [] });
      }
      const b = tierBuckets.get(cls.archetype_tag)!;
      b.t1.push(cls.skills.filter((s) => s.tier === 1).length);
      b.t2.push(cls.skills.filter((s) => s.tier === 2).length);
      b.t3.push(cls.skills.filter((s) => s.tier === 3).length);
      b.t4.push(cls.skills.filter((s) => s.tier === 4).length);
    }

    const avgR = (arr: number[]) =>
      arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;

    const skillTierBars: SkillTierBar[] = Array.from(tierBuckets.entries())
      .map(([arch, b]) => ({
        archetype: arch,
        label: archetypeLabel(arch),
        t1: avgR(b.t1),
        t2: avgR(b.t2),
        t3: avgR(b.t3),
        t4: avgR(b.t4),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return {
      winRateBins,
      archetypeBySeasonRows,
      allArchetypes,
      modifierRanges,
      elementSlices,
      iterRanges,
      energySlices,
      totalClasses: allClasses.length,
      totalSeasons: analyticsSeasons.length,
      statRadarEntries,
      globalStatAvg,
      seasonTimeline,
      skillTierBars,
    };
  }, [analyticsSeasons]);
}
