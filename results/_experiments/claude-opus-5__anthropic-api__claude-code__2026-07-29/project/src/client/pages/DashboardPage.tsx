import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard, listAllClients, listAllDeals } from '../api';
import { EmptyState, ErrorState, LoadingState, PageHead, StageBadge } from '../components/Ui';
import { formatCurrency, formatDate } from '../format';
import { STAGES, STAGE_LABELS, type Client, type DashboardMetrics, type Deal } from '../types';

export function DashboardPage() {
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
        getDashboard(),
        listAllDeals(),
        listAllClients(),
      ]);
      setMetrics(metricsResult);
      setDeals(dealsResult);
      setClients(clientsResult);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erro desconhecido.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const clientName = (id: number) =>
    clients.find((client) => client.id === id)?.name ?? 'Cliente removido';

  const byStage = STAGES.map((stage) => {
    const items = deals.filter((deal) => deal.stage === stage);
    return {
      stage,
      count: items.length,
      value: items.reduce((sum, deal) => sum + deal.valueInCents, 0),
    };
  });
  const maxCount = Math.max(1, ...byStage.map((entry) => entry.count));
  const recent = [...deals].slice(0, 5);

  return (
    <>
      <PageHead
        eyebrow="Visão geral"
        title="Indicadores comerciais"
        subtitle="Acompanhe clientes, negócios abertos e o valor do pipeline."
        actions={
          <>
            <Link className="btn" to="/clientes">
              Ir para clientes
            </Link>
            <Link className="btn btn--primary" to="/negocios">
              Ir para negócios
            </Link>
          </>
        }
      />

      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {loading && !metrics ? (
        <div className="card">
          <LoadingState label="Carregando indicadores…" />
        </div>
      ) : null}

      {metrics ? (
        <>
          <section className="metric-grid" aria-label="Indicadores">
            <article className="metric" data-testid="metric" data-metric="totalClients">
              <div className="metric__label">Total de clientes</div>
              <div className="metric__value" data-testid="metric-value">
                {metrics.totalClients}
              </div>
              <div className="metric__note">Registros ativos na base</div>
            </article>
            <article className="metric" data-testid="metric" data-metric="openDeals">
              <div className="metric__label">Negócios abertos</div>
              <div className="metric__value" data-testid="metric-value">
                {metrics.openDeals}
              </div>
              <div className="metric__note">Etapas diferentes de Fechado</div>
            </article>
            <article className="metric" data-testid="metric" data-metric="pipelineValueInCents">
              <div className="metric__label">Valor do pipeline aberto</div>
              <div className="metric__value" data-testid="metric-value">
                {formatCurrency(metrics.pipelineValueInCents)}
              </div>
              <div className="metric__note">
                {metrics.pipelineValueInCents} centavos em oportunidades
              </div>
            </article>
          </section>

          <div className="overview-grid">
            <section className="card">
              <div className="card__head">
                <h2 className="card__title">Distribuição por etapa</h2>
                <span className="card__count">{deals.length} negócios</span>
              </div>
              <div className="card__body">
                {deals.length === 0 ? (
                  <EmptyState
                    title="Nenhum negócio cadastrado"
                    description="Cadastre um negócio para acompanhar o pipeline."
                  />
                ) : (
                  byStage.map((entry) => (
                    <div className="stage-bar" key={entry.stage}>
                      <span className="stage-bar__name">{STAGE_LABELS[entry.stage]}</span>
                      <span className="stage-bar__track">
                        <span
                          className="stage-bar__fill"
                          style={{ width: `${(entry.count / maxCount) * 100}%` }}
                        />
                      </span>
                      <span className="stage-bar__value">
                        {entry.count} · {formatCurrency(entry.value)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="card">
              <div className="card__head">
                <h2 className="card__title">Negócios recentes</h2>
                <Link className="btn btn--sm btn--link" to="/negocios">
                  Ver todos
                </Link>
              </div>
              {recent.length === 0 ? (
                <EmptyState title="Nada por aqui ainda" />
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th scope="col">Negócio</th>
                        <th scope="col" className="hide-sm">
                          Etapa
                        </th>
                        <th scope="col" className="num">
                          Valor
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((deal) => (
                        <tr key={deal.id}>
                          <td>
                            <div className="cell-main">{deal.title}</div>
                            <div className="cell-sub">
                              {clientName(deal.clientId)} · {formatDate(deal.createdAt)}
                            </div>
                          </td>
                          <td className="hide-sm">
                            <StageBadge stage={deal.stage} />
                          </td>
                          <td className="num">{formatCurrency(deal.valueInCents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}
    </>
  );
}
