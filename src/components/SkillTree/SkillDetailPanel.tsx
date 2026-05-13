import type { Skill, SeasonManifest } from '../../data/types';
import { ROLE_LABEL, ELEMENT_COLORS } from '../../data/constants';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';
import { Card } from '../ui/Card';
import { FlavorTip } from '../ui/FlavorTip';

interface SkillDetailPanelProps {
  skill: Skill | null;
  rank: number;
  manifest: SeasonManifest;
  canInvest: { ok: boolean; reason?: string };
  canDivest: { ok: boolean; reason?: string };
  onInvest: () => void;
  onDivest: () => void;
  onClose: () => void;
}

function resolveElementName(canonical: string, manifest: SeasonManifest): string {
  return manifest.elements[canonical]?.name ?? canonical;
}

function formatParam(key: string, val: number | string): string {
  if (key === 'duration_seconds') return `${val}s`;
  if (key === 'cooldown_seconds') return `${val}s`;
  if (key === 'percent') return `${Math.round((val as number) * 100)}%`;
  if (key === 'distance') return `${val}u`;
  if (key === 'stagger_seconds') return `stagger ${val}s`;
  if (key === 'magnitude') return `${val}`;
  if (key === 'element') return String(val);
  return `${val}`;
}

function formatEffectLine(effectName: string, params: Record<string, number | string>): string {
  const parts = Object.entries(params)
    .filter(([k]) => k !== 'element')
    .map(([k, v]) => formatParam(k, v));

  const label = effectName.replace(/_/g, ' ');
  return parts.length ? `${label}: ${parts.join(', ')}` : label;
}

export function SkillDetailPanel({
  skill,
  rank,
  manifest,
  canInvest,
  canDivest,
  onInvest,
  onDivest,
  onClose,
}: SkillDetailPanelProps) {
  if (!skill) {
    return (
      <Card className="h-full min-h-[200px] flex items-center justify-center">
        <p className="text-gray-600 text-sm text-center px-4">
          Tap a skill node to inspect it
        </p>
      </Card>
    );
  }

  const elName = resolveElementName(skill.canonical_element, manifest);
  const elColors = ELEMENT_COLORS[skill.canonical_element] ?? ELEMENT_COLORS['physical'];
  const displayName = skill.name ?? skill.id;
  const roleLabel = ROLE_LABEL[skill.role] ?? skill.role.replace(/_/g, ' ');

  return (
    <Card noPad className="overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 border-b border-gray-700 ${elColors.bg}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-100 leading-tight">{displayName}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              T{skill.tier} · Chain {skill.chain_id.replace('chain_', '').toUpperCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-lg flex-shrink-0 w-11 h-11 flex items-center justify-center rounded touch-manipulation"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-2">
          <Tag element={skill.canonical_element}>{elName}</Tag>
          <Tag>{roleLabel}</Tag>
        </div>

        {/* Flavor text — inline if short, modal (i) if long */}
        {skill.flavor_text && (
          <div className="mt-2">
            {skill.flavor_text.length <= 80 ? (
              <FlavorTip mode="inline">{skill.flavor_text}</FlavorTip>
            ) : (
              <div className="flex items-start gap-1.5">
                <p className="text-xs text-gray-600 italic leading-snug line-clamp-2 flex-1">
                  {skill.flavor_text.slice(0, 120)}…
                </p>
                <FlavorTip mode="modal" title={displayName} className="flex-shrink-0 mt-0.5">
                  {skill.flavor_text}
                </FlavorTip>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x divide-gray-700 border-b border-gray-700">
        <StatCell label="Energy" value={`${skill.energy_cost.toFixed(1)}`} />
        <StatCell label="Cooldown" value={`${skill.cooldown_seconds.toFixed(1)}s`} />
        <StatCell label="Scale ×" value={skill.scaling_coefficient.toFixed(4)} highlight />
      </div>

      {/* Effects */}
      <div className="px-4 py-3 space-y-1.5 border-b border-gray-700">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-mono">Effects</p>
        {skill.effects.length === 0 ? (
          <p className="text-xs text-gray-600">No effects data</p>
        ) : (
          skill.effects.map((eff, i) => (
            <div key={i} className="text-xs text-gray-300">
              <span className="text-gray-500">→</span>{' '}
              {formatEffectLine(eff.name, eff.params)}
            </div>
          ))
        )}
      </div>

      {/* SP controls */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500 font-mono">RANK</span>
          <span className="text-lg font-bold text-gray-100 font-mono">
            {rank} <span className="text-gray-600 text-sm">/ 15</span>
          </span>
        </div>

        {/* Rank bar */}
        <div className="flex gap-0.5 mb-3">
          {Array.from({ length: 15 }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i < rank ? 'bg-emerald-500' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            variant="danger"
            size="md"
            onClick={onDivest}
            disabled={!canDivest.ok}
            title={canDivest.reason}
            className="flex-1 justify-center"
          >
            − Remove
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onInvest}
            disabled={!canInvest.ok}
            title={canInvest.reason}
            className="flex-1 justify-center"
          >
            + Invest
          </Button>
        </div>

        {!canInvest.ok && canInvest.reason && (
          <p className="text-xs text-amber-500 mt-2 text-center">{canInvest.reason}</p>
        )}
      </div>
    </Card>
  );
}

function StatCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center py-2 px-1">
      <span className="text-[10px] text-gray-500 uppercase tracking-wide font-mono">{label}</span>
      <span className={`text-sm font-mono font-semibold mt-0.5 ${highlight ? 'text-violet-300' : 'text-gray-200'}`}>
        {value}
      </span>
    </div>
  );
}
