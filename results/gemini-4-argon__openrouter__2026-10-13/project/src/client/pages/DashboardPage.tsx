import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAllClients, fetchAllDeals, fetchDashboard } from '../api';
import {
  formatCurrency,
  PIPELINE_STAGES,
  STAGE_LABELS,
  type Client,
  type DashboardMetrics,
  type Deal,
} from '../types';

export function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [dashboardData, allDeals, allClients] = await Promise.all([
          fetchDashboard(),
          fetchAllDeals(),
          fetchAllClients(),
        ]);
        if (!active) return;
        setMetrics(dashboardData);
        setDeals(allDeals);
        setClients(allClients);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Erro ao carregar indicadores.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const clientMap = new Map(clients.map((c) => [c.id, c.name]));

  return (
    <div>
      <header className="page-header">
        <div className="page-header-titles">
          <p className="page-eyebrow">Painel executivo</p>
          <h1 className="page-title">Indicadores e visão geral</h1>
        </div>
        <div className="page-actions">
          <Link to="/clientes" className="btn">
            Gerenciar clientes
          </Link>
          <Link to="/negocios" className="btn">
            Gerenciar negócios
          </Link>
          <Link to="/pipeline" className="btn btn-primary">
            Abrir pipeline
          </Link>
        </div>
      </header>

      {error && (
        <div role="alert" className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {loading && !metrics ? (
        <div className="panel">
          <div className="state-box">Carregando indicadores...</div>
        </div>
      ) : (
        <>
          <section className="metrics-grid" aria-label="Indicadores principais">
            <div className="metric-card" data-testid="metric" data-metric="totalClients">
              <p className="metric-label">Total de clientes</p>
              <p className="metric-value">{metrics?.totalClients ?? 0}</p>
              <p className="metric-caption">Contas e contatos cadastrados na base</p>
            </div>

            <div className="metric-card" data-testid="metric" data-metric="openDeals">
              <p className="metric-label">Negócios abertos</p>
              <p className="metric-value">{metrics?.openDeals ?? 0}</p>
              <p className="metric-caption">Oportunidades em andamento no funil</p>
            </div>

            <div className="metric-card" data-testid="metric" data-metric="pipelineValueInCents">
              <p className="metric-label">Valor do pipeline aberto</p>
              <p className="metric-value">
                {formatCurrency(metrics?.pipelineValueInCents ?? 0)}
              </p>
              <p className="metric-caption">Soma dos negócios em Novo, Em contato e Proposta</p>
            </div>
          </section>

          <div className="panel" style={{ marginBottom: '12px' }}>
            <div className="panel-header">
              <h2 className="panel-title">Resumo por etapa do funil</h2>
              <Link to="/pipeline" className="btn btn-sm">
                Ver quadro completo
              </Link>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Etapa</th>
                    <th>Quantidade</th>
                    <th>Volume financeiro</th>
                  </tr>
                </thead>
                <tbody>
                  {PIPELINE_STAGES.map((st) => {
                    const stageDeals = deals.filter((d) => d.stage === st.stage);
                    const stageSum = stageDeals.reduce((acc, d) => acc + d.valueInCents, 0);
                    return (
                      <tr key={st.stage}>
                        <td>
                          <span className={`stage-badge stage-${st.stage}`}>{st.label}</span>
                        </td>
                        <td className="cell-primary">{stageDeals.length}</td>
                        <td className="cell-primary">{formatCurrency(stageSum)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Negócios recentes</h2>
              <Link to="/negocios" className="btn btn-sm">
                Ver todos os negócios
              </Link>
            </div>
            {deals.length === 0 ? (
              <div className="state-box">Nenhum negócio cadastrado no momento.</div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Título</th>
                      <th>Cliente</th>
                      <th>Etapa</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deals.slice(0, 5).map((deal) => (
                      <tr key={deal.id}>
                        <td className="cell-primary">{deal.title}</td>
                        <td>{clientMap.get(deal.clientId) || `Cliente #${deal.clientId}`}</td>
                        <td>
                          <span className={`stage-badge stage-${deal.stage}`}>
                            {STAGE_LABELS[deal.stage]}
                          </span>
                        </td>
                        <td className="cell-primary">{formatCurrency(deal.valueInCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
