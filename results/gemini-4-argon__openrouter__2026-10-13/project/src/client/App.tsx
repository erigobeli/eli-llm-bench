import React, { useEffect } from 'react';
import { BrowserRouter, NavLink, Route, Routes, Link } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { ClientsPage } from './pages/ClientsPage';
import { DealsPage } from './pages/DealsPage';
import { PipelinePage } from './pages/PipelinePage';

export function App() {
  useEffect(() => {
    document.title = 'CRMBench Modelo';
  }, []);

  return (
    <BrowserRouter>
      <header className="app-topbar">
        <div className="app-topbar-inner">
          <div className="brand-block">
            <span className="brand-mark" aria-hidden="true">
              CB
            </span>
            <Link to="/" className="brand-title">
              CRMBench Modelo
            </Link>
          </div>

          <nav className="app-nav" aria-label="Navegação principal">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              Visão geral
            </NavLink>
            <NavLink
              to="/clientes"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              Clientes
            </NavLink>
            <NavLink
              to="/negocios"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              Negócios
            </NavLink>
            <NavLink
              to="/pipeline"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              Pipeline
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/clientes" element={<ClientsPage />} />
          <Route path="/negocios" element={<DealsPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
