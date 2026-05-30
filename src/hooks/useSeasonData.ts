import { useMemo } from 'react';
import type { ClassData, GearPoolEntry, SeasonData, SeasonManifest } from '../data/types';
// Cycle 14 adapter: transforms Wave 5 faction cluster + kit identity data → SeasonData shape.
// TODO(star-lord): remove CYCLE14_SEASON_DATA import when star-lord emits manifest.json + classes/*.json
//                  for cycle-14-wave-5-season-{001,002,003} (Cycle 15+ pipeline). At that point
//                  the seasons will appear via the existing glob patterns automatically.
import { CYCLE14_SEASON_DATA } from '../data/cycle14Adapter';

const manifestModules = import.meta.glob<{ default: SeasonManifest }>(
  '../../data/*/manifest.json',
  { eager: true }
);

const classModules = import.meta.glob<{ default: ClassData }>(
  '../../data/*/classes/*.json',
  { eager: true }
);

// TODO(drax): remove Yomi-fallback logic here when engine ships gear_pool.json for new seasons.
// Per-season gear pool glob — only seasons with gear_pool.json appear as entries.
// Yomi (season_002328) is the only real pool today; all other seasons fall back to empty array.
const gearPoolModules = import.meta.glob<{ default: GearPoolEntry[] }>(
  '../../data/*/gear_pool.json',
  { eager: true }
);

// Extract per-folder gear pool. Key = folder name (e.g. "season_002328").
// Seasons lacking gear_pool.json return an empty array — callers render no gear.
function resolveGearPool(folderKey: string): GearPoolEntry[] {
  const key = Object.keys(gearPoolModules).find((p) =>
    p.includes(`/data/${folderKey}/gear_pool.json`)
  );
  return key ? (gearPoolModules[key].default as unknown as GearPoolEntry[]) : [];
}

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

    const gearPool = resolveGearPool(folderKey);

    seasons.set(folderKey, { seasonId: folderKey, manifest, classes, gearPool });
  }

  return seasons;
}

const seasonMap = buildSeasonMap();

// Inject Cycle 14 adapter seasons into the season map.
// These are bridge entries: drax-side adapter output, not engine-emitted manifest+classes artifacts.
// TODO(star-lord): remove injection when engine emits manifest.json + classes/ for Cycle 14 seasons.
for (const cycle14Season of CYCLE14_SEASON_DATA) {
  if (!seasonMap.has(cycle14Season.seasonId)) {
    seasonMap.set(cycle14Season.seasonId, cycle14Season);
  }
}

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

    // For season picker dropdowns (Loadout / Sample): real seasons sorted chronologically.
    // sample-season excluded (alias); Yomi (002328) placed last for clarity.
    const selectableSeasons = analyticsSeasons.slice().sort((a, b) => {
      if (a.seasonId === 'season_002328') return 1;
      if (b.seasonId === 'season_002328') return -1;
      return a.manifest.generated_at.localeCompare(b.manifest.generated_at);
    });

    return { defaultSeason, analyticsSeasons, allSeasons, selectableSeasons };
  }, []);
}
