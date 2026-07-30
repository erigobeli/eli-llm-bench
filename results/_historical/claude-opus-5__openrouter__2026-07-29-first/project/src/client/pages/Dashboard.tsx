import React, { useCallback, useEffect, useState } from 'react';
import {
  api,
  formatCurrency,
  STAGES,
  STAGE_LABELS,
  type Client,
  type DashboardMetrics,
  type Deal,
} from '../api';
import { EmptyState, ErrorState, Link, LoadingState, PageHeader, StageBadge } from '../ui';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metricsResult, dealsResult, clientsResult] = await Promise.all([
        api.dashboard(),
        api.listDeals({ page: 1, pageSize: 5 }),
        api.listClients({ page: 1, pageSize: 50 }),
      ]);
      setMetrics(metricsResult);
      setDeals(dealsResult.data);
      setClients(clientsResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const clientName = (id: number) => clients.find((client) => client.id === id)?.name ?? `#${id}`;

  const stageCounts = STAGES.map((stage) => ({
    stage,
    total: deals.filter((deal) => deal.stage === stage).length,
  }));

  return (
    <section className="page">
      <PageHeader
        eyebrow="Visão geral"
        title="Painel comercial"
        subtitle="Indicadores consolidados de clientes e negócios em andamento."
        actions={
          <Link to="/negocios" className="btn btn--primary">
            Ver negócios
          </Link>
        }
      />

      {loading ? <LoadingState label="Carregando indicadores…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && !error && metrics ? (
        <>
          <div className="metrics">
            <article className="card metric" data-testid="metric" data-metric="totalClients">
              <p className="metric__label">Clientes cadastrados</p>
              <p className="metric__value">{metrics.totalClients}</p>
              <p className="metric__hint">Base total de contas ativas no CRM.</p>
            </article>
            <article className="card metric" data-testid="metric" data-metric="openDeals">
              <p className="metric__label">Negócios abertos</p>
              <p className="metric__value">{metrics.openDeals}</p>
              <p className="metric__hint">Negócios fora da etapa Fechado.</p>
            </article>
            <article className="card metric" data-testid="metric" data-metric="pipelineValueInCents">
              <p className="metric__label">Valor do pipeline aberto</p>
              <p className="metric__value">{formatCurrency(metrics.pipelineValueInCents)}</p>
              <p className="metric__hint">Soma dos negócios ainda em negociação.</p>
            </article>
          </div>

          <div className="grid-2">
            <section className="card">
              <header className="card__head">
                <h2>Negócios recentes</h2>
                <Link to="/negocios" className="link">
                  Abrir listagem
                </Link>
              </header>
              {deals.length === 0 ? (
                <EmptyState
                  title="Nenhum negócio cadastrado"
                  hint="Crie o primeiro negócio na tela Negócios."
                />
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th scope="col">Negócio</th>
                        <th scope="col" className="col-secondary">
                          Cliente
                        </th>
                        <th scope="col">Etapa</th>
                        <th scope="col" className="num">
                          Valor
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {deals.map((deal) => (
                        <tr key={deal.id}>
                          <td>
                            <span className="cell-strong">{deal.title}</span>
                          </td>
                          <td className="col-secondary">{clientName(deal.clientId)}</td>
                          <td>
                            <StageBadge label={STAGE_LABELS[deal.stage]} stage={deal.stage} />
                          </td>
                          <td className="num">{formatCurrency(deal.valueInCents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="card">
              <header className="card__head">
                <h2>Distribuição por etapa</h2>
                <Link to="/pipeline" className="link">
                  Abrir pipeline
                </Link>
              </header>
              <ul className="stage-list">
                {stageCounts.map((item) => (
                  <li key={item.stage}>
                    <StageBadge label={STAGE_LABELS[item.stage]} stage={item.stage} />
                    <span className="stage-list__count">
                      {item.total} {item.total === 1 ? 'negócio recente' : 'negócios recentes'}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="card__foot">
                Base de {clients.length} {clients.length === 1 ? 'cliente' : 'clientes'} sincronizada
                com o banco SQLite local.
              </p>
            </section>
          </div>
        </>
      ) : null}
    </section>
  );
}
