// EngineStatePageHeader — mirrors PageHeader from gandalf HTML scaffolding
// Phase α: status surface only. No trigger buttons.

import type { EngineSeasonSummary } from '../../data/engineStateTypes';

interface Props {
  summary: EngineSeasonSummary;
}

export function EngineStatePageHeader({ summary }: Props) {
  const seasonNumber = summary.season_id.replace('cycle-14-wave-5-season-', '');
  const generatedDate = summary.generated_at
    ? new Date(summary.generated_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      })
    : null;

  return (
    <header className="border-b-2 border-gray-200 pb-6 mb-8">
      <p className="text-xs font-mono uppercase tracking-widest text-gray-500 mb-1">
        State of the Engine · Reincarnated · Cycle 14 Wave 5
      </p>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight leading-tight mb-1">
        <span className="italic text-orange-600 font-semibold">
          {summary.wave_s_season_name_canonical || 'Season ' + seasonNumber}
        </span>
      </h1>
      <p className="text-sm text-gray-500 font-normal">
        Season {seasonNumber}
        {generatedDate && ` · generated ${generatedDate}`}
        {' · '}wall-clock {summary.wall_clock_seconds.toFixed(1)}s
        {summary.wave_s_ai_tell_compliance_score != null && (
          <> · AI-tell {summary.wave_s_ai_tell_compliance_score.toFixed(2)}{' '}
            <span className={`font-semibold ${summary.wave_s_final_compliance_status === 'ACCEPT' ? 'text-green-600' : 'text-red-500'}`}>
              {summary.wave_s_final_compliance_status}
            </span>
          </>
        )}
      </p>
      {summary.wave_s_season_name_thematic_tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {summary.wave_s_season_name_thematic_tags.map((tag) => (
            <span key={tag} className="text-[10px] font-mono uppercase tracking-wide bg-orange-50 text-orange-600 border border-orange-200 rounded px-1.5 py-0.5">
              {tag}
            </span>
          ))}
        </div>
      )}
    </header>
  );
}
