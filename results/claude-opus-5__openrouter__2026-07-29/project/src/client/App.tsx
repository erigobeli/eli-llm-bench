import React from 'react';
import ClientsPage from './pages/Clients';
import DashboardPage from './pages/Dashboard';
import DealsPage from './pages/Deals';
import PipelinePage from './pages/Pipeline';
import { Link, RouterProvider, ToastProvider, useRouter } from './ui';

const APP_NAME = 'CRMBench Modelo';

const NAV = [
  { to: '/', label: 'Painel' },
  { to: '/clientes', label: 'Clientes' },
  { to: '/negocios', label: 'Negócios' },
  { to: '/pipeline', label: 'Pipeline' },
];

function Shell() {
  const { path } = useRouter();

  const current = (() => {
    if (path === '/' || path === '') return <DashboardPage />;
    if (path.startsWith('/clientes')) return <ClientsPage />;
    if (path.startsWith('/negocios')) return <DealsPage />;
    if (path.startsWith('/pipeline')) return <PipelinePage />;
    return (
      <section className="page">
        <div className="card">
          <h1 className="notfound__title">Página não encontrada</h1>
          <p className="notfound__text">
            O endereço <code>{path}</code> não existe neste aplicativo.
          </p>
          <Link to="/" className="btn btn--primary">
            Voltar ao painel
          </Link>
        </div>
      </section>
    );
  })();

  const isActive = (to: string) =>
    to === '/' ? path === '/' || path === '' : path.startsWith(to);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__inner">
          <Link to="/" className="brand" aria-label={APP_NAME}>
            <span className="brand__mark" aria-hidden="true">
              CB
            </span>
            <span className="brand__name">{APP_NAME}</span>
          </Link>
          <p className="topbar__env">Ambiente local • SQLite</p>
        </div>
        <nav className="nav" aria-label="Navegação principal">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`nav__item${isActive(item.to) ? ' is-active' : ''}`}
              aria-current={isActive(item.to) ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="main" id="conteudo">
        {current}
      </main>

      <footer className="footer">
        <span>{APP_NAME}</span>
        <span>Gestão de clientes, negócios e pipeline comercial</span>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </RouterProvider>
  );
}
