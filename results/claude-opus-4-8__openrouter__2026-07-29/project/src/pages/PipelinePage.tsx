import { useCallback, useEffect, useState } from "react";
import { api, formatCurrency } from "../api";
import { Client, Deal, STAGES, STAGE_LABELS, Stage } from "../types";
import { EmptyState, ErrorState, Loading } from "../components";
import { useToast } from "../toast";

export default function PipelinePage() {
  const { notify } = useToast();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<Stage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dealsRes, clientsRes] = await Promise.all([
        api.listDeals({ pageSize: 50 }),
        api.listClients({ pageSize: 50 }),
      ]);
      setDeals(dealsRes.data);
      setClients(clientsRes.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const clientName = (id: number) =>
    clients.find((c) => c.id === id)?.name ?? `Cliente #${id}`;

  async function changeStage(deal: Deal, stage: Stage) {
    if (deal.stage === stage) return;
    const previous = deals;
    // optimistic update
    setDeals((prev) =>
      prev.map((d) => (d.id === deal.id ? { ...d, stage } : d))
    );
    try {
      await api.updateDeal(deal.id, { stage });
      notify("success", `"${deal.title}" movido para ${STAGE_LABELS[stage]}.`);
    } catch (err) {
      setDeals(previous);
      notify("error", (err as Error).message);
    }
  }

  function onDrop(stage: Stage) {
    setDragOver(null);
    const id = dragId;
    setDragId(null);
    if (id === null) return;
    const deal = deals.find((d) => d.id === id);
    if (deal) changeStage(deal, stage);
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Pipeline</h1>
          <p className="page-subtitle">
            Arraste um cartão ou use o seletor para mudar a etapa.
          </p>
        </div>
      </header>

      {loading && <Loading />}
      {error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && (
        <div className="pipeline">
          {STAGES.map((stage) => {
            const cards = deals.filter((d) => d.stage === stage);
            return (
              <section
                key={stage}
                className={
                  "pipeline-column" + (dragOver === stage ? " drag-over" : "")
                }
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(stage);
                }}
                onDragLeave={() => setDragOver((s) => (s === stage ? null : s))}
                onDrop={() => onDrop(stage)}
                aria-label={STAGE_LABELS[stage]}
              >
                <header className="pipeline-column-header">
                  <span className="pipeline-column-title">
                    {STAGE_LABELS[stage]}
                  </span>
                  <span className="pipeline-count">{cards.length}</span>
                </header>
                <div className="pipeline-cards">
                  {cards.length === 0 && (
                    <EmptyState message="Sem negócios nesta etapa." />
                  )}
                  {cards.map((d) => (
                    <article
                      key={d.id}
                      className="deal-card"
                      data-testid="deal-card"
                      data-id={d.id}
                      draggable
                      onDragStart={() => setDragId(d.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setDragOver(null);
                      }}
                    >
                      <span className="deal-card-title">{d.title}</span>
                      <span className="deal-card-client">
                        {clientName(d.clientId)}
                      </span>
                      <span className="deal-card-value">
                        {formatCurrency(d.valueInCents)}
                      </span>
                      <label className="deal-card-stage">
                        <span className="visually-hidden">
                          Mudar etapa de {d.title}
                        </span>
                        <select
                          className="input input-sm"
                          name="stage"
                          value={d.stage}
                          onChange={(e) =>
                            changeStage(d, e.target.value as Stage)
                          }
                        >
                          {STAGES.map((s) => (
                            <option key={s} value={s}>
                              {STAGE_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      </label>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
