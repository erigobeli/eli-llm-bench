import { NavLink, Outlet } from 'react-router-dom';

const NAV = [
  { to: '/', label: 'Início', end: true },
  { to: '/clientes', label: 'Clientes', end: false },
  { to: '/negocios', label: 'Negócios', end: false },
  { to: '/pipeline', label: 'Pipeline', end: false },
];

export function Layout() {
  return (
    <div className="app-shell">
      <header className="app-bar">
        <span className="app-bar__mark" aria-hidden="true">
          CB
        </span>
        <span className="app-bar__name">CRMBench Modelo</span>
        <span className="app-bar__meta">Gestão comercial</span>
      </header>

      <nav className="app-nav" aria-label="Navegação principal">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => (isActive ? 'app-nav__item is-active' : 'app-nav__item')}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
