import React, { useEffect, useState } from 'react';
import { getDashboard } from '../api.js';
import { DashboardMetrics } from '../../shared/types.js';
import { formatCurrencyBRL } from '../utils.js';
import { FeedbackBanner } from '../components/FeedbackBanner.js';

interface DashboardPageProps {
  onNavigate: (path: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const data = await getDashboard();
        if (mounted) {
          setMetrics(data);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Erro ao carregar indicadores do dashboard.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Visão Geral</h1>
          <p className="page-subtitle">Indicadores consolidados do Mini CRM</p>
        </div>
      </div>

      {error && <FeedbackBanner type="error" message={error} onDismiss={() => setError(null)} />}

      {loading ? (
        <div className="state-loading">Carregando indicadores...</div>
      ) : metrics ? (
        <>
          <div className="metrics-grid">
            <div className="metric-card" data-testid="metric" data-metric="totalClients">
              <div className="metric-header">Total de Clientes</div>
              <div className="metric-value">{metrics.totalClients}</div>
              <div className="metric-footer">Clientes ativos na base</div>
            </div>

            <div className="metric-card" data-testid="metric" data-metric="openDeals">
              <div className="metric-header">Negócios Abertos</div>
              <div className="metric-value">{metrics.openDeals}</div>
              <div className="metric-footer">Nas etapas Novo, Contato e Proposta</div>
            </div>

            <div className="metric-card" data-testid="metric" data-metric="pipelineValueInCents">
              <div className="metric-header">Valor do Pipeline Aberto</div>
              <div className="metric-value">{formatCurrencyBRL(metrics.pipelineValueInCents)}</div>
              <div className="metric-footer">Soma dos negócios em andamento</div>
            </div>
          </div>

          <div className="panel" style={{ marginTop: '20px' }}>
            <div className="panel-header">
              <h2 className="panel-title">Ações Rápidas</h2>
            </div>
            <div style={{ padding: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => onNavigate('/clientes')}
              >
                Gerenciar Clientes
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => onNavigate('/negocios')}
              >
                Gerenciar Negócios
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onNavigate('/pipeline')}
              >
                Visualizar Pipeline
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="state-empty">Nenhum dado encontrado.</div>
      )}
    </div>
  );
};
