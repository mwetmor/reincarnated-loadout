export function Analytics() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-20 flex flex-col items-center gap-4 text-center">
      <div className="w-16 h-16 rounded-full border border-dashed border-gray-700 bg-gray-900 flex items-center justify-center text-3xl text-gray-700">
        ◈
      </div>
      <h1 className="text-lg font-semibold text-gray-400">Analytics Dashboard</h1>
      <p className="text-sm text-gray-600 max-w-sm leading-relaxed">
        Cross-season analytics land post-train-ride.
      </p>
      <div className="mt-4 text-left bg-gray-900 border border-gray-800 rounded-lg px-5 py-4 max-w-sm w-full space-y-1.5">
        <p className="text-xs font-mono text-gray-500 uppercase tracking-wide mb-3">Planned sections</p>
        {[
          'Summary cards — seasons, classes, archetypes',
          'Archetype distribution (bar chart)',
          'Element distribution (donut chart)',
          'Balance modifier spread by archetype',
          'Stat allocation radar by archetype',
          'Convergence iterations by archetype',
          'Season timeline — modifier compression over time',
          'Skill tree composition (stacked bar)',
          'Anchor diversity (heat map)',
        ].map((s) => (
          <div key={s} className="flex items-start gap-2">
            <span className="text-gray-700 mt-0.5 flex-shrink-0">○</span>
            <span className="text-xs text-gray-600 font-mono">{s}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-700 font-mono mt-2">
        Data ready: 5 seasons · 53 classes · season_001001–season_002328
      </p>
    </div>
  );
}
