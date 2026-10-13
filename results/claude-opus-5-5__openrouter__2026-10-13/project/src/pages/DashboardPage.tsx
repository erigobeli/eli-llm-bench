import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, STAGES, stageLabel, type Client, type Dashboard, type Deal } from "../api";
import { formatCurrency, formatDate } from "../format";
import { EmptyState, ErrorState, Loading, PageHeader } from "../ui";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Dashboard | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, d, c] = await Promise.all([api.dashboard(), api.allDeals(), api.allClients()]);
      setMetrics(m);
      setDeals(d);
      setClients(c);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const clientName = (id: number) => clients.find((c) => c.id === id)?.name ?? `Cliente #${id}`;
  const wonValue = deals.filter((d) => d.stage === "won").reduce((s, d) => s + d.valueInCents, 0);

  return (
    <div className="page">
      <PageHeader
        title="Visão geral"
        subtitle="Indicadores calculados a partir dos dados do CRM."
        actions={
          <Link to="/negocios" className="btn btn-primary">
            Ver negócios
          </Link>
        }
      />
      {loading && !metrics && <Loading label="Carregando indicadores…" />}
      {error && <ErrorState message={error} onRetry={load} />}
      {metrics && (
        <>
          <section className="metrics" aria-label="Indicadores">
            <div className="metric-card" data-testid="metric" data-metric="totalClients">
              <span className="metric-label">Total de clientes</span>
              <span className="metric-value">{metrics.totalClients}</span>
            </div>
            <div className="metric-card" data-testid="metric" data-metric="openDeals">
              <span className="metric-label">Negócios abertos</span>
              <span className="metric-value">{metrics.openDeals}</span>
            </div>
            <div className="metric-card" data-testid="metric" data-metric="pipelineValueInCents">
              <span className="metric-label">Valor do pipeline aberto</span>
              <span className="metric-value">{formatCurrency(metrics.pipelineValueInCents)}</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Valor fechado</span>
              <span className="metric-value">{formatCurrency(wonValue)}</span>
            </div>
          </section>

          <div className="grid-2">
            <section className="panel">
              <header className="panel-header">
                <h2>Pipeline por etapa</h2>
                <Link to="/pipeline" className="link">
                  Abrir pipeline
                </Link>
              </header>
              <table className="table table-static">
                <thead>
                  <tr>
                    <th>Etapa</th>
                    <th className="num">Negócios</th>
                    <th className="num">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {STAGES.map((s) => {
                    const list = deals.filter((d) => d.stage === s.value);
                    return (
                      <tr key={s.value}>
                        <td>
                          <span className={`badge badge-${s.value}`}>{s.label}</span>
                        </td>
                        <td className="num">{list.length}</td>
                        <td className="num">{formatCurrency(list.reduce((a, d) => a + d.valueInCents, 0))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            <section className="panel">
              <header className="panel-header">
                <h2>Negócios recentes</h2>
                <Link to="/negocios" className="link">
                  Ver todos
                </Link>
              </header>
              {deals.length === 0 ? (
                <EmptyState title="Nenhum negócio cadastrado." />
              ) : (
                <ul className="recent-list">
                  {deals.slice(0, 5).map((d) => (
                    <li key={d.id}>
                      <div className="recent-main">
                        <span className="recent-title">{d.title}</span>
                        <span className="muted">
                          {clientName(d.clientId)} · {formatDate(d.updatedAt)}
                        </span>
                      </div>
                      <div className="recent-side">
                        <span className="recent-value">{formatCurrency(d.valueInCents)}</span>
                        <span className={`badge badge-${d.stage}`}>{stageLabel(d.stage)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
