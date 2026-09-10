import { NavLink, Route, Routes } from "react-router-dom";
import { ToastProvider } from "./components/Toast";
import { DashboardPage } from "./pages/DashboardPage";
import { ClientsPage } from "./pages/ClientsPage";
import { DealsPage } from "./pages/DealsPage";
import { PipelinePage } from "./pages/PipelinePage";

const NAV = [
  { to: "/", label: "Visão geral", end: true },
  { to: "/clientes", label: "Clientes" },
  { to: "/negocios", label: "Negócios" },
  { to: "/pipeline", label: "Pipeline" },
];

export function App() {
  return (
    <ToastProvider>
      <div className="app-shell">
        <header className="topbar">
          <div className="topbar-inner">
            <NavLink to="/" className="brand" aria-label="CRMBench Modelo - início">
              <span className="brand-mark" aria-hidden="true">
                CB
              </span>
              <span className="brand-name">CRMBench Modelo</span>
            </NavLink>
            <nav className="main-nav" aria-label="Navegação principal">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </header>
        <main className="page">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/clientes" element={<ClientsPage />} />
            <Route path="/negocios" element={<DealsPage />} />
            <Route path="/pipeline" element={<PipelinePage />} />
            <Route
              path="*"
              element={
                <section className="card">
                  <h1 className="page-title">Página não encontrada</h1>
                  <p>O endereço acessado não existe nesta aplicação.</p>
                </section>
              }
            />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  );
}
