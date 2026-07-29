import { useEffect, useState } from "react";
import { api, formatCurrency } from "../api";
import { Dashboard } from "../types";
import { ErrorState, Loading } from "../components";

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await api.getDashboard());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Visão geral</h1>
          <p className="page-subtitle">Indicadores do seu funil comercial.</p>
        </div>
      </header>

      {loading && <Loading />}
      {error && <ErrorState message={error} onRetry={load} />}

      {data && !loading && !error && (
        <div className="metrics-grid">
          <div className="metric-card" data-testid="metric" data-metric="totalClients">
            <span className="metric-label">Total de clientes</span>
            <span className="metric-value">{data.totalClients}</span>
          </div>
          <div className="metric-card" data-testid="metric" data-metric="openDeals">
            <span className="metric-label">Negócios abertos</span>
            <span className="metric-value">{data.openDeals}</span>
          </div>
          <div
            className="metric-card"
            data-testid="metric"
            data-metric="pipelineValueInCents"
          >
            <span className="metric-label">Valor do pipeline aberto</span>
            <span className="metric-value">
              {formatCurrency(data.pipelineValueInCents)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
