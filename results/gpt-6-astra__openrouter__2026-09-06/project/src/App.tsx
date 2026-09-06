import { useState } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import {
  BriefcaseBusiness,
  ChevronRight,
  Columns3,
  LayoutDashboard,
  PanelLeft,
  Users,
} from "lucide-react";
import { Notice, NoticeContext } from "./components";
import { Dashboard } from "./pages/Dashboard";
import { Clients } from "./pages/Clients";
import { Deals } from "./pages/Deals";
import { Pipeline } from "./pages/Pipeline";

const navigation = [
  { path: "/", label: "Visão geral", icon: LayoutDashboard },
  { path: "/clientes", label: "Clientes", icon: Users },
  { path: "/negocios", label: "Negócios", icon: BriefcaseBusiness },
  { path: "/pipeline", label: "Pipeline", icon: Columns3 },
];

export default function App() {
  const [notice, setNotice] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  const location = useLocation();
  const current =
    navigation.find((item) => item.path === location.pathname)?.label ||
    "Página não encontrada";
  return (
    <NoticeContext
      value={(message, error = false) => setNotice({ message, error })}
    >
      <a className="skip-link" href="#main-content">
        Pular para o conteúdo
      </a>
      <div className="app-shell">
        <aside className="sidebar">
          <Link to="/" className="brand" aria-label="CRMBench Modelo">
            <span className="brand-symbol">
              <PanelLeft size={21} />
            </span>
            <span>CRMBench Modelo</span>
          </Link>
          <div className="workspace-label">ÁREA DE TRABALHO</div>
          <nav className="main-nav" aria-label="Navegação principal">
            {navigation.map(({ path, label, icon: Icon }) => (
              <NavLink key={path} to={path} end={path === "/"}>
                <Icon size={19} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-footer">
            <span className="workspace-avatar">EC</span>
            <div>
              <strong>Equipe comercial</strong>
              <small>Workspace local</small>
            </div>
          </div>
        </aside>
        <div className="app-body">
          <div className="topbar">
            <div className="breadcrumb">
              <span>CRM</span>
              <ChevronRight size={14} />
              <strong>{current}</strong>
            </div>
            <span className="environment">
              <span />
              Ambiente local
            </span>
          </div>
          <main id="main-content" tabIndex={-1} key={location.pathname}>
            {notice && <Notice {...notice} onClose={() => setNotice(null)} />}
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clientes" element={<Clients />} />
              <Route path="/negocios" element={<Deals />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route
                path="*"
                element={
                  <div className="content-state">
                    <h1>Página não encontrada</h1>
                    <Link className="button" to="/">
                      Voltar à visão geral
                    </Link>
                  </div>
                }
              />
            </Routes>
          </main>
          <footer className="app-footer">
            <span>CRMBench Modelo</span>
            <span>Gestão de clientes e oportunidades</span>
          </footer>
        </div>
      </div>
    </NoticeContext>
  );
}
