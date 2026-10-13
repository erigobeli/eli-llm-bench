import { useState } from 'react';
import { LayoutDashboard, Users, BriefcaseBusiness, Columns3, PanelsTopLeft, ChevronRight } from 'lucide-react';
import { NavLink, Route, Routes, useLocation, Link } from 'react-router-dom';
import { FeedbackContext, Notice } from './components';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Deals from './pages/Deals';
import Pipeline from './pages/Pipeline';

const navigation = [
  { to: '/', label: 'Visão geral', icon: LayoutDashboard },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/negocios', label: 'Negócios', icon: BriefcaseBusiness },
  { to: '/pipeline', label: 'Pipeline', icon: Columns3 },
];
export default function App() {
  const location = useLocation();
  const current = navigation.find(item => item.to === location.pathname)?.label || 'Página';
  const [notice, setNotice] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  return <FeedbackContext.Provider value={(text, kind = 'success') => setNotice({ text, kind })}><div className="app-shell">
    <a href="#main" className="skip-link">Ir para o conteúdo</a>
    <aside className="sidebar"><Link to="/" className="brand"><span className="brand-symbol"><PanelsTopLeft size={22} /></span><span>CRMBench Modelo</span></Link>
      <div className="nav-caption">ÁREA COMERCIAL</div><nav aria-label="Navegação principal">{navigation.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}><Icon size={19} /><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><span className="workspace-mark">C</span><div><strong>Workspace comercial</strong><span>Mini CRM</span></div></div>
    </aside>
    <div className="workspace"><div className="topbar"><span>Comercial <ChevronRight size={14} /> <strong>{current}</strong></span><span className="workspace-label">Workspace local</span></div>
      <main id="main"><Notice text={notice?.text || ''} kind={notice?.kind} onClose={() => setNotice(null)} /><Routes>
        <Route path="/" element={<Dashboard />} /><Route path="/clientes" element={<Clients />} /><Route path="/negocios" element={<Deals />} /><Route path="/pipeline" element={<Pipeline />} />
        <Route path="*" element={<div className="panel not-found"><h1>Página não encontrada</h1><Link className="button primary" to="/">Ir para visão geral</Link></div>} />
      </Routes></main><footer className="app-footer">CRMBench Modelo<span>Gestão de clientes e negócios</span></footer>
    </div>
  </div></FeedbackContext.Provider>;
}
