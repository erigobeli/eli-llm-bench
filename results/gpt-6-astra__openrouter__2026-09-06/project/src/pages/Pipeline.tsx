import { useRef, useState, type DragEvent } from "react";
import { Link } from "react-router-dom";
import {
  BriefcaseBusiness,
  GripVertical,
  List,
  Pencil,
  Plus,
} from "lucide-react";
import { stages, type Client, type Deal, type Stage } from "../../shared/types";
import { DealForm, LoadState, PageHeader, useNotice } from "../components";
import { api, money, stageLabels, useResource } from "../lib";

export function Pipeline() {
  const [revision, setRevision] = useState(0);
  const deals = useResource<Deal[]>("/api/deals", revision, true);
  const clients = useResource<Client[]>("/api/clients", 0, true);
  const [editing, setEditing] = useState<Deal | "new" | null>(null);
  const [dragged, setDragged] = useState<number | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const busy = useRef(false);
  const notify = useNotice();
  async function move(id: number, stage: Stage) {
    if (
      busy.current ||
      deals.data?.find((deal) => deal.id === id)?.stage === stage
    )
      return;
    busy.current = true;
    setSaving(id);
    try {
      await api(`/api/deals/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ stage }),
      });
      notify(`Negócio movido para ${stageLabels[stage]}.`);
      setRevision((n) => n + 1);
    } catch (error) {
      notify((error as Error).message, true);
    } finally {
      busy.current = false;
      setSaving(null);
    }
  }
  function drop(event: DragEvent, stage: Stage) {
    event.preventDefault();
    setOver(null);
    setDragged(null);
    const id = Number(event.dataTransfer.getData("text/plain"));
    if (Number.isSafeInteger(id) && deals.data?.some((deal) => deal.id === id))
      void move(id, stage);
  }
  const total = (deals.data || [])
    .filter((deal) => deal.stage !== "won")
    .reduce((sum, deal) => sum + deal.valueInCents, 0);
  return (
    <>
      <PageHeader
        title="Pipeline"
        description="Acompanhe cada oportunidade, do primeiro contato ao fechamento."
        action={
          <div className="header-actions">
            <Link className="button" to="/negocios">
              <List size={17} />
              Ver lista
            </Link>
            <button
              className="button button-primary"
              disabled={clients.loading || !!clients.error}
              onClick={() => setEditing("new")}
            >
              <Plus size={17} />
              Novo negócio
            </button>
          </div>
        }
      />
      <div className="pipeline-toolbar">
        <div>
          <BriefcaseBusiness size={16} />
          <strong>{deals.data?.length || 0} negócios</strong>
          <span className="toolbar-separator" />
          <span>
            Em aberto: <strong>{money(total)}</strong>
          </span>
        </div>
        <p>
          <GripVertical size={16} />
          Arraste os cartões ou selecione a etapa
        </p>
      </div>
      <LoadState
        loading={deals.loading || clients.loading}
        error={deals.error || clients.error}
        onRetry={() => {
          deals.retry();
          clients.retry();
        }}
      >
        <div className="pipeline-board">
          {stages.map((stage) => {
            const rows =
              deals.data?.filter((deal) => deal.stage === stage) || [];
            return (
              <section
                key={stage}
                className={`pipeline-column column-${stage} ${over === stage ? "drop-target" : ""}`}
                aria-label={stageLabels[stage]}
                data-stage={stage}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setOver(stage);
                }}
                onDragLeave={(event) => {
                  if (
                    !event.currentTarget.contains(event.relatedTarget as Node)
                  )
                    setOver(null);
                }}
                onDrop={(event) => drop(event, stage)}
              >
                <header className="column-header">
                  <div>
                    <span className="column-dot" />
                    <h2>{stageLabels[stage]}</h2>
                    <span className="count">{rows.length}</span>
                  </div>
                  <strong>
                    {money(
                      rows.reduce((sum, deal) => sum + deal.valueInCents, 0),
                    )}
                  </strong>
                </header>
                <div className="column-cards">
                  {rows.map((deal) => (
                    <article
                      key={deal.id}
                      data-testid="deal-card"
                      data-id={deal.id}
                      className={`deal-card ${dragged === deal.id ? "dragging" : ""}`}
                      draggable={saving === null}
                      onDragStart={(event) => {
                        event.dataTransfer.setData(
                          "text/plain",
                          String(deal.id),
                        );
                        event.dataTransfer.effectAllowed = "move";
                        setDragged(deal.id);
                      }}
                      onDragEnd={() => {
                        setDragged(null);
                        setOver(null);
                      }}
                    >
                      <div className="card-top">
                        <span className="card-reference">
                          <GripVertical size={14} />
                          NEG-{String(deal.id).padStart(4, "0")}
                        </span>
                        <button
                          className="icon-button"
                          aria-label={`Editar ${deal.title}`}
                          title="Editar negócio"
                          onClick={() => setEditing(deal)}
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                      <h3>{deal.title}</h3>
                      <p className="card-client">
                        {clients.data?.find(
                          (client) => client.id === deal.clientId,
                        )?.name || `Cliente #${deal.clientId}`}
                      </p>
                      <strong className="card-value">
                        {money(deal.valueInCents)}
                      </strong>
                      <div className="card-footer">
                        <label htmlFor={`stage-${deal.id}`}>
                          {saving === deal.id ? "Salvando..." : "Etapa"}
                        </label>
                        <select
                          id={`stage-${deal.id}`}
                          name="stage"
                          aria-label={`Etapa de ${deal.title}`}
                          value={deal.stage}
                          disabled={saving !== null}
                          onChange={(event) =>
                            void move(deal.id, event.target.value as Stage)
                          }
                        >
                          {stages.map((item) => (
                            <option key={item} value={item}>
                              {stageLabels[item]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </article>
                  ))}
                  {!rows.length && (
                    <div className="empty-column">
                      <BriefcaseBusiness size={23} />
                      <span>Nenhum negócio nesta etapa</span>
                      <small>Arraste um cartão para cá</small>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </LoadState>
      {editing && (
        <DealForm
          deal={editing === "new" ? null : editing}
          clients={clients.data || []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setRevision((n) => n + 1);
          }}
        />
      )}
    </>
  );
}
