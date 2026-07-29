import { NavLink, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import ClientsPage from "./pages/ClientsPage";
import DealsPage from "./pages/DealsPage";
import PipelinePage from "./pages/PipelinePage";

const NAV_ITEMS = [
  { to: "/", label: "Visão geral", end: true },
  { to: "/clientes", label: "Clientes", end: false },
  { to: "/negocios", label: "Negócios", end: false },
  { to: "/pipeline", label: "Pipeline", end: false }
];

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <span className="brand">
            <span className="brand-mark" aria-hidden="true">CB</span>
            CRMBench Modelo
          </span>
          <nav className="app-nav" aria-label="Navegação principal">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  isActive ? "nav-link nav-link-active" : "nav-link"
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/clientes" element={<ClientsPage />} />
          <Route path="/negocios" element={<DealsPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="*" element={<DashboardPage />} />
        </Routes>
      </main>
    </div>
  );
}
