import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  api,
  formatCurrency,
  formatDate,
  STAGE_LABELS,
  type DashboardMetrics,
  type Deal,
  type Client
} from "../api";
import { EmptyState, ErrorState, LoadingState } from "../ui";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentDeals, setRecentDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, deals, clientList] = await Promise.all([
        api.dashboard(),
        api.listDeals({ page: 1, pageSize: 5 }),
        api.listClients({ page: 1, pageSize: 50 })
      ]);
      setMetrics(m);
      setRecentDeals(deals.data);
      setClients(clientList.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar os indicadores.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState label="Carregando indicadores..." />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!metrics) return null;

  const clientName = (id: number) =>
    clients.find((c) => c.id === id)?.name ?? `Cliente #${id}`;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Visão geral</h1>
          <p>Resumo dos clientes e do pipeline comercial.</p>
        </div>
        <Link to="/pipeline" className="btn btn-primary">
          Abrir pipeline
        </Link>
      </div>

      <div className="metrics-grid">
        <div className="metric-card" data-testid="metric" data-metric="totalClients">
          <div className="metric-label">Total de clientes</div>
          <div className="metric-value">{metrics.totalClients}</div>
        </div>
        <div className="metric-card" data-testid="metric" data-metric="openDeals">
          <div className="metric-label">Negócios abertos</div>
          <div className="metric-value">{metrics.openDeals}</div>
        </div>
        <div className="metric-card" data-testid="metric" data-metric="pipelineValueInCents">
          <div className="metric-label">Valor do pipeline aberto</div>
          <div className="metric-value">{formatCurrency(metrics.pipelineValueInCents)}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-toolbar">
          <strong style={{ fontSize: "0.9rem" }}>Negócios recentes</strong>
        </div>
        {recentDeals.length === 0 ? (
          <EmptyState message="Nenhum negócio cadastrado até o momento." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Cliente</th>
                  <th>Etapa</th>
                  <th className="cell-number">Valor</th>
                  <th>Criado em</th>
                </tr>
              </thead>
              <tbody>
                {recentDeals.map((deal) => (
                  <tr key={deal.id}>
                    <td>{deal.title}</td>
                    <td className="cell-muted">{clientName(deal.clientId)}</td>
                    <td>
                      <span className={`badge badge-${deal.stage}`}>
                        {STAGE_LABELS[deal.stage]}
                      </span>
                    </td>
                    <td className="cell-number">{formatCurrency(deal.valueInCents)}</td>
                    <td className="cell-muted">{formatDate(deal.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
