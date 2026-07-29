import { useCallback, useEffect, useState, type DragEvent } from "react";
import {
  api,
  formatCurrency,
  STAGE_LABELS,
  STAGE_ORDER,
  type Client,
  type Deal,
  type Stage
} from "../api";
import { EmptyState, ErrorState, LoadingState, useToast } from "../ui";

export default function PipelinePage() {
  const { notify } = useToast();

  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dealsResult, clientsResult] = await Promise.all([
        api.listDeals({ page: 1, pageSize: 50 }),
        api.listClients({ page: 1, pageSize: 50 })
      ]);
      setDeals(dealsResult.data);
      setClients(clientsResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar o pipeline.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const clientName = (id: number) =>
    clients.find((c) => c.id === id)?.name ?? `Cliente #${id}`;

  const moveDeal = async (dealId: number, stage: Stage) => {
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === stage) return;
    const previous = deals;
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage } : d)));
    try {
      await api.updateDeal(dealId, { stage });
      notify("success", `Negócio movido para ${STAGE_LABELS[stage]}.`);
    } catch (err) {
      setDeals(previous);
      notify("error", err instanceof Error ? err.message : "Erro ao mover o negócio.");
    }
  };

  const onDragStart = (event: DragEvent<HTMLDivElement>, dealId: number) => {
    event.dataTransfer.setData("text/plain", String(dealId));
    event.dataTransfer.effectAllowed = "move";
  };

  const onDrop = (event: DragEvent<HTMLElement>, stage: Stage) => {
    event.preventDefault();
    setDragOverStage(null);
    const dealId = Number(event.dataTransfer.getData("text/plain"));
    if (Number.isInteger(dealId) && dealId > 0) {
      void moveDeal(dealId, stage);
    }
  };

  if (loading) return <LoadingState label="Carregando pipeline..." />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Pipeline</h1>
          <p>Arraste os cartões entre as colunas ou use o seletor de etapa.</p>
        </div>
      </div>

      <div className="pipeline-board">
        {STAGE_ORDER.map((stage) => {
          const columnDeals = deals.filter((deal) => deal.stage === stage);
          const columnTotal = columnDeals.reduce((sum, d) => sum + d.valueInCents, 0);
          return (
            <section
              key={stage}
              className={`pipeline-column${
                dragOverStage === stage ? " pipeline-column-dragover" : ""
              }`}
              aria-label={`Coluna ${STAGE_LABELS[stage]}`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOverStage(stage);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverStage(null);
                }
              }}
              onDrop={(e) => onDrop(e, stage)}
            >
              <header className="pipeline-column-header">
                <h2>
                  {STAGE_LABELS[stage]} ({columnDeals.length})
                </h2>
                <span className="pipeline-column-total">{formatCurrency(columnTotal)}</span>
              </header>
              <div className="pipeline-column-body">
                {columnDeals.length === 0 ? (
                  <div className="pipeline-empty">Nenhum negócio nesta etapa.</div>
                ) : (
                  columnDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="deal-card"
                      data-testid="deal-card"
                      data-id={deal.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, deal.id)}
                    >
                      <div className="deal-card-title">{deal.title}</div>
                      <div className="deal-card-client">{clientName(deal.clientId)}</div>
                      <div className="deal-card-footer">
                        <span className="deal-card-value">
                          {formatCurrency(deal.valueInCents)}
                        </span>
                        <label>
                          <span className="visually-hidden" style={{ display: "none" }}>
                            Etapa do negócio {deal.title}
                          </span>
                          <select
                            name={`stage-${deal.id}`}
                            aria-label={`Etapa do negócio ${deal.title}`}
                            value={deal.stage}
                            onChange={(e) => void moveDeal(deal.id, e.target.value as Stage)}
                          >
                            {STAGE_ORDER.map((s) => (
                              <option key={s} value={s}>
                                {STAGE_LABELS[s]}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      {deals.length === 0 ? (
        <EmptyState message="Nenhum negócio cadastrado para exibir no pipeline." />
      ) : null}
    </div>
  );
}
