import { useEffect, useState } from "react";
import { createClient, deleteClient, fetchClients, fetchDeals, updateClient } from "../api/client";
import { ApiError } from "../api/client";
import type { Client, Deal } from "../types";
import { Pagination } from "../components/Pagination";
import { StatusView } from "../components/StatusView";
import { Modal } from "../components/Modal";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { formatDate } from "../utils/format";
import { STAGE_LABELS } from "../types";
import { formatCurrencyFromCents } from "../utils/format";

const PAGE_SIZE = 4;

interface ClientFormState {
  name: string;
  email: string;
  company: string;
}

const EMPTY_FORM: ClientFormState = { name: "", email: "", company: "" };

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formState, setFormState] = useState<ClientFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [dealsPanelClient, setDealsPanelClient] = useState<Client | null>(null);
  const [relatedDeals, setRelatedDeals] = useState<Deal[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  function loadClients() {
    setLoading(true);
    setError(null);
    fetchClients({ search, page, pageSize: PAGE_SIZE })
      .then((result) => {
        setClients(result.data);
        setTotal(result.pagination.total);
        setTotalPages(result.pagination.totalPages);
      })
      .catch(() => {
        setError("Não foi possível carregar os clientes.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function openCreateForm() {
    setFormMode("create");
    setFormState(EMPTY_FORM);
    setFormError(null);
    setEditingId(null);
    setFormOpen(true);
  }

  function openEditForm(client: Client) {
    setFormMode("edit");
    setFormState({ name: client.name, email: client.email, company: client.company ?? "" });
    setFormError(null);
    setEditingId(client.id);
    setFormOpen(true);
  }

  async function handleFormSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const payload = {
        name: formState.name,
        email: formState.email,
        company: formState.company.trim().length > 0 ? formState.company.trim() : null
      };
      if (formMode === "create") {
        await createClient(payload);
      } else if (editingId !== null) {
        await updateClient(editingId, payload);
      }
      setFormOpen(false);
      loadClients();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("Erro inesperado ao salvar cliente.");
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
      await deleteClient(deleteTarget.id);
      setDeleteTarget(null);
      loadClients();
    } catch (err) {
      if (err instanceof ApiError) {
        setDeleteError(err.message);
      } else {
        setDeleteError("Erro inesperado ao excluir cliente.");
      }
    }
  }

  function openDealsPanel(client: Client) {
    setDealsPanelClient(client);
    setRelatedLoading(true);
    fetchDeals({ clientId: client.id, pageSize: 50 })
      .then((result) => setRelatedDeals(result.data))
      .finally(() => setRelatedLoading(false));
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">Gerencie os clientes cadastrados no CRM.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreateForm}>
          Novo cliente
        </button>
      </div>

      <form className="toolbar" onSubmit={handleSearchSubmit}>
        <label className="field-label" htmlFor="client-search">
          Buscar
        </label>
        <input
          id="client-search"
          name="search"
          type="text"
          className="input"
          placeholder="Buscar por nome, e-mail ou empresa"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <button type="submit" className="btn btn-secondary">
          Buscar
        </button>
      </form>

      <StatusView loading={loading} error={error} isEmpty={!loading && !error && clients.length === 0} emptyMessage="Nenhum cliente encontrado." />

      {!loading && !error && clients.length > 0 && (
        <>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Empresa</th>
                  <th>Atualizado em</th>
                  <th className="col-actions">Ações</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} data-testid="client-row" data-id={client.id}>
                    <td>{client.name}</td>
                    <td>{client.email}</td>
                    <td>{client.company ?? "—"}</td>
                    <td>{formatDate(client.updatedAt)}</td>
                    <td className="col-actions">
                      <button type="button" className="btn btn-link" onClick={() => openDealsPanel(client)}>
                        Ver negócios
                      </button>
                      <button type="button" className="btn btn-link" onClick={() => openEditForm(client)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-link btn-link-danger"
                        onClick={() => setDeleteTarget(client)}
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
            <span className="table-total">{total} cliente(s) encontrado(s)</span>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </>
      )}

      {formOpen && (
        <Modal title={formMode === "create" ? "Novo cliente" : "Editar cliente"} onClose={() => setFormOpen(false)}>
          <form onSubmit={handleFormSubmit} className="form-grid">
            {formError && <div className="form-error" role="alert">{formError}</div>}
            <div className="field">
              <label className="field-label" htmlFor="client-name">
                Nome
              </label>
              <input
                id="client-name"
                name="name"
                type="text"
                className="input"
                required
                minLength={2}
                maxLength={80}
                value={formState.name}
                onChange={(event) => setFormState({ ...formState, name: event.target.value })}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="client-email">
                E-mail
              </label>
              <input
                id="client-email"
                name="email"
                type="email"
                className="input"
                required
                value={formState.email}
                onChange={(event) => setFormState({ ...formState, email: event.target.value })}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="client-company">
                Empresa
              </label>
              <input
                id="client-company"
                name="company"
                type="text"
                className="input"
                value={formState.company}
                onChange={(event) => setFormState({ ...formState, company: event.target.value })}
              />
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
          message={`Tem certeza que deseja excluir o cliente "${deleteTarget.name}"?`}
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

      {dealsPanelClient && (
        <Modal title={`Negócios de ${dealsPanelClient.name}`} onClose={() => setDealsPanelClient(null)}>
          {relatedLoading && <StatusView loading />}
          {!relatedLoading && relatedDeals.length === 0 && (
            <StatusView isEmpty emptyMessage="Este cliente ainda não possui negócios." />
          )}
          {!relatedLoading && relatedDeals.length > 0 && (
            <ul className="related-list">
              {relatedDeals.map((deal) => (
                <li key={deal.id} className="related-item">
                  <span className="related-title">{deal.title}</span>
                  <span className="related-meta">
                    {STAGE_LABELS[deal.stage]} · {formatCurrencyFromCents(deal.valueInCents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </div>
  );
}
