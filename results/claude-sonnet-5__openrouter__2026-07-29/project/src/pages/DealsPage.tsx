import { useEffect, useState } from "react";
import {
  ApiError,
  createDeal,
  deleteDeal,
  fetchClients,
  fetchDeals,
  updateDeal
} from "../api/client";
import type { Client, Deal, DealStage } from "../types";
import { DEAL_STAGES, STAGE_LABELS } from "../types";
import { Pagination } from "../components/Pagination";
import { StatusView } from "../components/StatusView";
import { Modal } from "../components/Modal";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { formatCurrencyFromCents, formatDate } from "../utils/format";

const PAGE_SIZE = 4;

interface DealFormState {
  title: string;
  valueInCents: string;
  clientId: string;
  stage: DealStage;
}

const EMPTY_FORM: DealFormState = { title: "", valueInCents: "", clientId: "", stage: "new" };

export function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<DealStage | "">("");
  const [clientFilter, setClientFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formState, setFormState] = useState<DealFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Deal | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    fetchClients({ pageSize: 50 }).then((result) => setClients(result.data));
  }, []);

  function loadDeals() {
    setLoading(true);
    setError(null);
    fetchDeals({
      search,
      stage: stageFilter || undefined,
      clientId: clientFilter ? Number(clientFilter) : undefined,
      page,
      pageSize: PAGE_SIZE
    })
      .then((result) => {
        setDeals(result.data);
        setTotal(result.pagination.total);
        setTotalPages(result.pagination.totalPages);
      })
      .catch(() => setError("Não foi possível carregar os negócios."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadDeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, stageFilter, clientFilter, page]);

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function clientName(clientId: number): string {
    return clients.find((client) => client.id === clientId)?.name ?? `Cliente #${clientId}`;
  }

  function openCreateForm() {
    setFormMode("create");
    setFormState(EMPTY_FORM);
    setFormError(null);
    setEditingId(null);
    setFormOpen(true);
  }

  function openEditForm(deal: Deal) {
    setFormMode("edit");
    setFormState({
      title: deal.title,
      valueInCents: String(deal.valueInCents),
      clientId: String(deal.clientId),
      stage: deal.stage
    });
    setFormError(null);
    setEditingId(deal.id);
    setFormOpen(true);
  }

  async function handleFormSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const valueInCents = Number(formState.valueInCents);
    const clientId = Number(formState.clientId);

    if (!Number.isInteger(valueInCents) || valueInCents < 0) {
      setFormError("Valor deve ser um número inteiro maior ou igual a zero.");
      return;
    }
    if (!Number.isInteger(clientId) || clientId <= 0) {
      setFormError("Selecione um cliente válido.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = { title: formState.title, valueInCents, clientId, stage: formState.stage };
      if (formMode === "create") {
        await createDeal(payload);
      } else if (editingId !== null) {
        await updateDeal(editingId, payload);
      }
      setFormOpen(false);
      loadDeals();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("Erro inesperado ao salvar negócio.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) {
      return;
    }
    setDeleteError(null);
    try {
      await deleteDeal(deleteTarget.id);
      setDeleteTarget(null);
      loadDeals();
    } catch (err) {
      if (err instanceof ApiError) {
        setDeleteError(err.message);
      } else {
        setDeleteError("Erro inesperado ao excluir negócio.");
      }
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Negócios</h1>
          <p className="page-subtitle">Acompanhe os negócios em andamento.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreateForm}>
          Novo negócio
        </button>
      </div>

      <form className="toolbar" onSubmit={handleSearchSubmit}>
        <label className="field-label" htmlFor="deal-search">
          Buscar
        </label>
        <input
          id="deal-search"
          name="search"
          type="text"
          className="input"
          placeholder="Buscar por título"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <button type="submit" className="btn btn-secondary">
          Buscar
        </button>

        <label className="field-label" htmlFor="deal-stage-filter">
          Etapa
        </label>
        <select
          id="deal-stage-filter"
          name="stage"
          className="input"
          value={stageFilter}
          onChange={(event) => {
            setPage(1);
            setStageFilter(event.target.value as DealStage | "");
          }}
        >
          <option value="">Todas</option>
          {DEAL_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {STAGE_LABELS[stage]}
            </option>
          ))}
        </select>

        <label className="field-label" htmlFor="deal-client-filter">
          Cliente
        </label>
        <select
          id="deal-client-filter"
          name="clientId"
          className="input"
          value={clientFilter}
          onChange={(event) => {
            setPage(1);
            setClientFilter(event.target.value);
          }}
        >
          <option value="">Todos</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </form>

      <StatusView
        loading={loading}
        error={error}
        isEmpty={!loading && !error && deals.length === 0}
        emptyMessage="Nenhum negócio encontrado."
      />

      {!loading && !error && deals.length > 0 && (
        <>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Cliente</th>
                  <th>Valor</th>
                  <th>Etapa</th>
                  <th>Atualizado em</th>
                  <th className="col-actions">Ações</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => (
                  <tr key={deal.id} data-testid="deal-row" data-id={deal.id}>
                    <td>{deal.title}</td>
                    <td>{clientName(deal.clientId)}</td>
                    <td>{formatCurrencyFromCents(deal.valueInCents)}</td>
                    <td>
                      <span className={`stage-badge stage-${deal.stage}`}>{STAGE_LABELS[deal.stage]}</span>
                    </td>
                    <td>{formatDate(deal.updatedAt)}</td>
                    <td className="col-actions">
                      <button type="button" className="btn btn-link" onClick={() => openEditForm(deal)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-link btn-link-danger"
                        onClick={() => setDeleteTarget(deal)}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-footer">
            <span className="table-total">{total} negócio(s) encontrado(s)</span>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </>
      )}

      {formOpen && (
        <Modal title={formMode === "create" ? "Novo negócio" : "Editar negócio"} onClose={() => setFormOpen(false)}>
          <form onSubmit={handleFormSubmit} className="form-grid">
            {formError && (
              <div className="form-error" role="alert">
                {formError}
              </div>
            )}
            <div className="field">
              <label className="field-label" htmlFor="deal-title">
                Título
              </label>
              <input
                id="deal-title"
                name="title"
                type="text"
                className="input"
                required
                minLength={2}
                maxLength={120}
                value={formState.title}
                onChange={(event) => setFormState({ ...formState, title: event.target.value })}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="deal-value">
                Valor (em centavos)
              </label>
              <input
                id="deal-value"
                name="valueInCents"
                type="number"
                className="input"
                required
                min={0}
                step={1}
                value={formState.valueInCents}
                onChange={(event) => setFormState({ ...formState, valueInCents: event.target.value })}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="deal-client">
                Cliente
              </label>
              <select
                id="deal-client"
                name="clientId"
                className="input"
                required
                value={formState.clientId}
                onChange={(event) => setFormState({ ...formState, clientId: event.target.value })}
              >
                <option value="">Selecione um cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="deal-stage">
                Etapa
              </label>
              <select
                id="deal-stage"
                name="stage"
                className="input"
                value={formState.stage}
                onChange={(event) => setFormState({ ...formState, stage: event.target.value as DealStage })}
              >
                {DEAL_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {STAGE_LABELS[stage]}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setFormOpen(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`Tem certeza que deseja excluir o negócio "${deleteTarget.title}"?`}
          onCancel={() => {
            setDeleteTarget(null);
            setDeleteError(null);
          }}
          onConfirm={handleConfirmDelete}
        />
      )}
      {deleteError && (
        <div className="form-error toast-error" role="alert">
          {deleteError}
        </div>
      )}
    </div>
  );
}
