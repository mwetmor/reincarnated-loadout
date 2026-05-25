// ProvenanceBadge — M5 (Cycle 11, MIGRATION.md v1.3)
// Renders source_library as a small provenance chip.
// engine_authored_gap_fill_v1 gets distinct amber warning styling (engine-synthesized weapon).
// All other known substrate libraries get neutral styling.
// Null source_library: renders nothing.

interface ProvenanceBadgeProps {
  sourceLibrary: string | null | undefined;
  className?: string;
}

// Human-readable labels for known source_library values.
const SOURCE_LIBRARY_LABELS: Record<string, string> = {
  engine_authored_gap_fill_v1: 'Engine fill',
  met_museum:                  'Met Museum',
  fextralife_ds2:              'Fextralife DS2',
  odin_army_tradoc:            'Odin Army',
  wikidata_named_weapon:       'Wikidata',
};

function getLabel(sourceLibrary: string): string {
  return SOURCE_LIBRARY_LABELS[sourceLibrary] ?? sourceLibrary;
}

export function ProvenanceBadge({ sourceLibrary, className = '' }: ProvenanceBadgeProps) {
  if (!sourceLibrary) return null;

  const isGapFill = sourceLibrary === 'engine_authored_gap_fill_v1';
  const label = getLabel(sourceLibrary);

  if (isGapFill) {
    // Distinct amber styling — engine-authored gap-fill weapon (not from substrate library).
    // Per Q1 RATIFIED: v1_scope boolean stays internal; source_library is the visible signal.
    return (
      <span
        title={`Weapon source: ${sourceLibrary}`}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono bg-amber-950 text-amber-400 border-amber-700 ${className}`}
      >
        <span className="text-amber-600">src</span>
        <span>{label}</span>
      </span>
    );
  }

  // Neutral styling for substrate library sources.
  return (
    <span
      title={`Weapon source: ${sourceLibrary}`}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono bg-gray-900 text-gray-400 border-gray-700 ${className}`}
    >
      <span className="text-gray-600">src</span>
      <span>{label}</span>
    </span>
  );
}
