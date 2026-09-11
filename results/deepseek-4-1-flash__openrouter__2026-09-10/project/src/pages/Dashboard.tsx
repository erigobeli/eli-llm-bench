import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Feedback from '../components/Feedback';
import type { FeedbackMessage } from '../components/Feedback';
import {
  formatCurrency,
  formatDate,
  STAGE_LABELS,
} from '../types';
import type { DashboardMetrics, Deal } from '../types';

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsData, dealsData] = await Promise.all([
        api.dashboard(),
        api.deals.list({ pageSize: 5 }),
      ]);
      setMetrics(metricsData);
      setDeals(dealsData.data);
      setFeedback(null);
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erro ao carregar dados.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Visão geral</h1>
          <p className="page-sub">Resumo comercial do CRMBench Modelo</p>
        </div>
        <Link className="btn btn-primary" to="/negocios">
          Novo negócio
        </Link>
      </header>

      <main className="content">
        <Feedback message={feedback} onClose={() => setFeedback(null)} />

        <section className="metrics" aria-label="Indicadores">
          <div className="metric" data-testid="metric" data-metric="totalClients">
            <span className="metric-label">Clientes</span>
            <span className="metric-value">
              {loading || !metrics ? '—' : metrics.totalClients}
            </span>
            <span className="metric-hint">Total cadastrado</span>
          </div>
          <div className="metric" data-testid="metric" data-metric="openDeals">
            <span className="metric-label">Negócios abertos</span>
            <span className="metric-value">
              {loading || !metrics ? '—' : metrics.openDeals}
            </span>
            <span className="metric-hint">Etapas não fechadas</span>
          </div>
          <div
            className="metric"
            data-testid="metric"
            data-metric="pipelineValueInCents"
          >
            <span className="metric-label">Valor do pipeline</span>
            <span className="metric-value">
              {loading || !metrics
                ? '—'
                : formatCurrency(metrics.pipelineValueInCents)}
            </span>
            <span className="metric-hint">Negócios em aberto</span>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Negócios recentes</h2>
            <Link className="link" to="/pipeline">
              Ver pipeline
            </Link>
          </div>

          {loading ? (
            <div className="state-box" role="status">
              Carregando negócios…
            </div>
          ) : deals.length === 0 ? (
            <div className="state-box empty">Nenhum negócio cadastrado.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Etapa</th>
                    <th className="num">Valor</th>
                    <th>Atualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {deals.map((deal) => (
                    <tr key={deal.id}>
                      <td>{deal.title}</td>
                      <td>
                        <span className={`stage-tag stage-${deal.stage}`}>
                          {STAGE_LABELS[deal.stage]}
                        </span>
                      </td>
                      <td className="num">{formatCurrency(deal.valueInCents)}</td>
                      <td>{formatDate(deal.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
