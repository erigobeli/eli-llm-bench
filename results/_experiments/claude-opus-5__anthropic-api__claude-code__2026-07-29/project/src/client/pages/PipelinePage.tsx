import { useCallback, useEffect, useState, type DragEvent } from 'react';
import { listAllClients, listAllDeals, updateDeal } from '../api';
import { useToast } from '../components/ToastProvider';
import { EmptyState, ErrorState, LoadingState, PageHead } from '../components/Ui';
import { formatCurrency } from '../format';
import { STAGES, STAGE_LABELS, type Client, type Deal, type Stage } from '../types';

export function PipelinePage() {
  const toast = useToast();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [overStage, setOverStage] = useState<Stage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dealsResult, clientsResult] = await Promise.all([listAllDeals(), listAllClients()]);
      setDeals(dealsResult);
      setClients(clientsResult);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erro desconhecido.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const clientName = (id: number) =>
    clients.find((client) => client.id === id)?.name ?? `Cliente #${id}`;

  async function moveDeal(deal: Deal, stage: Stage) {
    if (deal.stage === stage) return;
    const previous = deals;
    setDeals((current) =>
      current.map((item) => (item.id === deal.id ? { ...item, stage } : item)),
    );
    try {
      await updateDeal(deal.id, { stage });
      toast.success(`“${deal.title}” movido para ${STAGE_LABELS[stage]}.`);
      await load();
    } catch (cause) {
      setDeals(previous);
      toast.error(cause instanceof Error ? cause.message : 'Não foi possível mover o negócio.');
    }
  }

  function onDragStart(event: DragEvent<HTMLElement>, deal: Deal) {
    setDraggingId(deal.id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(deal.id));
    event.dataTransfer.setData('application/x-deal-id', String(deal.id));
  }

  function onDrop(event: DragEvent<HTMLElement>, stage: Stage) {
    event.preventDefault();
    setOverStage(null);
    const raw =
      event.dataTransfer.getData('application/x-deal-id') ||
      event.dataTransfer.getData('text/plain');
    const id = Number(raw || draggingId);
    setDraggingId(null);
    const deal = deals.find((item) => item.id === id);
    if (deal) void moveDeal(deal, stage);
  }

  const totalOpen = deals
    .filter((deal) => deal.stage !== 'won')
    .reduce((sum, deal) => sum + deal.valueInCents, 0);

  return (
    <>
      <PageHead
        eyebrow="Funil"
        title="Pipeline"
        subtitle="Arraste um cartão entre as colunas ou use o seletor para mudar a etapa."
        actions={
          <button type="button" className="btn" onClick={() => void load()} disabled={loading}>
            Atualizar
          </button>
        }
      />

      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {loading && deals.length === 0 ? (
        <div className="card">
          <LoadingState label="Carregando pipeline…" />
        </div>
      ) : null}

      {!error && !(loading && deals.length === 0) ? (
        <>
          <p className="page-head__sub" style={{ marginBottom: 10 }}>
            {deals.length} negócios no funil · {formatCurrency(totalOpen)} em aberto
          </p>
          <div className="pipeline" data-testid="pipeline">
            {STAGES.map((stage) => {
              const items = deals.filter((deal) => deal.stage === stage);
              const sum = items.reduce((total, deal) => total + deal.valueInCents, 0);
              return (
                <section
                  key={stage}
                  className={overStage === stage ? 'pipeline-col is-over' : 'pipeline-col'}
                  data-testid="pipeline-column"
                  data-stage={stage}
                  aria-label={`Coluna ${STAGE_LABELS[stage]}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    if (overStage !== stage) setOverStage(stage);
                  }}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setOverStage(stage);
                  }}
                  onDragLeave={(event) => {
                    if (event.currentTarget === event.target) setOverStage(null);
                  }}
                  onDrop={(event) => onDrop(event, stage)}
                >
                  <header className="pipeline-col__head">
                    <h2 className="pipeline-col__title">
                      <span>{STAGE_LABELS[stage]}</span>
                      <span>{items.length}</span>
                    </h2>
                    <div className="pipeline-col__sum">{formatCurrency(sum)}</div>
                  </header>
                  <div className="pipeline-col__body">
                    {items.length === 0 ? (
                      <EmptyState title="Sem negócios" />
                    ) : (
                      items.map((deal) => (
                        <article
                          key={deal.id}
                          className={
                            draggingId === deal.id ? 'deal-card is-dragging' : 'deal-card'
                          }
                          data-testid="deal-card"
                          data-id={deal.id}
                          data-stage={deal.stage}
                          draggable
                          onDragStart={(event) => onDragStart(event, deal)}
                          onDragEnd={() => {
                            setDraggingId(null);
                            setOverStage(null);
                          }}
                        >
                          <h3 className="deal-card__title">{deal.title}</h3>
                          <div className="deal-card__client">{clientName(deal.clientId)}</div>
                          <div className="deal-card__value">
                            {formatCurrency(deal.valueInCents)}
                          </div>
                          <div className="deal-card__move">
                            <label className="sr-only" htmlFor={`card-stage-${deal.id}`}>
                              Mover “{deal.title}” para outra etapa
                            </label>
                            <select
                              id={`card-stage-${deal.id}`}
                              name="stage"
                              className="select"
                              value={deal.stage}
                              onChange={(event) =>
                                void moveDeal(deal, event.target.value as Stage)
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
        </>
      ) : null}
    </>
  );
}
