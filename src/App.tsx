import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Nav } from './components/Nav';
import { Loadout } from './pages/Loadout';
import { KitBrowser } from './pages/KitBrowser';
import { Sample } from './pages/Sample';
import { Pitch } from './pages/Pitch';
import { Analytics } from './pages/Analytics';
import { Encounters } from './pages/Encounters';
import { CourtBrowser } from './pages/CourtBrowser';
import { Planning } from './pages/Planning';
import { PlanningDoc } from './pages/PlanningDoc';
import { EngineState } from './pages/EngineState';
import { Forge } from './pages/Forge';
// cycle-18 recovery-2: KitBrowser at /kits preserves cycle-18 grid surface.
// /kit-space redirects to /kits (discovery surface); /loadout = rich per-character view.
// cosmograph Phase A (2026-06-06): /forge = forward-looking future-engine substrate cosmograph.

function Footer() {
  return (
    <footer className="border-t border-gray-800 mt-12 py-4 px-4 text-center">
      <p className="text-[10px] text-gray-700 font-mono leading-relaxed">
        Icons from{' '}
        <a
          href="https://game-icons.net"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-600 hover:text-gray-400 underline underline-offset-2"
        >
          game-icons.net
        </a>
        {' '}by Lorc, Delapouite &amp; contributors —{' '}
        <a
          href="https://creativecommons.org/licenses/by/3.0/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-600 hover:text-gray-400 underline underline-offset-2"
        >
          CC BY 3.0
        </a>
      </p>
    </footer>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <Nav />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Loadout />} />
            {/* cycle-18 recovery Fix A: explicit /loadout route so direct URL navigation resolves */}
            <Route path="/loadout" element={<Loadout />} />
            <Route path="/sample" element={<Sample />} />
            <Route path="/pitch" element={<Pitch />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/encounters" element={<Encounters />} />
            <Route path="/court" element={<CourtBrowser />} />
            <Route path="/planning" element={<Planning />} />
            <Route path="/planning/implementation-plan" element={<PlanningDoc src="/planning/implementation-plan.html" title="Implementation Plan" />} />
            <Route path="/planning/engine-analysis" element={<PlanningDoc src="/planning/engine-analysis.html" title="Engine Analysis" />} />
            <Route path="/planning/state-of-engine" element={<PlanningDoc src="/planning/state-of-engine.html" title="State of Engine" />} />
            <Route path="/state-of-engine" element={<EngineState />} />
            {/* cosmograph Phase A (2026-06-06): /forge = substrate cosmograph (PROVISIONAL future-engine view) */}
            <Route path="/forge" element={<Forge />} />
            {/* cycle-18 recovery-2: /kits = kit browser (grid/featured/faction filter) */}
            <Route path="/kits" element={<KitBrowser />} />
            {/* /kit-space redirects to /kits (kit discovery surface) */}
            <Route path="/kit-space" element={<Navigate to="/kits" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
