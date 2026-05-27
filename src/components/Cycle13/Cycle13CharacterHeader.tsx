/**
 * Cycle13CharacterHeader.tsx — Character stat header for Cycle 13 characters
 *
 * Displays: attribute, element, resource_model, cohort_archetype, bc_tuple stats,
 * chain composition summary, WR bracket pass status.
 */
import type { Cycle13Character } from '../../data/cycle13Types';
import { deriveCharacterDisplayName } from '../../data/cycle13Types';

const ATTRIBUTE_COLOR: Record<string, string> = {
  STR: 'text-red-400 border-red-800',
  DEX: 'text-green-400 border-green-800',
  INT: 'text-blue-400 border-blue-800',
  WIS: 'text-purple-400 border-purple-800',
};

const ELEMENT_COLOR: Record<string, string> = {
  earth: 'text-lime-400',
  fire:  'text-orange-400',
  water: 'text-sky-400',
  wind:  'text-cyan-400',
};

const RESOURCE_BADGE: Record<string, string> = {
  cooldown: 'bg-sky-950/50 text-sky-400 border-sky-800',
  energy:   'bg-yellow-950/50 text-yellow-400 border-yellow-800',
  mana:     'bg-violet-950/50 text-violet-400 border-violet-800',
  stamina:  'bg-green-950/50 text-green-400 border-green-800',
  ki:       'bg-rose-950/50 text-rose-400 border-rose-800',
};

const ARCHETYPE_BADGE: Record<string, string> = {
  dps_min_maxer: 'text-red-400 border-red-800',
  balanced:      'text-gray-400 border-gray-700',
  defensive:     'text-blue-400 border-blue-800',
  hybrid:        'text-purple-400 border-purple-800',
};

function StatPill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="text-center">
      <p className={`text-xs font-mono font-bold ${color ?? 'text-gray-300'}`}>{value}</p>
      <p className="text-[9px] font-mono text-gray-600">{label}</p>
    </div>
  );
}

interface Cycle13CharacterHeaderProps {
  char: Cycle13Character;
}

export function Cycle13CharacterHeader({ char }: Cycle13CharacterHeaderProps) {
  const displayName = deriveCharacterDisplayName(char.character_id);
  const attrColor = ATTRIBUTE_COLOR[char.attribute] ?? 'text-gray-400 border-gray-700';
  const elColor = ELEMENT_COLOR[char.element] ?? 'text-gray-400';
  const bcTuple = char.bc_tuple;

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-100">{displayName}</h2>
          <p className="text-[10px] font-mono text-gray-600">{char.character_id}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {/* Attribute */}
            <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-mono font-bold ${attrColor} bg-gray-900/50`}>
              {char.attribute}
            </span>
            {/* Element */}
            <span className={`text-xs font-mono font-semibold ${elColor}`}>
              {char.element}
            </span>
            {/* Resource model */}
            <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-mono ${RESOURCE_BADGE[char.resource_model] ?? 'text-gray-400 border-gray-700'}`}>
              {char.resource_model}
            </span>
            {/* Cohort archetype */}
            <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-mono ${ARCHETYPE_BADGE[char.cohort_archetype] ?? 'text-gray-400 border-gray-700'}`}>
              {char.cohort_archetype.replace(/_/g, ' ')}
            </span>
            {/* WR bracket pass */}
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
              char.wr_bracket_pass === 1
                ? 'text-emerald-400 border-emerald-800 bg-emerald-950/30'
                : 'text-red-400 border-red-800'
            }`}>
              WR {char.wr_bracket_pass === 1 ? 'PASS' : 'FAIL'}
            </span>
          </div>
        </div>

        {/* BC Tuple stats */}
        <div className="flex gap-3 flex-shrink-0">
          <StatPill label="range" value={bcTuple.range} />
          <StatPill label="tempo" value={bcTuple.tempo} />
          <StatPill label="amplitude" value={bcTuple.amplitude} />
          <StatPill label="density" value={bcTuple.proxy_density} />
        </div>
      </div>

      {/* WR bracket details */}
      {char.wr_bracket_details && (
        <p className="text-[9px] font-mono text-gray-700">
          {char.wr_bracket_details.note} · {char.wr_bracket_details.total_legendaries_validated} legendaries validated
        </p>
      )}

      {/* T4 scope */}
      {char.t4_scope && (
        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-600">
          <span>T4 scope:</span>
          <span className="text-amber-400">{char.t4_scope.replace(/_/g, ' ')}</span>
          {char.scope_downscale_factor != null && (
            <span className="text-gray-700">
              (downscale ×{char.scope_downscale_factor.toFixed(2)})
            </span>
          )}
        </div>
      )}
    </div>
  );
}
