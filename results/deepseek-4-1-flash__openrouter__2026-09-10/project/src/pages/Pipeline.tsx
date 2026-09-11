import { DragEvent, useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import Feedback from '../components/Feedback';
import type { FeedbackMessage } from '../components/Feedback';
import { formatCurrency, STAGE_LABELS, STAGES } from '../types';
import type { Client, Deal, Stage } from '../types';

export default function Pipeline() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clientMap, setClientMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dealsResponse, clientsResponse] = await Promise.all([
        api.deals.list({ pageSize: 50 }),
        api.clients.list({ pageSize: 50 }),
      ]);
      setDeals(dealsResponse.data);
      const map: Record<number, string> = {};
      for (const client of clientsResponse.data as Client[]) {
        map[client.id] = client.name;
      }
      setClientMap(map);
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erro ao carregar o pipeline.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const moveDeal = async (dealId: number, stage: Stage) => {
    const current = deals.find((deal) => deal.id === dealId);
    if (!current || current.stage === stage) return;
    setDeals((prev) =>
      prev.map((deal) => (deal.id === dealId ? { ...deal, stage } : deal))
    );
    try {
      await api.deals.update(dealId, { stage });
      setFeedback({
        type: 'success',
        text: `Negócio movido para ${STAGE_LABELS[stage]}.`,
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erro ao mover negócio.',
      });
      await load();
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, stage: Stage) => {
    event.preventDefault();
    setDragOverStage(null);
    const raw = event.dataTransfer.getData('text/plain');
    const id = Number.parseInt(raw, 10);
    if (Number.isFinite(id)) {
      void moveDeal(id, stage);
    }
    setDraggingId(null);
  };

  const total = deals.reduce((acc, deal) => acc + deal.valueInCents, 0);

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Pipeline</h1>
          <p className="page-sub">
            Arraste os cartões entre as colunas para atualizar a etapa
          </p>
        </div>
        <span className="pipeline-total">
          {deals.length} negócios · {formatCurrency(total)}
        </span>
      </header>

      <main className="content">
        <Feedback message={feedback} onClose={() => setFeedback(null)} />

        {loading ? (
          <div className="state-box" role="status">
            Carregando pipeline…
          </div>
        ) : (
          <div className="pipeline">
            {STAGES.map((stage) => {
              const stageDeals = deals.filter((deal) => deal.stage === stage);
              return (
                <section
                  key={stage}
                  className={`pipeline-col${
                    dragOverStage === stage ? ' drag-over' : ''
                  }`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOverStage(stage);
                  }}
                  onDragLeave={() => setDragOverStage(null)}
                  onDrop={(event) => handleDrop(event, stage)}
                >
                  <header className="pipeline-col-head">
                    <span className={`stage-dot stage-${stage}`} aria-hidden="true" />
                    <h2>{STAGE_LABELS[stage]}</h2>
                    <span className="pipeline-count">{stageDeals.length}</span>
                  </header>

                  <div className="pipeline-cards">
                    {stageDeals.length === 0 ? (
                      <p className="pipeline-empty">Sem negócios</p>
                    ) : (
                      stageDeals.map((deal) => (
                        <article
                          key={deal.id}
                          className={`deal-card${
                            draggingId === deal.id ? ' dragging' : ''
                          }`}
                          data-testid="deal-card"
                          data-id={deal.id}
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.setData('text/plain', String(deal.id));
                            event.dataTransfer.effectAllowed = 'move';
                            setDraggingId(deal.id);
                          }}
                          onDragEnd={() => {
                            setDraggingId(null);
                            setDragOverStage(null);
                          }}
                        >
                          <h3 className="deal-card-title">{deal.title}</h3>
                          <p className="deal-card-client">
                            {clientMap[deal.clientId] ?? `Cliente #${deal.clientId}`}
                          </p>
                          <p className="deal-card-value">
                            {formatCurrency(deal.valueInCents)}
                          </p>
                          <div className="deal-card-foot">
                            <label
                              className="sr-only"
                              htmlFor={`deal-stage-${deal.id}`}
                            >
                              Etapa de {deal.title}
                            </label>
                            <select
                              id={`deal-stage-${deal.id}`}
                              name={`stage-${deal.id}`}
                              value={deal.stage}
                              onChange={(event) =>
                                void moveDeal(
                                  deal.id,
                                  event.target.value as Stage
                                )
                              }
                            >
                              {STAGES.map((option) => (
                                <option key={option} value={option}>
                                  {STAGE_LABELS[option]}
                                </option>
                              ))}
                            </select>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
