import { Link } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  CircleDollarSign,
  Plus,
  Users,
} from "lucide-react";
import {
  stages,
  type Client,
  type Deal,
  type Metrics,
} from "../../shared/types";
import { LoadState, PageHeader, StageBadge } from "../components";
import { date, money, stageLabels, useResource } from "../lib";

export function Dashboard() {
  const metrics = useResource<Metrics>("/api/dashboard");
  const deals = useResource<Deal[]>("/api/deals", 0, true);
  const clients = useResource<Client[]>("/api/clients", 0, true);
  const loading = metrics.loading || deals.loading || clients.loading;
  const error = metrics.error || deals.error || clients.error;
  const recent = [...(deals.data || [])]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);
  return (
    <>
      <PageHeader
        title="Visão geral"
        description="O panorama dos seus relacionamentos e oportunidades."
        action={
          <Link className="button button-primary" to="/negocios">
            <Plus size={17} />
            Gerenciar negócios
          </Link>
        }
      />
      <LoadState
        loading={loading}
        error={error}
        onRetry={() => {
          metrics.retry();
          deals.retry();
          clients.retry();
        }}
      >
        <div className="metrics-grid">
          <Link
            to="/clientes"
            className="metric-card"
            data-testid="metric"
            data-metric="totalClients"
          >
            <div>
              <span className="metric-label">Total de clientes</span>
              <strong className="metric-value">
                {metrics.data?.totalClients || 0}
              </strong>
              <span className="metric-description">
                Relacionamentos cadastrados
              </span>
            </div>
            <span className="metric-icon">
              <Users size={23} />
            </span>
          </Link>
          <Link
            to="/pipeline"
            className="metric-card"
            data-testid="metric"
            data-metric="openDeals"
          >
            <div>
              <span className="metric-label">Negócios abertos</span>
              <strong className="metric-value">
                {metrics.data?.openDeals || 0}
              </strong>
              <span className="metric-description">
                Oportunidades em andamento
              </span>
            </div>
            <span className="metric-icon">
              <BriefcaseBusiness size={23} />
            </span>
          </Link>
          <Link
            to="/pipeline"
            className="metric-card"
            data-testid="metric"
            data-metric="pipelineValueInCents"
          >
            <div>
              <span className="metric-label">Valor do pipeline</span>
              <strong className="metric-value">
                {money(metrics.data?.pipelineValueInCents || 0)}
              </strong>
              <span className="metric-description">
                Soma dos negócios em aberto
              </span>
            </div>
            <span className="metric-icon">
              <CircleDollarSign size={23} />
            </span>
          </Link>
        </div>
        <section className="panel overview-pipeline">
          <div className="panel-toolbar">
            <div className="section-title">
              <h2>Distribuição do pipeline</h2>
            </div>
            <Link className="text-button" to="/pipeline">
              Abrir pipeline
              <ArrowRight size={15} />
            </Link>
          </div>
          <div className="stage-overview">
            {stages.map((stage) => {
              const rows =
                deals.data?.filter((deal) => deal.stage === stage) || [];
              return (
                <Link
                  key={stage}
                  className={`stage-summary summary-${stage}`}
                  to={`/negocios?stage=${stage}`}
                >
                  <div>
                    <StageBadge stage={stage} />
                    <span className="count">{rows.length}</span>
                  </div>
                  <strong>
                    {money(
                      rows.reduce((sum, row) => sum + row.valueInCents, 0),
                    )}
                  </strong>
                  <div className="stage-track">
                    <span
                      style={{
                        width: `${(rows.length / Math.max(1, deals.data?.length || 0)) * 100}%`,
                      }}
                    />
                  </div>
                  <small>
                    {rows.length} {rows.length === 1 ? "negócio" : "negócios"}{" "}
                    {stage === "won" ? "concluídos" : "nesta etapa"}
                  </small>
                </Link>
              );
            })}
          </div>
        </section>
        <div className="overview-bottom">
          <section className="panel">
            <div className="panel-toolbar">
              <div className="section-title">
                <h2>Negócios recentes</h2>
              </div>
              <Link className="text-button" to="/negocios">
                Ver todos
                <ArrowRight size={15} />
              </Link>
            </div>
            {recent.length ? (
              <div className="recent-list">
                {recent.map((deal) => (
                  <Link
                    key={deal.id}
                    to={`/negocios?search=${encodeURIComponent(deal.title)}`}
                    className="recent-row"
                  >
                    <span className="recent-icon">
                      <BriefcaseBusiness size={17} />
                    </span>
                    <div className="recent-name">
                      <strong>{deal.title}</strong>
                      <small>
                        {
                          clients.data?.find(
                            (client) => client.id === deal.clientId,
                          )?.name
                        }{" "}
                        · {date(deal.updatedAt)}
                      </small>
                    </div>
                    <div className="recent-value">
                      <strong>{money(deal.valueInCents)}</strong>
                      <span>{stageLabels[deal.stage]}</span>
                    </div>
                    <ArrowRight size={15} className="recent-arrow" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="content-state">
                <BriefcaseBusiness size={27} />
                <strong>Nenhum negócio cadastrado</strong>
                <Link className="text-button" to="/negocios">
                  Criar primeiro negócio
                </Link>
              </div>
            )}
          </section>
          <section className="panel workspace-panel">
            <div className="panel-toolbar">
              <h2>Seu espaço de trabalho</h2>
            </div>
            <div className="workspace-content">
              <span className="workspace-illustration">
                <Users size={31} />
              </span>
              <h3>Relacionamentos em foco</h3>
              <p>
                Consulte seus clientes e encontre todas as oportunidades de cada
                contato em um só lugar.
              </p>
              <Link className="button" to="/clientes">
                Consultar clientes
                <ArrowRight size={16} />
              </Link>
            </div>
            <div className="workspace-note">
              Dados locais, salvos a cada alteração.
            </div>
          </section>
        </div>
      </LoadState>
    </>
  );
}
