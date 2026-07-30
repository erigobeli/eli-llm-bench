import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { EmptyState, ErrorState, LoadingState, StageBadge } from "../components/ui";
import { formatCents, formatDate } from "../format";
import { STAGES, STAGE_LABELS, type Client, type DashboardMetrics, type Deal } from "../types";

interface Overview {
  metrics: DashboardMetrics;
  deals: Deal[];
  clients: Client[];
}

export default function DashboardPage() {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    data: Overview | null;
  }>({ loading: true, error: null, data: null });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const [metrics, deals, clients] = await Promise.all([
        api.dashboard(),
        api.listDeals({ page: 1, pageSize: 50 }),
        api.listClients({ page: 1, pageSize: 50 }),
      ]);
      setState({
        loading: false,
        error: null,
        data: { metrics, deals: deals.data, clients: clients.data },
      });
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "Erro inesperado.",
        data: null,
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const clientName = (clientId: number) =>
    state.data?.clients.find((item) => item.id === clientId)?.name ??
    `Cliente #${clientId}`;

  return (
    <section className="page">
      <div className="page__header">
        <div>
          <p className="page__eyebrow">Visão geral</p>
          <h1 className="page__title">Indicadores comerciais</h1>
        </div>
        <Link className="btn btn--primary" to="/negocios">
          Gerenciar negócios
        </Link>
      </div>

      {state.loading ? <LoadingState label="Carregando indicadores..." /> : null}
      {state.error ? <ErrorState message={state.error} onRetry={load} /> : null}

      {state.data ? (
        <>
          <div className="metrics">
            <article className="metric-card" data-testid="metric" data-metric="totalClients">
              <span className="metric-card__label">Clientes cadastrados</span>
              <strong className="metric-card__value">
                {state.data.metrics.totalClients}
              </strong>
              <span className="metric-card__hint">Base ativa de contas</span>
            </article>
            <article className="metric-card" data-testid="metric" data-metric="openDeals">
              <span className="metric-card__label">Negócios abertos</span>
              <strong className="metric-card__value">
                {state.data.metrics.openDeals}
              </strong>
              <span className="metric-card__hint">Etapas diferentes de Fechado</span>
            </article>
            <article
              className="metric-card"
              data-testid="metric"
              data-metric="pipelineValueInCents"
            >
              <span className="metric-card__label">Valor do pipeline aberto</span>
              <strong className="metric-card__value">
                {formatCents(state.data.metrics.pipelineValueInCents)}
              </strong>
              <span className="metric-card__hint">
                {state.data.metrics.pipelineValueInCents} centavos
              </span>
            </article>
          </div>

          <div className="grid-2">
            <section className="card">
              <header className="card__header">
                <h2 className="card__title">Distribuição por etapa</h2>
                <Link className="link" to="/pipeline">
                  Ver pipeline
                </Link>
              </header>
              <table className="table table--compact">
                <thead>
                  <tr>
                    <th scope="col">Etapa</th>
                    <th scope="col">Negócios</th>
                    <th scope="col" className="num">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {STAGES.map((stage) => {
                    const deals = state.data!.deals.filter((item) => item.stage === stage);
                    const total = deals.reduce((acc, item) => acc + item.valueInCents, 0);
                    return (
                      <tr key={stage}>
                        <td>
                          <StageBadge stage={stage} label={STAGE_LABELS[stage]} />
                        </td>
                        <td>{deals.length}</td>
                        <td className="num">{formatCents(total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            <section className="card">
              <header className="card__header">
                <h2 className="card__title">Negócios recentes</h2>
                <Link className="link" to="/negocios">
                  Ver todos
                </Link>
              </header>
              {state.data.deals.length === 0 ? (
                <EmptyState
                  title="Nenhum negócio cadastrado"
                  description="Cadastre o primeiro negócio para acompanhar o pipeline."
                />
              ) : (
                <table className="table table--compact">
                  <thead>
                    <tr>
                      <th scope="col">Negócio</th>
                      <th scope="col" className="hide-sm">
                        Cliente
                      </th>
                      <th scope="col" className="hide-sm">
                        Criado em
                      </th>
                      <th scope="col" className="num">
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.data.deals.slice(0, 5).map((deal) => (
                      <tr key={deal.id}>
                        <td>
                          <span className="cell-title">{deal.title}</span>
                          <StageBadge stage={deal.stage} label={STAGE_LABELS[deal.stage]} />
                        </td>
                        <td className="hide-sm">{clientName(deal.clientId)}</td>
                        <td className="hide-sm">{formatDate(deal.createdAt)}</td>
                        <td className="num">{formatCents(deal.valueInCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        </>
      ) : null}
    </section>
  );
}
