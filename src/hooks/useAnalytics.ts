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
    };
  }, [analyticsSeasons]);
}
