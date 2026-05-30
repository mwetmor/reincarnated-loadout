import { NavLink } from 'react-router-dom';

export function Nav() {
  return (
    <nav
      className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/90 backdrop-blur"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="max-w-6xl mx-auto px-2 sm:px-4 h-12 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-gray-600 text-lg leading-none">⚙</span>
          <span className="text-sm font-semibold text-gray-300 tracking-wide hidden sm:block">
            Reincarnated
          </span>
        </div>

        {/* Tab strip: scrollable on mobile (hidden scrollbar). Fade-right gradient on mobile
            signals overflow — all 6 tabs present; user swipes right to reach Court. */}
        <div className="relative flex-1 min-w-0">
          {/* Right-fade overflow indicator — visible only on mobile (hidden sm:block) */}
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-950/90 to-transparent sm:hidden z-10"
            aria-hidden="true"
          />
          <div
            className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none' }}
          >
            <NavItem to="/pitch">Summary</NavItem>
            <NavItem to="/">Loadout</NavItem>
            <NavItem to="/sample">Sample</NavItem>
            <NavItem to="/analytics">Analytics</NavItem>
            <NavItem to="/encounters">Encounters</NavItem>
            <NavItem to="/court">Court</NavItem>
            <NavItem to="/state-of-engine">Engine</NavItem>
            <NavItem to="/planning">Planning</NavItem>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `px-2.5 sm:px-4 py-2.5 rounded text-xs sm:text-sm font-medium transition-colors min-h-[44px] flex items-center flex-shrink-0 ${
          isActive
            ? 'bg-gray-800 text-gray-100'
            : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900'
        }`
      }
    >
      {children}
    </NavLink>
  );
}
