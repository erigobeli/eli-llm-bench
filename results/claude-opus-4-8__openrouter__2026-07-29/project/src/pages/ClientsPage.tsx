import { useCallback, useEffect, useState } from "react";
import { api, formatCurrency } from "../api";
import { Client, Deal, STAGE_LABELS } from "../types";
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Loading,
  Modal,
  Pagination,
} from "../components";
import { useToast } from "../toast";

const PAGE_SIZE = 4;

interface FormState {
  name: string;
  email: string;
  company: string;
}

const EMPTY_FORM: FormState = { name: "", email: "", company: "" };

export default function ClientsPage() {
  const { notify } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<Client | null>(null);

  const [dealsClient, setDealsClient] = useState<Client | null>(null);
  const [relatedDeals, setRelatedDeals] = useState<Deal[] | null>(null);
  const [dealsError, setDealsError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listClients({ search, page, pageSize: PAGE_SIZE });
      setClients(res.data);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(client: Client) {
    setEditing(client);
    setForm({
      name: client.name,
      email: client.email,
      company: client.company ?? "",
    });
    setFormError(null);
    setShowForm(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        company: form.company.trim() === "" ? null : form.company.trim(),
      };
      if (editing) {
        await api.updateClient(editing.id, payload);
        notify("success", "Cliente atualizado com sucesso.");
      } else {
        await api.createClient(payload);
        notify("success", "Cliente criado com sucesso.");
      }
      setShowForm(false);
      if (!editing) setPage(1);
      await load();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await api.deleteClient(toDelete.id);
      notify("success", "Cliente excluído com sucesso.");
      setToDelete(null);
      if (clients.length === 1 && page > 1) setPage((p) => p - 1);
      else await load();
    } catch (err) {
      notify("error", (err as Error).message);
      setToDelete(null);
    }
  }

  async function openDeals(client: Client) {
    setDealsClient(client);
    setRelatedDeals(null);
    setDealsError(null);
    try {
      const res = await api.listDeals({ clientId: client.id, pageSize: 50 });
      setRelatedDeals(res.data);
    } catch (err) {
      setDealsError((err as Error).message);
    }
  }

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Clientes</h1>
          <p className="page-subtitle">Gerencie os clientes da sua base.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} type="button">
          Novo cliente
        </button>
      </header>

      <form className="toolbar" onSubmit={applySearch} role="search">
        <input
          className="input"
          type="search"
          name="search"
          placeholder="Buscar por nome, e-mail ou empresa"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          aria-label="Buscar clientes"
        />
        <button className="btn btn-secondary" type="submit">
          Buscar
        </button>
      </form>

      {loading && <Loading />}
      {error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && clients.length === 0 && (
        <EmptyState message="Nenhum cliente encontrado." />
      )}

      {!loading && !error && clients.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Empresa</th>
                <th className="col-actions">Ações</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} data-testid="client-row" data-id={c.id}>
                  <td>{c.name}</td>
                  <td>{c.email}</td>
                  <td>{c.company ?? "—"}</td>
                  <td className="col-actions">
                    <div className="row-actions">
                      <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={() => openDeals(c)}
                      >
                        Ver negócios
                      </button>
                      <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={() => openEdit(c)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-ghost btn-ghost-danger"
                        type="button"
                        onClick={() => setToDelete(c)}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && total > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onChange={setPage}
        />
      )}

      {showForm && (
        <Modal
          title={editing ? "Editar cliente" : "Novo cliente"}
          onClose={() => setShowForm(false)}
        >
          <form className="form" onSubmit={submitForm}>
            {formError && (
              <div className="form-error" role="alert">
                {formError}
              </div>
            )}
            <label className="field">
              <span className="field-label">Nome</span>
              <input
                className="input"
                name="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                minLength={2}
                maxLength={80}
              />
            </label>
            <label className="field">
              <span className="field-label">E-mail</span>
              <input
                className="input"
                name="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </label>
            <label className="field">
              <span className="field-label">Empresa (opcional)</span>
              <input
                className="input"
                name="company"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                maxLength={120}
              />
            </label>
            <div className="form-actions">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setShowForm(false)}
              >
                Cancelar
              </button>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Excluir cliente"
          message={`Tem certeza de que deseja excluir "${toDelete.name}"? Esta ação não pode ser desfeita.`}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}

      {dealsClient && (
        <Modal
          title={`Negócios de ${dealsClient.name}`}
          onClose={() => setDealsClient(null)}
        >
          {dealsError && <ErrorState message={dealsError} />}
          {!dealsError && relatedDeals === null && <Loading />}
          {!dealsError && relatedDeals !== null && relatedDeals.length === 0 && (
            <EmptyState message="Este cliente ainda não possui negócios." />
          )}
          {!dealsError && relatedDeals !== null && relatedDeals.length > 0 && (
            <ul className="related-list">
              {relatedDeals.map((d) => (
                <li key={d.id} className="related-item">
                  <span className="related-title">{d.title}</span>
                  <span className={`badge badge-${d.stage}`}>
                    {STAGE_LABELS[d.stage]}
                  </span>
                  <span className="related-value">
                    {formatCurrency(d.valueInCents)}
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
