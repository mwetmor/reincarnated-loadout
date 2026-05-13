import { useMemo } from 'react';
import type { ClassData, SeasonData, SeasonManifest } from '../data/types';

const manifestModules = import.meta.glob<{ default: SeasonManifest }>(
  '../../data/*/manifest.json',
  { eager: true }
);

const classModules = import.meta.glob<{ default: ClassData }>(
  '../../data/*/classes/*.json',
  { eager: true }
);

function buildSeasonMap(): Map<string, SeasonData> {
  const seasons = new Map<string, SeasonData>();

  for (const [path, mod] of Object.entries(manifestModules)) {
    const manifest = mod.default;
    const seasonId = manifest.season_id;

    // Derive the data-folder key from the path (e.g. "sample-season" or "season_001001")
    const folderMatch = path.match(/\/data\/([^/]+)\/manifest\.json$/);
    const folderKey = folderMatch ? folderMatch[1] : seasonId;

    const classes: ClassData[] = [];
    for (const [classPath, classMod] of Object.entries(classModules)) {
      if (classPath.includes(`/data/${folderKey}/classes/`)) {
        classes.push(classMod.default);
      }
    }

    // Sort classes by id for consistent ordering
    classes.sort((a, b) => a.id.localeCompare(b.id));

    seasons.set(folderKey, { seasonId: folderKey, manifest, classes });
  }

  return seasons;
}

const seasonMap = buildSeasonMap();

export function useSeasonData() {
  return useMemo(() => {
    const allSeasons = Array.from(seasonMap.values());

    // "sample-season" is the canonical current-season for Page 1
    const defaultSeason = seasonMap.get('sample-season') ?? allSeasons[0] ?? null;

    // For analytics: all seasons sorted chronologically by generated_at
    const analyticsSeasons = allSeasons
      .filter((s) => s.seasonId !== 'sample-season') // exclude the alias
      .sort((a, b) =>
        a.manifest.generated_at.localeCompare(b.manifest.generated_at)
      );

    return { defaultSeason, analyticsSeasons, allSeasons };
  }, []);
}
