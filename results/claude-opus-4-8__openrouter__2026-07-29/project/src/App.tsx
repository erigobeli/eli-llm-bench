import { NavLink, Route, Routes } from "react-router-dom";
import { ToastProvider } from "./toast";
import DashboardPage from "./pages/DashboardPage";
import ClientsPage from "./pages/ClientsPage";
import DealsPage from "./pages/DealsPage";
import PipelinePage from "./pages/PipelinePage";

const NAV = [
  { to: "/", label: "Visão geral", end: true },
  { to: "/clientes", label: "Clientes", end: false },
  { to: "/negocios", label: "Negócios", end: false },
  { to: "/pipeline", label: "Pipeline", end: false },
];

export default function App() {
  return (
    <ToastProvider>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark">CB</span>
            <span className="brand-name">CRMBench Modelo</span>
          </div>
          <nav className="nav" aria-label="Navegação principal">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  "nav-link" + (isActive ? " active" : "")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/clientes" element={<ClientsPage />} />
            <Route path="/negocios" element={<DealsPage />} />
            <Route path="/pipeline" element={<PipelinePage />} />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  );
}
