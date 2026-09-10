import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { ClientsPage } from './pages/ClientsPage.js';
import { DealsPage } from './pages/DealsPage.js';
import { PipelinePage } from './pages/PipelinePage.js';

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');
  const [searchParams, setSearchParams] = useState<URLSearchParams>(
    () => new URLSearchParams(window.location.search)
  );

  useEffect(() => {
    // REQ-UI-APP-NAME: Título do navegador deve ser exatamente "CRMBench Modelo"
    document.title = 'CRMBench Modelo';

    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname || '/');
      setSearchParams(new URLSearchParams(window.location.search));
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigate = (pathWithQuery: string) => {
    const url = new URL(pathWithQuery, window.location.origin);
    window.history.pushState({}, '', pathWithQuery);
    setCurrentPath(url.pathname);
    setSearchParams(new URLSearchParams(url.search));
    window.scrollTo(0, 0);
  };

  const renderContent = () => {
    if (currentPath === '/clientes') {
      return <ClientsPage onNavigate={navigate} />;
    }
    if (currentPath === '/negocios') {
      const clientIdStr = searchParams.get('clientId');
      const clientId = clientIdStr ? parseInt(clientIdStr, 10) : null;
      return <DealsPage initialClientId={clientId} onNavigate={navigate} />;
    }
    if (currentPath === '/pipeline') {
      return <PipelinePage onNavigate={navigate} />;
    }
    // Default: Visão Geral (/)
    return <DashboardPage onNavigate={navigate} />;
  };

  return (
    <div className="app-container">
      <Navbar currentPath={currentPath} onNavigate={navigate} />
      <main className="main-content">{renderContent()}</main>
    </div>
  );
};
