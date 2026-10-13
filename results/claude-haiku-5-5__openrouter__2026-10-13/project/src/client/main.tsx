import { BrowserRouter, Route, Routes } from 'react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Layout } from './components.js';
import { ClientsPage } from './ClientsPage.js';
import { DashboardPage } from './DashboardPage.js';
import { DealsPage } from './DealsPage.js';
import { PipelinePage } from './PipelinePage.js';
import './styles.css';

function NotFoundPage() {
  return (
    <section className="panel">
      <h1>Página não encontrada</h1>
      <p className="muted">O endereço informado não existe nesta aplicação.</p>
    </section>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="clientes" element={<ClientsPage />} />
          <Route path="negocios" element={<DealsPage />} />
          <Route path="pipeline" element={<PipelinePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
