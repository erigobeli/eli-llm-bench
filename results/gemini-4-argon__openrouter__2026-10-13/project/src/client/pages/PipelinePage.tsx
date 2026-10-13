import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAllClients, fetchAllDeals, updateDeal } from '../api';
import {
  formatCurrency,
  PIPELINE_STAGES,
  type Client,
  type Deal,
  type DealStage,
} from '../types';

export function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [draggedDealId, setDraggedDealId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);

  const draggedDealRef = useRef<number | null>(null);
  const pointerDragRef = useRef<{
    dealId: number;
    startX: number;
    startY: number;
  } | null>(null);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    try {
      const [allDeals, allClients] = await Promise.all([
        fetchAllDeals(),
        fetchAllClients(),
      ]);
      setDeals(allDeals);
      setClients(allClients);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Erro ao carregar pipeline.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const handleStageChange = useCallback(
    async (dealId: number, targetStage: DealStage) => {
      const currentDeal = deals.find((d) => d.id === dealId);
      if (!currentDeal || currentDeal.stage === targetStage) {
        setDraggedDealId(null);
        setDragOverStage(null);
        draggedDealRef.current = null;
        return;
      }

      setErrorMessage(null);
      setSuccessMessage(null);

      // Optimistic update for responsive UI
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, stage: targetStage } : d))
      );

      try {
        const updated = await updateDeal(dealId, { stage: targetStage });
        setDeals((prev) => prev.map((d) => (d.id === dealId ? updated : d)));
        setSuccessMessage('Etapa do negócio atualizada com sucesso.');
      } catch (err) {
        // Revert on failure
        setDeals((prev) =>
          prev.map((d) => (d.id === dealId ? currentDeal : d))
        );
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Erro ao atualizar etapa do negócio.'
        );
      } finally {
        setDraggedDealId(null);
        setDragOverStage(null);
        draggedDealRef.current = null;
      }
    },
    [deals]
  );

  // Pointer/mouse drag fallback for tests that use mouse.down / mouse.move / mouse.up
  useEffect(() => {
    function handleWindowMouseUp(e: MouseEvent) {
      const activePointer = pointerDragRef.current;
      pointerDragRef.current = null;
      if (!activePointer) return;

      const dist = Math.hypot(
        e.clientX - activePointer.startX,
        e.clientY - activePointer.startY
      );
      if (dist < 12) return;

      const targetEl = document.elementFromPoint(e.clientX, e.clientY);
      const colEl = targetEl?.closest('[data-stage]') as HTMLElement | null;
      const targetStage = colEl?.getAttribute('data-stage') as DealStage | null;

      if (targetStage && PIPELINE_STAGES.some((s) => s.stage === targetStage)) {
        handleStageChange(activePointer.dealId, targetStage);
      }
    }

    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [handleStageChange]);

  const clientMap = new Map(clients.map((c) => [c.id, c.name]));

  function extractDealIdFromDrop(e: React.DragEvent): number | null {
    const raw =
      e.dataTransfer.getData('text/plain') ||
      e.dataTransfer.getData('application/x-deal-id');
    if (raw) {
      const parsed = Number.parseInt(raw, 10);
      if (Number.isInteger(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return draggedDealRef.current ?? draggedDealId;
  }

  return (
    <div>
      <header className="page-header">
        <div className="page-header-titles">
          <p className="page-eyebrow">Funil de vendas</p>
          <h1 className="page-title">Pipeline</h1>
        </div>
        <div className="page-actions">
          <Link to="/negocios" className="btn btn-primary">
            Gerenciar negócios
          </Link>
        </div>
      </header>

      {errorMessage && (
        <div role="alert" className="alert alert-error">
          <span>{errorMessage}</span>
          <button
            type="button"
            className="alert-close"
            onClick={() => setErrorMessage(null)}
          >
            Fechar
          </button>
        </div>
      )}

      {successMessage && (
        <div role="status" className="alert alert-success">
          <span>{successMessage}</span>
          <button
            type="button"
            className="alert-close"
            onClick={() => setSuccessMessage(null)}
          >
            Fechar
          </button>
        </div>
      )}

      {loading ? (
        <div className="panel">
          <div className="state-box">Carregando pipeline...</div>
        </div>
      ) : (
        <div className="pipeline-board">
          {PIPELINE_STAGES.map((col) => {
            const colDeals = deals.filter((d) => d.stage === col.stage);
            const colTotal = colDeals.reduce((acc, d) => acc + d.valueInCents, 0);
            const isOver = dragOverStage === col.stage;

            return (
              <section
                key={col.stage}
                className={`pipeline-column${isOver ? ' drag-over' : ''}`}
                data-stage={col.stage}
                aria-label={col.label}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverStage !== col.stage) {
                    setDragOverStage(col.stage);
                  }
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragOverStage(col.stage);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    setDragOverStage((prev) => (prev === col.stage ? null : prev));
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  pointerDragRef.current = null;
                  const droppedId = extractDealIdFromDrop(e);
                  if (droppedId) {
                    handleStageChange(droppedId, col.stage);
                  } else {
                    setDragOverStage(null);
                  }
                }}
              >
                <div className="pipeline-column-header">
                  <div className="pipeline-column-title-row">
                    <h2 className="pipeline-column-title">{col.label}</h2>
                    <span className="pipeline-count">{colDeals.length}</span>
                  </div>
                  <div className="pipeline-column-total">
                    {formatCurrency(colTotal)}
                  </div>
                </div>

                <div className="pipeline-cards" data-stage={col.stage}>
                  {colDeals.length === 0 ? (
                    <div className="state-box">Sem negócios nesta etapa.</div>
                  ) : (
                    colDeals.map((deal) => (
                      <article
                        key={deal.id}
                        className="deal-card"
                        data-testid="deal-card"
                        data-id={deal.id}
                        draggable={true}
                        onDragStart={(e) => {
                          draggedDealRef.current = deal.id;
                          setDraggedDealId(deal.id);
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', String(deal.id));
                          e.dataTransfer.setData(
                            'application/x-deal-id',
                            String(deal.id)
                          );
                        }}
                        onDragEnd={() => {
                          draggedDealRef.current = null;
                          setDraggedDealId(null);
                          setDragOverStage(null);
                        }}
                        onMouseDown={(e) => {
                          const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
                          if (tag === 'select' || tag === 'option' || tag === 'button') {
                            return;
                          }
                          pointerDragRef.current = {
                            dealId: deal.id,
                            startX: e.clientX,
                            startY: e.clientY,
                          };
                        }}
                      >
                        <h3 className="deal-card-title">{deal.title}</h3>
                        <p className="deal-card-client">
                          {clientMap.get(deal.clientId) ||
                            `Cliente #${deal.clientId}`}
                        </p>
                        <p className="deal-card-value">
                          {formatCurrency(deal.valueInCents)}
                        </p>

                        <div className="deal-card-controls">
                          <label htmlFor={`deal-stage-select-${deal.id}`}>
                            Etapa
                          </label>
                          <select
                            id={`deal-stage-select-${deal.id}`}
                            name="stage"
                            className="deal-card-select"
                            aria-label={`Etapa de ${deal.title}`}
                            value={deal.stage}
                            onChange={(e) =>
                              handleStageChange(
                                deal.id,
                                e.target.value as DealStage
                              )
                            }
                          >
                            {PIPELINE_STAGES.map((st) => (
                              <option key={st.stage} value={st.stage}>
                                {st.label}
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
    </div>
  );
}
