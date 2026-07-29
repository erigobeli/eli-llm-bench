import { useEffect, useState } from "react";
import { fetchDashboard } from "../api/client";
import type { DashboardMetrics } from "../types";
import { formatCurrencyFromCents } from "../utils/format";
import { StatusView } from "../components/StatusView";

export function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchDashboard()
      .then((data) => {
        if (active) {
          setMetrics(data);
        }
      })
      .catch(() => {
        if (active) {
          setError("Não foi possível carregar os indicadores.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Visão geral</h1>
          <p className="page-subtitle">Indicadores principais do CRMBench Modelo.</p>
        </div>
      </div>

      <StatusView loading={loading} error={error} />

      {!loading && !error && metrics && (
        <div className="metrics-grid">
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
            <span className="metric-value">{formatCurrencyFromCents(metrics.pipelineValueInCents)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
