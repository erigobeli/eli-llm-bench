import React, { useCallback, useEffect, useState } from 'react';
import {
  api,
  formatCurrency,
  STAGES,
  STAGE_LABELS,
  type Client,
  type Deal,
  type Stage,
} from '../api';
import { EmptyState, ErrorState, LoadingState, PageHeader, useToast } from '../ui';

export default function PipelinePage() {
  const { notify } = useToast();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<Stage | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dealsResult, clientsResult] = await Promise.all([
        api.listDeals({ page: 1, pageSize: 50 }),
        api.listClients({ page: 1, pageSize: 50 }),
      ]);
      setDeals(dealsResult.data);
      setClients(clientsResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const clientName = (id: number) => clients.find((client) => client.id === id)?.name ?? `#${id}`;

  const moveDeal = async (deal: Deal, stage: Stage) => {
    if (deal.stage === stage) return;
    const previous = deals;
    setSavingId(deal.id);
    setDeals((current) =>
      current.map((item) => (item.id === deal.id ? { ...item, stage } : item)),
    );
    try {
      const updated = await api.updateDeal(deal.id, { stage });
      setDeals((current) => current.map((item) => (item.id === deal.id ? updated : item)));
      notify('success', `"${deal.title}" movido para ${STAGE_LABELS[stage]}.`);
    } catch (err) {
      setDeals(previous);
      notify('error', err instanceof Error ? err.message : 'Não foi possível mover o negócio.');
    } finally {
      setSavingId(null);
    }
  };

  const totalOpen = deals
    .filter((deal) => deal.stage !== 'won')
    .reduce((sum, deal) => sum + deal.valueInCents, 0);

  return (
    <section className="page">
      <PageHeader
        eyebrow="Comercial"
        title="Pipeline"
        subtitle="Arraste os cartões entre as colunas ou use o seletor de etapa em cada cartão."
        actions={
          <span className="page-head__stat">
            Pipeline aberto: <strong>{formatCurrency(totalOpen)}</strong>
          </span>
        }
      />

      {loading ? <LoadingState label="Carregando pipeline…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && !error ? (
        <div className="pipeline">
          {STAGES.map((stage) => {
            const columnDeals = deals.filter((deal) => deal.stage === stage);
            const columnTotal = columnDeals.reduce((sum, deal) => sum + deal.valueInCents, 0);
            return (
              <section
                key={stage}
                className={`pipeline__column${dropTarget === stage ? ' is-drop-target' : ''}`}
                data-stage={stage}
                aria-label={`Coluna ${STAGE_LABELS[stage]}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  if (dropTarget !== stage) setDropTarget(stage);
                }}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDropTarget(stage);
                }}
                onDragLeave={(event) => {
                  if (event.currentTarget === event.target) setDropTarget(null);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDropTarget(null);
                  const raw = event.dataTransfer.getData('text/plain');
                  const id = Number(raw) || dragging;
                  setDragging(null);
                  const deal = deals.find((item) => item.id === id);
                  if (deal) void moveDeal(deal, stage);
                }}
              >
                <header className="pipeline__head">
                  <h2>
                    <span className={`dot dot--${stage}`} aria-hidden="true" />
                    {STAGE_LABELS[stage]}
                  </h2>
                  <p>
                    {columnDeals.length} {columnDeals.length === 1 ? 'negócio' : 'negócios'} •{' '}
                    {formatCurrency(columnTotal)}
                  </p>
                </header>

                <div className="pipeline__body">
                  {columnDeals.length === 0 ? (
                    <p className="pipeline__empty">Nenhum negócio nesta etapa.</p>
                  ) : null}
                  {columnDeals.map((deal) => (
                    <article
                      key={deal.id}
                      className={`deal-card${dragging === deal.id ? ' is-dragging' : ''}${
                        savingId === deal.id ? ' is-saving' : ''
                      }`}
                      data-testid="deal-card"
                      data-id={deal.id}
                      data-stage={deal.stage}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData('text/plain', String(deal.id));
                        event.dataTransfer.effectAllowed = 'move';
                        setDragging(deal.id);
                      }}
                      onDragEnd={() => {
                        setDragging(null);
                        setDropTarget(null);
                      }}
                    >
                      <h3 className="deal-card__title">{deal.title}</h3>
                      <p className="deal-card__client">{clientName(deal.clientId)}</p>
                      <p className="deal-card__value">{formatCurrency(deal.valueInCents)}</p>
                      <div className="deal-card__foot">
                        <label className="sr-only" htmlFor={`pipeline-stage-${deal.id}`}>
                          Etapa do negócio {deal.title}
                        </label>
                        <select
                          id={`pipeline-stage-${deal.id}`}
                          name="stage"
                          className="select--inline"
                          value={deal.stage}
                          onChange={(event) => void moveDeal(deal, event.target.value as Stage)}
                        >
                          {STAGES.map((option) => (
                            <option key={option} value={option}>
                              {STAGE_LABELS[option]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : null}

      {!loading && !error && deals.length === 0 ? (
        <EmptyState
          title="Pipeline vazio"
          hint="Cadastre negócios na tela Negócios para acompanhá-los aqui."
        />
      ) : null}
    </section>
  );
}
