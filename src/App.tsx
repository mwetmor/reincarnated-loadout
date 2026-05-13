import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Nav } from './components/Nav';
import { Loadout } from './pages/Loadout';
import { Sample } from './pages/Sample';
import { Analytics } from './pages/Analytics';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-gray-100" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <Nav />
        <Routes>
          <Route path="/" element={<Loadout />} />
          <Route path="/sample" element={<Sample />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
