import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { STAGES, STAGE_LABELS, type Client, type DashboardMetrics, type Deal } from "../../../shared/types";
import { ApiError, api, fetchAllClients, fetchAllDeals } from "../api";
import { formatCents, formatDate } from "../format";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "../components/ui";

interface DashboardData {
  metrics: DashboardMetrics;
  deals: Deal[];
  clients: Client[];
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metrics, deals, clients] = await Promise.all([api.dashboard(), fetchAllDeals(), fetchAllClients()]);
      setData({ metrics, deals, clients });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar indicadores.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    document.title = "CRMBench Modelo";
  }, []);

  if (loading) return <LoadingState label="Carregando indicadores…" />;
  if (error || !data) return <ErrorState message={error ?? "Erro ao carregar."} onRetry={load} />;

  const { metrics, deals, clients } = data;
  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  const byStage = STAGES.map((s) => {
    const list = deals.filter((d) => d.stage === s);
    return { stage: s, count: list.length, value: list.reduce((acc, d) => acc + d.valueInCents, 0) };
  });
  const recent = [...deals].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);

  return (
    <>
      <PageHeader title="Visão geral" description="Indicadores atuais da carteira de clientes e negócios." />

      <section className="metrics" aria-label="Indicadores">
        <article className="metric-card" data-testid="metric" data-metric="totalClients">
          <span className="metric-label">Clientes</span>
          <strong className="metric-value">{metrics.totalClients}</strong>
          <Link to="/clientes" className="metric-link">
            Ver clientes
          </Link>
        </article>
        <article className="metric-card" data-testid="metric" data-metric="openDeals">
          <span className="metric-label">Negócios abertos</span>
          <strong className="metric-value">{metrics.openDeals}</strong>
          <Link to="/negocios" className="metric-link">
            Ver negócios
          </Link>
        </article>
        <article className="metric-card" data-testid="metric" data-metric="pipelineValueInCents">
          <span className="metric-label">Valor do pipeline aberto</span>
          <strong className="metric-value">{formatCents(metrics.pipelineValueInCents)}</strong>
          <Link to="/pipeline" className="metric-link">
            Ver pipeline
          </Link>
        </article>
      </section>

      <div className="grid-2">
        <section className="card">
          <header className="card-header">
            <h2 className="card-title">Negócios por etapa</h2>
          </header>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Etapa</th>
                  <th scope="col" className="num">
                    Qtd.
                  </th>
                  <th scope="col" className="num">
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody>
                {byStage.map((row) => (
                  <tr key={row.stage}>
                    <td>
                      <span className={`stage-badge stage-${row.stage}`}>{STAGE_LABELS[row.stage]}</span>
                    </td>
                    <td className="num">{row.count}</td>
                    <td className="num">{formatCents(row.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <header className="card-header">
            <h2 className="card-title">Atualizações recentes</h2>
            <Link to="/negocios" className="btn btn-sm">
              Todos os negócios
            </Link>
          </header>
          {recent.length === 0 ? (
            <EmptyState title="Nenhum negócio cadastrado" description="Crie o primeiro negócio na tela de Negócios." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Negócio</th>
                    <th scope="col">Cliente</th>
                    <th scope="col">Etapa</th>
                    <th scope="col" className="num">
                      Valor
                    </th>
                    <th scope="col">Atualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((d) => (
                    <tr key={d.id}>
                      <td>{d.title}</td>
                      <td>{clientName.get(d.clientId) ?? `#${d.clientId}`}</td>
                      <td>
                        <span className={`stage-badge stage-${d.stage}`}>{STAGE_LABELS[d.stage]}</span>
                      </td>
                      <td className="num">{formatCents(d.valueInCents)}</td>
                      <td>{formatDate(d.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
