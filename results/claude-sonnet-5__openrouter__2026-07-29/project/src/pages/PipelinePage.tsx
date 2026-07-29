import { useEffect, useState } from "react";
import { fetchClients, fetchDeals, updateDeal } from "../api/client";
import type { Client, Deal, DealStage } from "../types";
import { DEAL_STAGES, STAGE_LABELS } from "../types";
import { StatusView } from "../components/StatusView";
import { formatCurrencyFromCents } from "../utils/format";

export function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);

  function loadData() {
    setLoading(true);
    setError(null);
    Promise.all([fetchDeals({ pageSize: 50 }), fetchClients({ pageSize: 50 })])
      .then(([dealsResult, clientsResult]) => {
        setDeals(dealsResult.data);
        setClients(clientsResult.data);
      })
      .catch(() => setError("Não foi possível carregar o pipeline."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  function clientName(clientId: number): string {
    return clients.find((client) => client.id === clientId)?.name ?? `Cliente #${clientId}`;
  }

  async function moveDeal(dealId: number, stage: DealStage) {
    setDeals((current) => current.map((deal) => (deal.id === dealId ? { ...deal, stage } : deal)));
    try {
      await updateDeal(dealId, { stage });
    } catch {
      loadData();
    }
  }

  function handleDragStart(event: React.DragEvent<HTMLDivElement>, dealId: number) {
    event.dataTransfer.setData("text/plain", String(dealId));
    event.dataTransfer.effectAllowed = "move";
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>, stage: DealStage) {
    event.preventDefault();
    setDragOverStage(null);
    const dealId = Number(event.dataTransfer.getData("text/plain"));
    if (Number.isInteger(dealId)) {
      moveDeal(dealId, stage);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pipeline</h1>
          <p className="page-subtitle">Arraste os cartões entre as colunas para atualizar a etapa.</p>
        </div>
      </div>

      <StatusView loading={loading} error={error} />

      {!loading && !error && (
        <div className="pipeline-board">
          {DEAL_STAGES.map((stage) => {
            const stageDeals = deals.filter((deal) => deal.stage === stage);
            return (
              <div
                key={stage}
                className={`pipeline-column${dragOverStage === stage ? " pipeline-column-active" : ""}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverStage(stage);
                }}
                onDragLeave={() => setDragOverStage((current) => (current === stage ? null : current))}
                onDrop={(event) => handleDrop(event, stage)}
              >
                <div className="pipeline-column-header">
                  <span>{STAGE_LABELS[stage]}</span>
                  <span className="pipeline-column-count">{stageDeals.length}</span>
                </div>
                <div className="pipeline-column-body">
                  {stageDeals.length === 0 && <div className="pipeline-empty">Sem negócios</div>}
                  {stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="pipeline-card"
                      data-testid="deal-card"
                      data-id={deal.id}
                      draggable
                      onDragStart={(event) => handleDragStart(event, deal.id)}
                    >
                      <div className="pipeline-card-title">{deal.title}</div>
                      <div className="pipeline-card-client">{clientName(deal.clientId)}</div>
                      <div className="pipeline-card-value">{formatCurrencyFromCents(deal.valueInCents)}</div>
                      <label className="pipeline-card-select-label" htmlFor={`stage-select-${deal.id}`}>
                        Mover para
                      </label>
                      <select
                        id={`stage-select-${deal.id}`}
                        name="stage"
                        className="input pipeline-card-select"
                        value={deal.stage}
                        onChange={(event) => moveDeal(deal.id, event.target.value as DealStage)}
                      >
                        {DEAL_STAGES.map((option) => (
                          <option key={option} value={option}>
                            {STAGE_LABELS[option]}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
