import { NavLink, Route, Routes } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { ClientsPage } from "./pages/ClientsPage";
import { DealsPage } from "./pages/DealsPage";
import { PipelinePage } from "./pages/PipelinePage";

export function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-brand">CRMBench Modelo</div>
        <nav className="app-nav" aria-label="Navegação principal">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "nav-link nav-link-active" : "nav-link")}>
            Visão geral
          </NavLink>
          <NavLink
            to="/clientes"
            className={({ isActive }) => (isActive ? "nav-link nav-link-active" : "nav-link")}
          >
            Clientes
          </NavLink>
          <NavLink
            to="/negocios"
            className={({ isActive }) => (isActive ? "nav-link nav-link-active" : "nav-link")}
          >
            Negócios
          </NavLink>
          <NavLink
            to="/pipeline"
            className={({ isActive }) => (isActive ? "nav-link nav-link-active" : "nav-link")}
          >
            Pipeline
          </NavLink>
        </nav>
      </header>
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clientes" element={<ClientsPage />} />
          <Route path="/negocios" element={<DealsPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
        </Routes>
      </main>
    </div>
  );
}
