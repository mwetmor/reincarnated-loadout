import { NavLink } from 'react-router-dom';

export function Nav() {
  return (
    <nav
      className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/90 backdrop-blur"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-gray-600 text-lg leading-none">⚙</span>
          <span className="text-sm font-semibold text-gray-300 tracking-wide hidden sm:block">
            Reincarnated
          </span>
        </div>

        <div className="flex items-center gap-1">
          <NavItem to="/pitch">Summary</NavItem>
          <NavItem to="/">Loadout</NavItem>
          <NavItem to="/sample">Sample</NavItem>
          <NavItem to="/analytics">Analytics</NavItem>
          <NavItem to="/encounters">Encounters</NavItem>
          <NavItem to="/court">Court</NavItem>
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
        `px-4 py-2.5 rounded text-sm font-medium transition-colors min-h-[44px] flex items-center ${
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
