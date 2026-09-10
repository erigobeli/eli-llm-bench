import { useCallback, useEffect, useState, type DragEvent } from "react";
import { STAGES, STAGE_LABELS, type Client, type Deal, type Stage } from "../../../shared/types";
import { ApiError, api, fetchAllClients, fetchAllDeals } from "../api";
import { formatCents } from "../format";
import { useToast } from "../components/Toast";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "../components/ui";

export function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [overStage, setOverStage] = useState<Stage | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const { notify } = useToast();

  useEffect(() => {
    document.title = "Pipeline · CRMBench Modelo";
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, c] = await Promise.all([fetchAllDeals(), fetchAllClients()]);
      setDeals(d);
      setClients(c);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar o pipeline.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const clientName = new Map(clients.map((c) => [c.id, c.name]));

  async function moveDeal(dealId: number, stage: Stage) {
    const current = deals.find((d) => d.id === dealId);
    if (!current || current.stage === stage) return;
    const previous = deals;
    // Atualização otimista; reverte em caso de erro.
    setDeals((list) => list.map((d) => (d.id === dealId ? { ...d, stage } : d)));
    setSavingId(dealId);
    try {
      const saved = await api.updateDeal(dealId, { stage });
      setDeals((list) => list.map((d) => (d.id === dealId ? saved : d)));
      notify("success", `"${saved.title}" movido para ${STAGE_LABELS[stage]}.`);
    } catch (err) {
      setDeals(previous);
      notify("error", err instanceof ApiError ? err.message : "Erro ao mover negócio.");
    } finally {
      setSavingId(null);
    }
  }

  function onDragStart(ev: DragEvent<HTMLElement>, dealId: number) {
    ev.dataTransfer.setData("text/plain", String(dealId));
    ev.dataTransfer.effectAllowed = "move";
    setDragging(dealId);
  }

  function onDragOver(ev: DragEvent<HTMLElement>, stage: Stage) {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "move";
    if (overStage !== stage) setOverStage(stage);
  }

  function onDrop(ev: DragEvent<HTMLElement>, stage: Stage) {
    ev.preventDefault();
    const raw = ev.dataTransfer.getData("text/plain");
    const id = Number(raw) || dragging;
    setOverStage(null);
    setDragging(null);
    if (id) void moveDeal(id, stage);
  }

  function onDragEnd() {
    setDragging(null);
    setOverStage(null);
  }

  if (loading) return <LoadingState label="Carregando pipeline…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <>
      <PageHeader
        title="Pipeline"
        description="Arraste os cartões entre as colunas ou use o seletor de etapa em cada cartão."
      />
      {deals.length === 0 && (
        <EmptyState title="Nenhum negócio no pipeline" description="Crie negócios na tela de Negócios para vê-los aqui." />
      )}
      <div className="pipeline" role="list" aria-label="Colunas do pipeline">
        {STAGES.map((stage) => {
          const list = deals.filter((d) => d.stage === stage);
          const total = list.reduce((acc, d) => acc + d.valueInCents, 0);
          return (
            <section
              key={stage}
              role="listitem"
              className={`pipeline-column${overStage === stage ? " drop-target" : ""}`}
              data-stage={stage}
              aria-labelledby={`col-${stage}`}
              onDragOver={(e) => onDragOver(e, stage)}
              onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
              onDrop={(e) => onDrop(e, stage)}
            >
              <header className="pipeline-column-header">
                <h2 id={`col-${stage}`} className={`pipeline-column-title stage-text-${stage}`}>
                  {STAGE_LABELS[stage]}
                </h2>
                <span className="pipeline-column-meta">
                  {list.length} {list.length === 1 ? "negócio" : "negócios"} · {formatCents(total)}
                </span>
              </header>
              <div className="pipeline-cards">
                {list.length === 0 && <p className="pipeline-empty">Sem negócios nesta etapa</p>}
                {list.map((d) => (
                  <article
                    key={d.id}
                    className={`deal-card${dragging === d.id ? " dragging" : ""}${savingId === d.id ? " saving" : ""}`}
                    data-testid="deal-card"
                    data-id={d.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, d.id)}
                    onDragEnd={onDragEnd}
                    aria-label={`${d.title}, ${formatCents(d.valueInCents)}, etapa ${STAGE_LABELS[d.stage]}`}
                  >
                    <strong className="deal-card-title">{d.title}</strong>
                    <span className="deal-card-client">{clientName.get(d.clientId) ?? `Cliente #${d.clientId}`}</span>
                    <span className="deal-card-value">{formatCents(d.valueInCents)}</span>
                    <label className="deal-card-stage">
                      <span className="sr-only">Etapa de {d.title}</span>
                      <select
                        name={`stage-${d.id}`}
                        value={d.stage}
                        disabled={savingId === d.id}
                        onChange={(e) => moveDeal(d.id, e.target.value as Stage)}
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
    </>
  );
}
