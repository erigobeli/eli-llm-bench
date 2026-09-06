import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  BriefcaseBusiness,
  Columns3,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { stages, type Client, type Deal, type Page } from "../../shared/types";
import {
  DealForm,
  DeleteDialog,
  LoadState,
  PageHeader,
  Pagination,
  SearchField,
  StageBadge,
} from "../components";
import { money, stageLabels, useResource } from "../lib";

export function Deals() {
  const [params, setParams] = useSearchParams();
  const search = params.get("search") || "";
  const stage = params.get("stage") || "";
  const clientId = params.get("clientId") || "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [revision, setRevision] = useState(0);
  const query = new URLSearchParams({
    search,
    page: String(page),
    pageSize: "4",
  });
  if (stage) query.set("stage", stage);
  if (clientId) query.set("clientId", clientId);
  const result = useResource<Page<Deal>>(`/api/deals?${query}`, revision);
  const clients = useResource<Client[]>("/api/clients", 0, true);
  const [editing, setEditing] = useState<Deal | "new" | null>(null);
  const [deleting, setDeleting] = useState<Deal | null>(null);
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  }
  useEffect(() => {
    if (
      !result.loading &&
      result.data &&
      page > Math.max(1, result.data.pagination.totalPages)
    )
      filter("page", String(Math.max(1, result.data.pagination.totalPages)));
  }, [result.data, result.loading, page]);
  const selectedClient = clients.data?.find(
    (client) => String(client.id) === clientId,
  );
  const loading = result.loading || clients.loading;
  const error = result.error || clients.error;
  return (
    <>
      <PageHeader
        title="Negócios"
        description="Gerencie oportunidades, valores e próximas etapas."
        action={
          <div className="header-actions">
            <Link className="button" to="/pipeline">
              <Columns3 size={17} />
              Pipeline
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
      <section className="panel" aria-label="Lista de negócios">
        <div className="panel-toolbar">
          <div className="section-title">
            <BriefcaseBusiness size={18} />
            <h2>
              {selectedClient ? "Negócios do cliente" : "Todos os negócios"}
            </h2>
            {result.data && (
              <span className="count">{result.data.pagination.total}</span>
            )}
          </div>
          <SearchField
            value={search}
            onChange={(value) => filter("search", value)}
            placeholder="Buscar pelo título do negócio"
          />
        </div>
        <div className="filter-bar">
          <span className="filter-caption">
            <SlidersHorizontal size={15} />
            Filtros
          </span>
          <div className="filter-field">
            <label htmlFor="filter-stage">Etapa</label>
            <select
              id="filter-stage"
              name="stage"
              value={stage}
              onChange={(event) => filter("stage", event.target.value)}
            >
              <option value="">Todas as etapas</option>
              {stages.map((item) => (
                <option key={item} value={item}>
                  {stageLabels[item]}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-field">
            <label htmlFor="filter-client">Cliente</label>
            <select
              id="filter-client"
              name="clientId"
              value={clientId}
              onChange={(event) => filter("clientId", event.target.value)}
            >
              <option value="">Todos os clientes</option>
              {clients.data?.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          {(search || stage || clientId) && (
            <button className="text-button" onClick={() => setParams({})}>
              <X size={14} />
              Limpar filtros
            </button>
          )}
        </div>
        {selectedClient && (
          <div className="filter-summary">
            Exibindo negócios de <strong>{selectedClient.name}</strong>
          </div>
        )}
        <LoadState
          loading={loading}
          error={error}
          empty={!result.data?.data.length}
          onRetry={() => {
            result.retry();
            clients.retry();
          }}
        >
          <table className="data-table deal-table">
            <thead>
              <tr>
                <th>Negócio</th>
                <th>Cliente</th>
                <th>Valor</th>
                <th>Etapa</th>
                <th className="actions-heading">Ações</th>
              </tr>
            </thead>
            <tbody>
              {result.data?.data.map((deal) => (
                <tr key={deal.id} data-testid="deal-row" data-id={deal.id}>
                  <td data-label="Negócio">
                    <strong>{deal.title}</strong>
                    <small className="record-id">
                      NEG-{String(deal.id).padStart(4, "0")}
                    </small>
                  </td>
                  <td data-label="Cliente">
                    {clients.data?.find((client) => client.id === deal.clientId)
                      ?.name || `Cliente #${deal.clientId}`}
                  </td>
                  <td data-label="Valor" className="money-cell">
                    {money(deal.valueInCents)}
                  </td>
                  <td data-label="Etapa">
                    <StageBadge stage={deal.stage} />
                  </td>
                  <td data-label="Ações">
                    <div className="row-actions">
                      <button
                        className="icon-button"
                        title="Editar negócio"
                        aria-label={`Editar ${deal.title}`}
                        onClick={() => setEditing(deal)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-button danger-icon"
                        title="Excluir negócio"
                        aria-label={`Excluir ${deal.title}`}
                        onClick={() => setDeleting(deal)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </LoadState>
        {!loading && !error && result.data && (
          <Pagination
            pagination={result.data.pagination}
            onPage={(value) => filter("page", String(value))}
          />
        )}
      </section>
      {editing && (
        <DealForm
          deal={editing === "new" ? null : editing}
          clients={clients.data || []}
          initialClient={clientId}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setParams({});
            setRevision((n) => n + 1);
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          kind="deals"
          record={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            setRevision((n) => n + 1);
          }}
        />
      )}
    </>
  );
}
