import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { api } from "../api";
import { EmptyState, ErrorState, LoadingState, useToast } from "../components/ui";
import { formatCents } from "../format";
import { STAGES, STAGE_LABELS, type Client, type Deal, type Stage } from "../types";

export default function PipelinePage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<Stage | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [dealsResult, clientsResult] = await Promise.all([
        api.listDeals({ page: 1, pageSize: 50 }),
        api.listClients({ page: 1, pageSize: 50 }),
      ]);
      setDeals(dealsResult.data);
      setClients(clientsResult.data);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Erro inesperado.");
      setDeals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const clientsById = useMemo(() => {
    const map = new Map<number, Client>();
    for (const client of clients) {
      map.set(client.id, client);
    }
    return map;
  }, [clients]);

  const moveDeal = useCallback(
    async (dealId: number, stage: Stage) => {
      const deal = deals.find((item) => item.id === dealId);
      if (!deal || deal.stage === stage) {
        return;
      }
      const previous = deals;
      setSavingId(dealId);
      setDeals((current) =>
        current.map((item) => (item.id === dealId ? { ...item, stage } : item)),
      );
      try {
        const updated = await api.updateDeal(dealId, { stage });
        setDeals((current) =>
          current.map((item) => (item.id === dealId ? updated : item)),
        );
        toast.success(`"${deal.title}" movido para ${STAGE_LABELS[stage]}.`);
      } catch (error) {
        setDeals(previous);
        toast.error(error instanceof Error ? error.message : "Erro inesperado.");
      } finally {
        setSavingId(null);
      }
    },
    [deals, toast],
  );

  const onDragStart = (event: DragEvent<HTMLElement>, deal: Deal) => {
    setDragging(deal.id);
    const transfer = event.dataTransfer as DataTransfer | null;
    if (transfer) {
      transfer.effectAllowed = "move";
      transfer.setData("text/plain", String(deal.id));
      transfer.setData("application/x-deal-id", String(deal.id));
    }
  };

  const onDragOver = (event: DragEvent<HTMLElement>, stage: Stage) => {
    event.preventDefault();
    const transfer = event.dataTransfer as DataTransfer | null;
    if (transfer) {
      transfer.dropEffect = "move";
    }
    if (dropTarget !== stage) {
      setDropTarget(stage);
    }
  };

  const onDrop = (event: DragEvent<HTMLElement>, stage: Stage) => {
    event.preventDefault();
    const transfer = event.dataTransfer as DataTransfer | null;
    const raw = transfer
      ? transfer.getData("application/x-deal-id") || transfer.getData("text/plain")
      : "";
    const dealId = Number(raw) || dragging;
    setDragging(null);
    setDropTarget(null);
    if (dealId) {
      void moveDeal(dealId, stage);
    }
  };

  /**
   * Alternativa baseada em ponteiro: garante o arrastar e soltar mesmo quando o
   * ambiente não dispara os eventos nativos de HTML5 drag and drop.
   */
  const columnRefs = useRef(new Map<Stage, HTMLElement | null>());
  const pointerDrag = useRef<{ dealId: number; x: number; y: number } | null>(null);

  const stageAtPoint = useCallback((x: number, y: number): Stage | null => {
    for (const stage of STAGES) {
      const element = columnRefs.current.get(stage);
      if (!element) {
        continue;
      }
      const rect = element.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return stage;
      }
    }
    return null;
  }, []);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      const current = pointerDrag.current;
      if (!current) {
        return;
      }
      const moved =
        Math.abs(event.clientX - current.x) + Math.abs(event.clientY - current.y);
      if (moved > 6) {
        setDragging(current.dealId);
        setDropTarget(stageAtPoint(event.clientX, event.clientY));
      }
    };

    const onUp = (event: MouseEvent) => {
      const current = pointerDrag.current;
      pointerDrag.current = null;
      if (!current) {
        return;
      }
      const moved =
        Math.abs(event.clientX - current.x) + Math.abs(event.clientY - current.y);
      setDragging(null);
      setDropTarget(null);
      if (moved <= 6) {
        return;
      }
      const stage = stageAtPoint(event.clientX, event.clientY);
      if (stage) {
        void moveDeal(current.dealId, stage);
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [moveDeal, stageAtPoint]);

  const onCardMouseDown = (event: ReactMouseEvent<HTMLElement>, deal: Deal) => {
    const target = event.target as HTMLElement;
    if (target.closest("select") || target.closest("button")) {
      return;
    }
    pointerDrag.current = { dealId: deal.id, x: event.clientX, y: event.clientY };
  };

  const totals = useMemo(() => {
    const map = new Map<Stage, { count: number; value: number }>();
    for (const stage of STAGES) {
      map.set(stage, { count: 0, value: 0 });
    }
    for (const deal of deals) {
      const entry = map.get(deal.stage);
      if (entry) {
        entry.count += 1;
        entry.value += deal.valueInCents;
      }
    }
    return map;
  }, [deals]);

  return (
    <section className="page">
      <div className="page__header">
        <div>
          <p className="page__eyebrow">Fluxo comercial</p>
          <h1 className="page__title">Pipeline</h1>
        </div>
        <button type="button" className="btn" onClick={load}>
          Atualizar
        </button>
      </div>

      <p className="page__help">
        Arraste um cartão para outra coluna ou use o seletor de etapa dentro do cartão. A
        alteração é salva imediatamente.
      </p>

      {loading ? <LoadingState label="Carregando pipeline..." /> : null}
      {loadError ? <ErrorState message={loadError} onRetry={load} /> : null}

      {!loading && !loadError ? (
        <div className="pipeline" data-testid="pipeline">
          {STAGES.map((stage) => {
            const stageDeals = deals.filter((deal) => deal.stage === stage);
            const summary = totals.get(stage)!;
            return (
              <section
                key={stage}
                ref={(element) => {
                  columnRefs.current.set(stage, element);
                }}
                className={`pipeline__column${
                  dropTarget === stage ? " pipeline__column--over" : ""
                }`}
                data-stage={stage}
                data-testid="pipeline-column"
                aria-label={`Coluna ${STAGE_LABELS[stage]}`}
                onDragOver={(event) => onDragOver(event, stage)}
                onDragEnter={(event) => onDragOver(event, stage)}
                onDragLeave={() => setDropTarget((current) => (current === stage ? null : current))}
                onDrop={(event) => onDrop(event, stage)}
              >
                <header className="pipeline__header">
                  <h2 className="pipeline__title">{STAGE_LABELS[stage]}</h2>
                  <span className="pipeline__count">{summary.count}</span>
                </header>
                <p className="pipeline__total">{formatCents(summary.value)}</p>

                <div className="pipeline__list">
                  {stageDeals.length === 0 ? (
                    <p className="pipeline__empty">Nenhum negócio nesta etapa.</p>
                  ) : (
                    stageDeals.map((deal) => (
                      <article
                        key={deal.id}
                        className={`deal-card${dragging === deal.id ? " deal-card--dragging" : ""}`}
                        data-testid="deal-card"
                        data-id={deal.id}
                        data-stage={deal.stage}
                        draggable
                        onDragStart={(event) => onDragStart(event, deal)}
                        onMouseDown={(event) => onCardMouseDown(event, deal)}
                        onDragEnd={() => {
                          setDragging(null);
                          setDropTarget(null);
                        }}
                      >
                        <h3 className="deal-card__title">{deal.title}</h3>
                        <p className="deal-card__client">
                          {clientsById.get(deal.clientId)?.name ??
                            `Cliente #${deal.clientId}`}
                        </p>
                        <p className="deal-card__value">{formatCents(deal.valueInCents)}</p>
                        <label className="sr-only" htmlFor={`card-stage-${deal.id}`}>
                          Etapa de {deal.title}
                        </label>
                        <select
                          id={`card-stage-${deal.id}`}
                          name="stage"
                          className="stage-select"
                          value={deal.stage}
                          disabled={savingId === deal.id}
                          onChange={(event) =>
                            void moveDeal(deal.id, event.target.value as Stage)
                          }
                        >
                          {STAGES.map((option) => (
                            <option key={option} value={option}>
                              {STAGE_LABELS[option]}
                            </option>
                          ))}
                        </select>
                      </article>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : null}

      {!loading && !loadError && deals.length === 0 ? (
        <EmptyState
          title="Pipeline vazio"
          description="Cadastre negócios para visualizar o fluxo comercial."
        />
      ) : null}
    </section>
  );
}
