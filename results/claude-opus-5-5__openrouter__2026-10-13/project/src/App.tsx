import { NavLink, Route, Routes } from "react-router-dom";
import { ToastProvider } from "./ui";
import DashboardPage from "./pages/DashboardPage";
import ClientsPage from "./pages/ClientsPage";
import DealsPage from "./pages/DealsPage";
import PipelinePage from "./pages/PipelinePage";

const NAV = [
  { to: "/", label: "Início", end: true },
  { to: "/clientes", label: "Clientes" },
  { to: "/negocios", label: "Negócios" },
  { to: "/pipeline", label: "Pipeline" },
];

export default function App() {
  return (
    <ToastProvider>
      <div className="app">
        <header className="topbar">
          <div className="topbar-inner">
            <NavLink to="/" className="brand" aria-label="CRMBench Modelo — início">
              <span className="brand-mark" aria-hidden="true">
                CB
              </span>
              <span className="brand-name">CRMBench Modelo</span>
            </NavLink>
          </div>
          <nav className="tabs" aria-label="Navegação principal">
            <div className="tabs-inner">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `tab${isActive ? " active" : ""}`}>
                  {n.label}
                </NavLink>
              ))}
            </div>
          </nav>
        </header>
        <main className="content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/clientes" element={<ClientsPage />} />
            <Route path="/negocios" element={<DealsPage />} />
            <Route path="/pipeline" element={<PipelinePage />} />
            <Route
              path="*"
              element={
                <div className="panel state state-empty">
                  <strong>Página não encontrada.</strong>
                  <NavLink to="/">Voltar ao início</NavLink>
                </div>
              }
            />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  );
}
