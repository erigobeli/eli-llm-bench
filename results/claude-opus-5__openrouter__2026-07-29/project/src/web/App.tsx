import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { ToastProvider } from "./components/ui";
import ClientsPage from "./pages/ClientsPage";
import DashboardPage from "./pages/DashboardPage";
import DealsPage from "./pages/DealsPage";
import PipelinePage from "./pages/PipelinePage";

const NAV_ITEMS = [
  { to: "/", label: "Início" },
  { to: "/clientes", label: "Clientes" },
  { to: "/negocios", label: "Negócios" },
  { to: "/pipeline", label: "Pipeline" },
];

export default function App() {
  return (
    <ToastProvider>
      <div className="app">
        <header className="topbar">
          <div className="topbar__inner">
            <div className="brand">
              <span className="brand__mark" aria-hidden="true">
                CB
              </span>
              <span className="brand__name">CRMBench Modelo</span>
            </div>
            <span className="topbar__meta">Gestão comercial</span>
          </div>
          <nav className="tabs" aria-label="Navegação principal">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) => `tab${isActive ? " tab--active" : ""}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/clientes" element={<ClientsPage />} />
            <Route path="/negocios" element={<DealsPage />} />
            <Route path="/pipeline" element={<PipelinePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <footer className="footer">
          <span>CRMBench Modelo · dados armazenados localmente em SQLite</span>
        </footer>
      </div>
    </ToastProvider>
  );
}
