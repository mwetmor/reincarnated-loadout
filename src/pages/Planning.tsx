import { Link } from 'react-router-dom';

const DOCS = [
  {
    to: '/planning/implementation-plan',
    title: 'Implementation Plan',
    badge: 'Mobile-critical',
    description: 'Exhaustive Pi infrastructure rollout plan for physical setup — phases, hardware inventory, network architecture, failure modes, and acceptance criteria.',
    size: '79 KB',
  },
  {
    to: '/planning/engine-analysis',
    title: 'Engine Analysis',
    badge: null,
    description: 'ARPG community substrate axis expansion + T4 capstone design implications — statistical analysis of 104 builds across 6 sites and 4 games.',
    size: '150 KB',
  },
  {
    to: '/planning/state-of-engine',
    title: 'State of Engine',
    badge: null,
    description: 'Current production engine state: Season 003 flow diagram — data flow, pipeline stages, and agent seam boundaries.',
    size: '49 KB',
  },
];

export function Planning() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <header className="mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-gray-500 mb-1">
          Reincarnated Project
        </p>
        <h1 className="text-2xl font-bold text-gray-100 tracking-tight">
          Planning Suite
        </h1>
        <p className="mt-2 text-sm text-gray-400 leading-relaxed">
          Reference documents for the Pi-infrastructure rollout and current engine design state.
          Optimised for mobile access during physical setup.
        </p>
      </header>

      <ul className="space-y-3">
        {DOCS.map((doc) => (
          <li key={doc.to}>
            <Link
              to={doc.to}
              className="block rounded-lg border border-gray-800 bg-gray-900 hover:border-gray-600 hover:bg-gray-800 transition-colors p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-1">
                <span className="font-semibold text-gray-100 text-base leading-snug">
                  {doc.title}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                  {doc.badge && (
                    <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-900/60 text-orange-300 border border-orange-800">
                      {doc.badge}
                    </span>
                  )}
                  <span className="text-[11px] font-mono text-gray-600">{doc.size}</span>
                </div>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">{doc.description}</p>
              <p className="mt-2 text-xs font-mono text-gray-600">{doc.to}</p>
            </Link>
          </li>
        ))}
      </ul>

      <footer className="mt-10 pt-6 border-t border-gray-800">
        <p className="text-xs text-gray-600 font-mono">
          Docs authored by gandalf — read-only on this surface.
          Last updated 2026-05-30.
        </p>
      </footer>
    </div>
  );
}
