/**
 * Cycle13SampleSection.tsx — Cycle 13 character sample section
 *
 * Embedded in Sample.tsx below the existing season archive content.
 * Provides: 16 selectable characters + interactive skill tree + T4 selection + 11-slot gear display.
 *
 * Data source: public/data/cycle13/ (static JSON export from cycle13_characters.db)
 * Sentinel verified at export time (scripts/export_cycle13_json.py).
 *
 * Dispatch: 2026-05-27-drax-cycle-13-option-a-remediation-track-b-loadout-ui-extensions.md
 */
import { useState, useEffect, useCallback } from 'react';
import type { Cycle13Character } from '../../data/cycle13Types';
import { deriveCharacterDisplayName } from '../../data/cycle13Types';
import {
  useCycle13Characters,
  useCycle13Gear,
  useCycle13T4,
  buildInitialChainState,
  type ChainNodeState,
} from '../../hooks/useCycle13Data';
import { Cycle13CharacterHeader } from './Cycle13CharacterHeader';
import { Cycle13SkillTree } from './Cycle13SkillTree';
import { Cycle13GearDisplay } from './Cycle13GearDisplay';

// ── Character selector sidebar ──────────────────────────────────────────────

const ATTR_ORDER = ['STR', 'DEX', 'INT', 'WIS'] as const;
const ATTR_LABEL: Record<string, string> = { STR: 'STR', DEX: 'DEX', INT: 'INT', WIS: 'WIS' };
const ATTR_COLOR: Record<string, string> = {
  STR: 'text-red-400',
  DEX: 'text-green-400',
  INT: 'text-blue-400',
  WIS: 'text-purple-400',
};

interface CharacterSelectorProps {
  characters: Cycle13Character[];
  selectedId: string;
  onSelect: (id: string) => void;
}

function CharacterSelector({ characters, selectedId, onSelect }: CharacterSelectorProps) {
  // Group by attribute
  const byAttr = new Map<string, Cycle13Character[]>();
  for (const c of characters) {
    if (!byAttr.has(c.attribute)) byAttr.set(c.attribute, []);
    byAttr.get(c.attribute)!.push(c);
  }

  return (
    <div className="space-y-3">
      {ATTR_ORDER.map((attr) => {
        const group = byAttr.get(attr) ?? [];
        if (group.length === 0) return null;
        return (
          <div key={attr}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className={`text-[10px] font-mono font-bold ${ATTR_COLOR[attr]}`}>
                {ATTR_LABEL[attr]}
              </span>
              <span className="text-[9px] font-mono text-gray-700">
                {group[0].element}
              </span>
            </div>
            <div className="space-y-1">
              {group.map((c) => {
                const isSelected = c.character_id === selectedId;
                return (
                  <button
                    key={c.character_id}
                    onClick={() => onSelect(c.character_id)}
                    className={`w-full text-left px-2.5 py-2 rounded border text-[11px] font-mono transition-colors ${
                      isSelected
                        ? 'border-violet-500 bg-violet-950/40 text-gray-100'
                        : 'border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-400'
                    }`}
                  >
                    <span>{deriveCharacterDisplayName(c.character_id)}</span>
                    <span className={`ml-1 text-[9px] ${
                      c.resource_model === 'cooldown' ? 'text-sky-600' :
                      c.resource_model === 'energy' ? 'text-yellow-600' :
                      c.resource_model === 'mana' ? 'text-violet-600' :
                      'text-gray-700'
                    }`}>
                      {c.resource_model}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Section tabs ────────────────────────────────────────────────────────────

type CharTab = 'skill-tree' | 'gear';

// ── Main section ────────────────────────────────────────────────────────────

export function Cycle13SampleSection() {
  const charState = useCycle13Characters();
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CharTab>('skill-tree');

  // Per-character chain state (client-side only; no DB write)
  const [chainStates, setChainStates] = useState<Map<string, ChainNodeState[]>>(new Map());

  // Auto-select first character when loaded
  useEffect(() => {
    if (charState.status === 'ready' && charState.payload.characters.length > 0 && !selectedCharId) {
      setSelectedCharId(charState.payload.characters[0].character_id);
    }
  }, [charState, selectedCharId]);

  // Initialize chain state for a character if not yet present
  useEffect(() => {
    if (charState.status !== 'ready' || !selectedCharId) return;
    if (chainStates.has(selectedCharId)) return;
    const char = charState.payload.characters.find((c) => c.character_id === selectedCharId);
    if (!char) return;
    setChainStates((prev) => {
      const next = new Map(prev);
      next.set(selectedCharId, buildInitialChainState(char));
      return next;
    });
  }, [charState, selectedCharId, chainStates]);

  const gearState = useCycle13Gear(selectedCharId);
  const t4State = useCycle13T4(selectedCharId);

  const handleCharSelect = useCallback((id: string) => {
    setSelectedCharId(id);
    setActiveTab('skill-tree');
  }, []);

  const handleChainChange = useCallback(
    (chainId: string, field: 'passive' | 'active', value: number) => {
      if (!selectedCharId) return;
      setChainStates((prev) => {
        const next = new Map(prev);
        const chains = (prev.get(selectedCharId) ?? []).map((c) =>
          c.chainId === chainId ? { ...c, [field]: value } : c
        );
        next.set(selectedCharId, chains);
        return next;
      });
    },
    [selectedCharId]
  );

  // Block A4: one-T4-at-a-time constraint
  const handleT4Select = useCallback(
    (chainId: string) => {
      if (!selectedCharId) return;
      setChainStates((prev) => {
        const next = new Map(prev);
        const chains = (prev.get(selectedCharId) ?? []).map((c) => ({
          ...c,
          // Deselect all other T4s, select this chain's T4
          t4Selected: c.chainId === chainId ? true : false,
        }));
        next.set(selectedCharId, chains);
        return next;
      });
    },
    [selectedCharId]
  );

  const handleT4Deselect = useCallback(
    (chainId: string) => {
      if (!selectedCharId) return;
      setChainStates((prev) => {
        const next = new Map(prev);
        const chains = (prev.get(selectedCharId) ?? []).map((c) =>
          c.chainId === chainId ? { ...c, t4Selected: false } : c
        );
        next.set(selectedCharId, chains);
        return next;
      });
    },
    [selectedCharId]
  );

  // ── Loading / error states ────────────────────────────────────────────────

  if (charState.status === 'loading') {
    return (
      <div className="py-8 text-center text-gray-600 font-mono text-sm">
        Loading Cycle 13 characters...
      </div>
    );
  }

  if (charState.status === 'error') {
    return (
      <div className="py-8 text-center text-red-600 font-mono text-sm">
        Error loading cycle 13 data: {charState.message}
      </div>
    );
  }

  const { payload } = charState;
  const characters = payload.characters;
  const selectedChar = characters.find((c) => c.character_id === selectedCharId) ?? null;
  const currentChains = selectedCharId ? (chainStates.get(selectedCharId) ?? []) : [];

  return (
    <div className="space-y-4">
      {/* Section banner */}
      <div className="rounded-lg border border-amber-800 bg-amber-950/30 px-4 py-3 flex items-start gap-3">
        <span className="text-amber-400 text-lg flex-shrink-0 mt-0.5">◈</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-300">Cycle 13 Characters — DB View</p>
          <p className="text-xs text-amber-400/70 mt-1 leading-relaxed">
            {payload.season.character_count} endgame characters from season{' '}
            <span className="font-mono">{payload.season.season_id}</span> ({payload.season.scope}).
            WR bracket pass rate: {(payload.season.wr_bracket_pass_rate * 100).toFixed(1)}%.
            Interactive skill tree (Block A3/A4) + full gear display (11 slots × 10 tiers).
            State is client-side only — no DB writes.
          </p>
        </div>
      </div>

      {/* Layout: sidebar + main */}
      <div className="flex gap-4 items-start">
        {/* Character selector sidebar */}
        <div className="w-44 flex-shrink-0">
          <div className="text-[9px] font-mono text-gray-600 uppercase tracking-wide mb-2">
            {characters.length} Characters
          </div>
          <CharacterSelector
            characters={characters}
            selectedId={selectedCharId ?? ''}
            onSelect={handleCharSelect}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">
          {selectedChar ? (
            <>
              <Cycle13CharacterHeader char={selectedChar} />

              {/* Tab bar */}
              <div className="flex gap-1 border-b border-gray-800 pb-0">
                {(['skill-tree', 'gear'] as CharTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-2 text-xs font-mono rounded-t border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'border-violet-500 text-gray-200 bg-gray-900/40'
                        : 'border-transparent text-gray-600 hover:text-gray-400'
                    }`}
                  >
                    {tab === 'skill-tree' ? 'Skill Tree + T4' : 'Gear (11 slots)'}
                  </button>
                ))}
              </div>

              {/* Skill Tree tab */}
              {activeTab === 'skill-tree' && (
                <div className="space-y-3">
                  {t4State.status === 'loading' && (
                    <p className="text-[10px] font-mono text-gray-600">Loading T4 data...</p>
                  )}
                  {t4State.status === 'error' && (
                    <p className="text-[10px] font-mono text-red-600">T4 error: {t4State.message}</p>
                  )}
                  {currentChains.length > 0 && (
                    <Cycle13SkillTree
                      char={selectedChar}
                      t4Candidates={t4State.status === 'ready' ? t4State.candidates : []}
                      chains={currentChains}
                      onChainChange={handleChainChange}
                      onT4Select={handleT4Select}
                      onT4Deselect={handleT4Deselect}
                    />
                  )}
                </div>
              )}

              {/* Gear tab */}
              {activeTab === 'gear' && (
                <div>
                  {gearState.status === 'loading' && (
                    <p className="text-[10px] font-mono text-gray-600">Loading gear data...</p>
                  )}
                  {gearState.status === 'error' && (
                    <p className="text-[10px] font-mono text-red-600">Gear error: {gearState.message}</p>
                  )}
                  {gearState.status === 'ready' && (
                    <Cycle13GearDisplay gear={gearState.gear} />
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm font-mono text-gray-600">Select a character from the list.</p>
          )}
        </div>
      </div>
    </div>
  );
}
