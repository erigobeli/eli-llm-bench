import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { api, STAGES, type Client, type Deal, type Stage } from "../api";
import { formatCurrency } from "../format";
import { ErrorState, Loading, PageHeader, useToast } from "../ui";

export default function PipelinePage() {
  const toast = useToast();
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [overStage, setOverStage] = useState<Stage | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const dragId = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, c] = await Promise.all([api.allDeals(), api.allClients()]);
      setDeals(d);
      setClients(c);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);

  async function moveDeal(id: number, stage: Stage) {
    const current = deals?.find((d) => d.id === id);
    if (!current || current.stage === stage) return;
    const previous = current.stage;
    setDeals((all) => all?.map((d) => (d.id === id ? { ...d, stage } : d)) ?? all);
    setSavingId(id);
    try {
      const updated = await api.updateDeal(id, { stage });
      setDeals((all) => all?.map((d) => (d.id === id ? updated : d)) ?? all);
      toast("success", `"${updated.title}" movido para ${STAGES.find((s) => s.value === stage)?.label}.`);
    } catch (e) {
      setDeals((all) => all?.map((d) => (d.id === id ? { ...d, stage: previous } : d)) ?? all);
      toast("error", (e as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  function onDragStart(e: DragEvent<HTMLElement>, id: number) {
    dragId.current = id;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(id));
  }

  function onDrop(e: DragEvent<HTMLElement>, stage: Stage) {
    e.preventDefault();
    setOverStage(null);
    const raw = e.dataTransfer.getData("text/plain");
    const id = raw ? Number(raw) : dragId.current;
    dragId.current = null;
    if (id) moveDeal(id, stage);
  }

  return (
    <div className="page">
      <PageHeader title="Pipeline" subtitle="Arraste os cartões entre as colunas ou use o seletor de etapa." />
      {error && <ErrorState message={error} onRetry={load} />}
      {loading && !deals && !error && <Loading label="Carregando pipeline…" />}
      {deals && (
        <div className="board">
          {STAGES.map((s) => {
            const list = deals.filter((d) => d.stage === s.value);
            const total = list.reduce((a, d) => a + d.valueInCents, 0);
            return (
              <section
                key={s.value}
                className={`column column-${s.value}${overStage === s.value ? " drag-over" : ""}`}
                data-stage={s.value}
                aria-label={`Etapa ${s.label}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (overStage !== s.value) setOverStage(s.value);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOverStage(null);
                }}
                onDrop={(e) => onDrop(e, s.value)}
              >
                <header className="column-header">
                  <h2>{s.label}</h2>
                  <span className="column-count" aria-label={`${list.length} negócio(s)`}>
                    {list.length}
                  </span>
                  <span className="column-total">{formatCurrency(total)}</span>
                </header>
                <div className="column-body">
                  {list.length === 0 && <p className="column-empty">Nenhum negócio nesta etapa.</p>}
                  {list.map((d) => (
                    <article
                      key={d.id}
                      className={`deal-card${savingId === d.id ? " saving" : ""}`}
                      data-testid="deal-card"
                      data-id={d.id}
                      data-stage={d.stage}
                      draggable
                      onDragStart={(e) => onDragStart(e, d.id)}
                      onDragEnd={() => {
                        dragId.current = null;
                        setOverStage(null);
                      }}
                    >
                      <div className="deal-card-title">{d.title}</div>
                      <div className="deal-card-meta">
                        <span className="muted">{clientMap.get(d.clientId) ?? `Cliente #${d.clientId}`}</span>
                        <span className="deal-card-value">{formatCurrency(d.valueInCents)}</span>
                      </div>
                      <label className="sr-only" htmlFor={`stage-${d.id}`}>
                        Etapa de {d.title}
                      </label>
                      <select
                        id={`stage-${d.id}`}
                        name="stage"
                        className="deal-card-select"
                        value={d.stage}
                        disabled={savingId === d.id}
                        onChange={(e) => moveDeal(d.id, e.target.value as Stage)}
                      >
                        {STAGES.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
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
