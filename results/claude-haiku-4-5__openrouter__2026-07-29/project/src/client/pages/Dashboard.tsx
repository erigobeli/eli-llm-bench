import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { DashboardMetrics } from '../types';

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getDashboard();
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar indicadores');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading">Carregando...</div>
      ) : metrics ? (
        <div className="metrics">
          <div className="metric-card">
            <div className="metric-label">Clientes totais</div>
            <div className="metric-value" data-metric="totalClients">{metrics.totalClients}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Negócios abertos</div>
            <div className="metric-value" data-metric="openDeals">{metrics.openDeals}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Valor do pipeline</div>
            <div className="metric-value" data-metric="pipelineValue" style={{ fontSize: '24px' }}>
              {formatCurrency(metrics.pipelineValueInCents)}
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state">Nenhum dado disponível</div>
      )}
    </div>
  );
}
