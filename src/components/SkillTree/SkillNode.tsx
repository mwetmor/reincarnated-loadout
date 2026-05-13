import type { Skill } from '../../data/types';
import { ROLE_ABBREV, ELEMENT_COLORS } from '../../data/constants';

type NodeState = 'locked' | 'available' | 'selected' | 'invested';

interface SkillNodeProps {
  skill: Skill;
  state: NodeState;
  rank: number;
  seasonElementName: string;
  onClick: () => void;
}

const stateStyles: Record<NodeState, string> = {
  locked:    'bg-gray-850 border-gray-700 text-gray-600 cursor-not-allowed opacity-60',
  available: 'bg-gray-800 border-gray-600 text-gray-300 cursor-pointer hover:border-violet-500 hover:bg-gray-750',
  selected:  'bg-gray-800 border-violet-500 text-gray-100 cursor-pointer ring-1 ring-violet-500/40',
  invested:  'bg-gray-800 border-emerald-600 text-gray-100 cursor-pointer hover:border-emerald-400',
};

export function SkillNode({ skill, state, rank, seasonElementName, onClick }: SkillNodeProps) {
  const elColors = ELEMENT_COLORS[skill.canonical_element] ?? ELEMENT_COLORS['physical'];
  const abbrev = ROLE_ABBREV[skill.role] ?? skill.role.toUpperCase().slice(0, 4);
  const displayName = skill.name ?? skill.id;

  return (
    <button
      onClick={state !== 'locked' ? onClick : undefined}
      disabled={state === 'locked'}
      title={displayName}
      className={`
        relative flex flex-col items-center justify-center
        w-16 h-16 rounded-lg border-2 transition-all duration-150
        text-center select-none
        ${stateStyles[state]}
      `}
    >
      {/* Element color bar */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-lg ${elColors.bg.replace('bg-', 'bg-').replace('950', '600').replace('800', '500')}`} />

      {/* Role abbreviation */}
      <span className="text-xs font-bold font-mono leading-none">{abbrev}</span>

      {/* Element name */}
      <span className={`text-[9px] leading-none mt-0.5 font-mono ${elColors.text}`}>
        {seasonElementName}
      </span>

      {/* Scaling coef */}
      <span className="text-[9px] leading-none mt-0.5 text-gray-500 font-mono">
        ×{skill.scaling_coefficient.toFixed(2)}
      </span>

      {/* SP rank badge */}
      {rank > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-emerald-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
          {rank}
        </span>
      )}

      {/* Locked overlay icon */}
      {state === 'locked' && (
        <span className="absolute inset-0 flex items-center justify-center text-gray-700 text-lg">
          ⚿
        </span>
      )}
    </button>
  );
}
