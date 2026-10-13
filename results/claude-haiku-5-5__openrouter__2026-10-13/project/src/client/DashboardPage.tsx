import { Link } from 'react-router';
import { api, useResource } from './api.js';
import { ErrorState, LoadingState, PageHeader } from './components.js';
import { formatCurrency } from './format.js';

export function DashboardPage() {
  const dashboard = useResource(() => api.dashboard(), []);

  return (
    <>
      <PageHeader
        title="Visão geral"
        description="Indicadores do funil comercial, calculados a partir dos dados salvos."
      />

      {dashboard.status === 'loading' && <LoadingState label="Carregando indicadores..." />}
      {dashboard.status === 'error' && (
        <ErrorState message={`Não foi possível carregar os indicadores: ${dashboard.error}`} onRetry={dashboard.reload} />
      )}

      {dashboard.status === 'ready' && dashboard.data && (
        <section className="metrics" aria-label="Indicadores">
          <article className="metric-card" data-testid="metric" data-metric="totalClients">
            <span className="metric-label">Clientes cadastrados</span>
            <strong className="metric-value">{dashboard.data.totalClients}</strong>
          </article>
          <article className="metric-card" data-testid="metric" data-metric="openDeals">
            <span className="metric-label">Negócios abertos</span>
            <strong className="metric-value">{dashboard.data.openDeals}</strong>
          </article>
          <article className="metric-card" data-testid="metric" data-metric="pipelineValueInCents">
            <span className="metric-label">Valor do pipeline aberto</span>
            <strong className="metric-value">{formatCurrency(dashboard.data.pipelineValueInCents)}</strong>
          </article>
        </section>
      )}

      <section className="panel">
        <h2>Atalhos</h2>
        <div className="shortcut-list">
          <Link to="/clientes" className="button button-secondary">
            Gerenciar clientes
          </Link>
          <Link to="/negocios" className="button button-secondary">
            Gerenciar negócios
          </Link>
          <Link to="/pipeline" className="button button-secondary">
            Abrir pipeline
          </Link>
        </div>
      </section>
    </>
  );
}
