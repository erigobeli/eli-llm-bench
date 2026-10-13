import { useMemo, useState } from 'react';
import type { Deal, Stage } from '../shared/types.js';
import { api, fetchAll, STAGE_LABELS, STAGE_ORDER, useResource } from './api.js';
import { ErrorState, LoadingState, Notice, PageHeader } from './components.js';
import { formatCurrency } from './format.js';

export function PipelinePage() {
  const deals = useResource(() => fetchAll(api.listDeals), []);
  const [dropTarget, setDropTarget] = useState<Stage | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const byStage = useMemo(() => {
    const groups: Record<Stage, Deal[]> = { new: [], contact: [], proposal: [], won: [] };
    for (const deal of deals.data ?? []) groups[deal.stage].push(deal);
    return groups;
  }, [deals.data]);

  async function moveDeal(id: number, stage: Stage) {
    const deal = deals.data?.find((item) => item.id === id);
    if (!deal || deal.stage === stage) return;
    setBusyId(id);
    setNotice(null);
    try {
      await api.updateDeal(id, { stage });
      setNotice({ kind: 'success', text: `"${deal.title}" movido para ${STAGE_LABELS[stage]}.` });
      deals.reload();
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Não foi possível mover o negócio.' });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Pipeline"
        description="Arraste os cartões entre as colunas ou use a seleção de etapa em cada cartão."
      />

      {notice && <Notice kind={notice.kind} onClose={() => setNotice(null)}>{notice.text}</Notice>}
      {deals.status === 'loading' && !deals.data && <LoadingState label="Carregando pipeline..." />}
      {deals.status === 'error' && (
        <ErrorState message={`Não foi possível carregar o pipeline: ${deals.error}`} onRetry={deals.reload} />
      )}

      {deals.data && (
        <div className="pipeline-board">
          {STAGE_ORDER.map((stage) => {
            const items = byStage[stage];
            const total = items.reduce((sum, deal) => sum + deal.valueInCents, 0);
            const headingId = `pipeline-${stage}-title`;
            return (
              <section
                key={stage}
                className={`pipeline-column${dropTarget === stage ? ' is-drop-target' : ''}`}
                aria-labelledby={headingId}
                data-stage={stage}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  if (dropTarget !== stage) setDropTarget(stage);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDropTarget(null);
                  const id = Number(event.dataTransfer.getData('text/plain'));
                  if (Number.isInteger(id) && id > 0) void moveDeal(id, stage);
                }}
              >
                <header className="pipeline-column-header">
                  <h2 id={headingId}>{STAGE_LABELS[stage]}</h2>
                  <span className="muted">
                    {items.length} · {formatCurrency(total)}
                  </span>
                </header>
                <div className="pipeline-cards">
                  {items.length === 0 && <p className="muted pipeline-empty">Nenhum negócio nesta etapa.</p>}
                  {items.map((deal) => (
                    <article
                      key={deal.id}
                      className={`deal-card${busyId === deal.id ? ' is-busy' : ''}`}
                      data-testid="deal-card"
                      data-id={deal.id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', String(deal.id));
                      }}
                    >
                      <h3 className="deal-card-title">{deal.title}</h3>
                      <p className="muted deal-card-client">{deal.clientName}</p>
                      <p className="deal-card-value">{formatCurrency(deal.valueInCents)}</p>
                      <label className="deal-card-stage">
                        <span className="sr-only">Etapa de {deal.title}</span>
                        <select
                          name={`stage-${deal.id}`}
                          value={deal.stage}
                          disabled={busyId === deal.id}
                          onChange={(event) => void moveDeal(deal.id, event.target.value as Stage)}
                        >
                          {STAGE_ORDER.map((option) => (
                            <option key={option} value={option}>
                              {STAGE_LABELS[option]}
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
    </>
  );
}
