// EngineStateChronicle — EAA-7 engine page chronicle render
//
// Renders kit_space_chronicle.json events[] via existing EngineStatePipelineFlow
// section pattern (§ heading + description + white card container).
//
// AC coverage:
//   AC-1: engine page renders kit_space_chronicle event(s)
//   AC-2: kse_20260602_001 displays event_id + timestamp + event_scope +
//         kit_count + substrate_inputs_changed
//   AC-6: no regressions on existing engine page functionality
//
// LOCK O: adapts EngineStatePipelineFlow section pattern; no new UI component shell.
// Schema: reincarnated-engine/data/kit_space/chronicle/CHRONICLE_SCHEMA.md
// Types: src/data/kitSpaceTypes.ts (KitSpaceChronicleEvent, KitSpaceChronicle)

import type { KitSpaceChronicle, KitSpaceChronicleEvent } from '../../data/kitSpaceTypes';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(iso: string): string {
  // Show UTC date + time (no ms) e.g. "2026-06-02 20:05 UTC"
  try {
    const d = new Date(iso);
    const date = d.toISOString().slice(0, 10);
    const time = d.toISOString().slice(11, 16);
    return `${date} ${time} UTC`;
  } catch {
    return iso;
  }
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  'kit-space-expansion': 'Kit-Space Expansion',
  'realm-expansion':     'Realm Expansion',
  'reserved-future':     'Reserved',
};

function eventTypeLabel(type: string): string {
  return EVENT_TYPE_LABELS[type] ?? type;
}

// ---------------------------------------------------------------------------
// Single chronicle event card
// ---------------------------------------------------------------------------

interface EventCardProps {
  event: KitSpaceChronicleEvent;
  index: number;
}

function ChronicleEventCard({ event, index }: EventCardProps) {
  const isExpansion = event.event_type === 'kit-space-expansion';

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      {/* Header row */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Sequence badge */}
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
              isExpansion ? 'bg-teal-600' : 'bg-slate-400'
            }`}
          >
            {index + 1}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-gray-900 font-mono">
                {event.event_id}
              </span>
              <span
                className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                  isExpansion
                    ? 'text-teal-600 border-teal-200 bg-teal-50'
                    : 'text-slate-500 border-slate-200 bg-slate-50'
                }`}
              >
                {eventTypeLabel(event.event_type)}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-mono mt-0.5">
              {formatTimestamp(event.event_timestamp)}
            </p>
          </div>
        </div>

        {/* Kit count badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-2xl font-bold text-gray-900 leading-none">
            {event.kit_count}
          </span>
          <span className="text-[10px] text-gray-400 font-mono leading-snug">
            kits<br />generated
          </span>
        </div>
      </div>

      {/* Event scope */}
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-[11px] text-gray-500 font-mono uppercase tracking-wider mb-1">
          Scope
        </p>
        <p className="text-sm text-gray-700 leading-relaxed">
          {event.event_scope}
        </p>
      </div>

      {/* Substrate inputs changed */}
      {event.substrate_inputs_changed.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-[11px] text-gray-500 font-mono uppercase tracking-wider mb-1.5">
            Substrate inputs changed
          </p>
          <ul className="space-y-1">
            {event.substrate_inputs_changed.map((input, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-teal-400 text-xs mt-0.5 flex-shrink-0">+</span>
                <span className="text-[11px] text-gray-600 font-mono leading-snug">{input}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* QDX-5 distribution summary — present on event_008 */}
      {event.generation_parameters?.distribution_actual != null && (
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-[11px] text-gray-500 font-mono uppercase tracking-wider mb-1.5">
            Element distribution
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {Object.entries(event.generation_parameters.distribution_actual).sort().map(([el, count]) => (
              <span key={el} className="text-[11px] font-mono text-gray-600">
                {el}: <span className="text-gray-800 font-semibold">{count}</span>
              </span>
            ))}
            {event.generation_parameters.pct_physical_actual != null && (
              <span className="text-[11px] font-mono text-gray-400 ml-auto">
                {event.generation_parameters.pct_physical_actual}% physical
              </span>
            )}
          </div>
        </div>
      )}

      {/* QDX-5 pipeline metrics — present on event_008 */}
      {(event.generation_parameters?.n_factions != null ||
        event.generation_parameters?.pm1_algorithm != null ||
        event.generation_parameters?.wave_b_template_repeat_detected != null ||
        event.generation_parameters?.ws1a4_flavor_rate != null) && (
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-[11px] text-gray-500 font-mono uppercase tracking-wider mb-1.5">
            Pipeline metrics
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {event.generation_parameters?.n_factions != null && (
              <span className="text-[11px] font-mono text-gray-600">
                factions: <span className="text-gray-800 font-semibold">{event.generation_parameters.n_factions}</span>
              </span>
            )}
            {event.generation_parameters?.pm1_algorithm != null && (
              <span className="text-[11px] font-mono text-gray-600">
                clustering: <span className="text-gray-800">{event.generation_parameters.pm1_algorithm}</span>
              </span>
            )}
            {event.generation_parameters?.ws1a4_flavor_rate != null && (
              <span className="text-[11px] font-mono text-gray-600">
                flavor rate: <span className="text-gray-800">{(event.generation_parameters.ws1a4_flavor_rate * 100).toFixed(1)}%</span>
              </span>
            )}
            {event.generation_parameters?.ws1a4_physical_opt_out != null && (
              <span className="text-[11px] font-mono text-gray-600">
                physical opt-out: <span className="text-gray-800">{event.generation_parameters.ws1a4_physical_opt_out}</span>
              </span>
            )}
            {event.generation_parameters?.wave_b_template_repeat_detected != null && (
              <span className="text-[11px] font-mono text-gray-600">
                wave-b repeat: <span className={event.generation_parameters.wave_b_template_repeat_detected ? 'text-red-500' : 'text-green-600'}>
                  {event.generation_parameters.wave_b_template_repeat_detected ? 'detected' : 'none'}
                </span>
              </span>
            )}
            {event.generation_parameters?.t4_selection_active != null && (
              <span className="text-[11px] font-mono text-gray-600">
                t4 selection: <span className="text-gray-800">{event.generation_parameters.t4_selection_active ? 'active' : 'off'}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Provenance strip */}
      <div className="px-4 py-2.5 bg-gray-50 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400 font-mono">
        <span>engine: {event.engine_version_sha}</span>
        {event.lineage_tags?.substrate_provenance && (
          <span>substrate: {event.lineage_tags.substrate_provenance}</span>
        )}
        {event.generation_parameters?.seed != null && (
          <span>seed: {event.generation_parameters.seed}</span>
        )}
        {(event.generation_parameters?.generator ?? event.generation_parameters?.generator_path) && (
          <span>generator: {event.generation_parameters?.generator ?? event.generation_parameters?.generator_path}</span>
        )}
        {event.generation_parameters?.fire_mode != null && (
          <span>mode: {event.generation_parameters.fire_mode}</span>
        )}
        {event.skip_flags_active && event.skip_flags_active.length > 0 && (
          <span>skip: {event.skip_flags_active.join(', ')}</span>
        )}
        {/* QDX-5: use llm_cost_breakdown.total_usd when available; fall back to total_llm_cost_usd */}
        {(event.generation_parameters?.llm_cost_breakdown?.total_usd ?? event.generation_parameters?.total_llm_cost_usd) != null && (
          <span>
            llm cost: ${(
              (event.generation_parameters?.llm_cost_breakdown?.total_usd ?? event.generation_parameters?.total_llm_cost_usd) as number
            ).toFixed(4)}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main EngineStateChronicle section
// ---------------------------------------------------------------------------

interface Props {
  chronicle: KitSpaceChronicle;
}

export function EngineStateChronicle({ chronicle }: Props) {
  const { events } = chronicle;

  return (
    <section className="my-8">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">§ 2</span>
        <h2 className="text-lg font-bold text-gray-900 tracking-tight">
          Kit-Space Chronicle
        </h2>
      </div>
      <p className="text-sm text-gray-400 mb-4 max-w-[70ch]">
        Parameter-expansion events. Each entry records when the engine fired a kit-space expansion,
        which substrate inputs changed, and how many kits were generated.
        Schema v{chronicle.schema_version}. {events.length} event{events.length !== 1 ? 's' : ''} recorded.
      </p>

      {events.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-sm text-gray-400 font-mono">No chronicle events yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event, i) => (
            <ChronicleEventCard key={event.event_id} event={event} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
