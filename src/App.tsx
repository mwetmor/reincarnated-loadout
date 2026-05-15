import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Nav } from './components/Nav';
import { Loadout } from './pages/Loadout';
import { Sample } from './pages/Sample';
import { Analytics } from './pages/Analytics';
import { Encounters } from './pages/Encounters';

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
            <Route path="/sample" element={<Sample />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/encounters" element={<Encounters />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
