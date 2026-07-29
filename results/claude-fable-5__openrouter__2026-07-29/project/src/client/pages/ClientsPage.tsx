import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatDate, type Client, type PaginationMeta } from "../api";
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  Pagination,
  useToast
} from "../ui";

const PAGE_SIZE = 4;

interface FormState {
  name: string;
  email: string;
  company: string;
}

const EMPTY_FORM: FormState = { name: "", email: "", company: "" };

export default function ClientsPage() {
  const navigate = useNavigate();
  const { notify } = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<Client | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.listClients({ search, page, pageSize: PAGE_SIZE });
      setClients(result.data);
      setPagination(result.pagination);
      if (result.data.length === 0 && page > 1) {
        setPage(result.pagination.totalPages);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditing(client);
    setForm({
      name: client.name,
      email: client.email,
      company: client.company ?? ""
    });
    setFormError(null);
    setModalOpen(true);
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const submitForm = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const name = form.name.trim();
    const email = form.email.trim();
    if (name.length < 2 || name.length > 80) {
      setFormError("O nome deve ter entre 2 e 80 caracteres.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError("Informe um e-mail em formato válido.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        email,
        company: form.company.trim() === "" ? null : form.company.trim()
      };
      if (editing) {
        await api.updateClient(editing.id, payload);
        notify("success", "Cliente atualizado com sucesso.");
      } else {
        await api.createClient(payload);
        notify("success", "Cliente criado com sucesso.");
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar o cliente.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.deleteClient(deleting.id);
      notify("success", "Cliente excluído com sucesso.");
      setDeleting(null);
      await load();
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Erro ao excluir o cliente.");
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Clientes</h1>
          <p>Gerencie a carteira de clientes da equipe comercial.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          Novo cliente
        </button>
      </div>

      <div className="panel">
        <form className="panel-toolbar" onSubmit={submitSearch} role="search">
          <div className="toolbar-field" style={{ flex: "1 1 220px" }}>
            <label htmlFor="client-search">Buscar</label>
            <input
              id="client-search"
              name="search"
              type="search"
              placeholder="Nome, e-mail ou empresa"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary">
            Buscar
          </button>
        </form>

        {loading ? (
          <LoadingState label="Carregando clientes..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : clients.length === 0 ? (
          <EmptyState
            message={
              search
                ? "Nenhum cliente encontrado para a busca informada."
                : "Nenhum cliente cadastrado. Crie o primeiro cliente."
            }
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Empresa</th>
                  <th>Criado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} data-testid="client-row" data-id={client.id}>
                    <td>{client.name}</td>
                    <td className="cell-muted">{client.email}</td>
                    <td className="cell-muted">{client.company ?? "—"}</td>
                    <td className="cell-muted">{formatDate(client.createdAt)}</td>
                    <td>
                      <div className="cell-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/negocios?clientId=${client.id}`)}
                        >
                          Ver negócios
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEdit(client)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => setDeleting(client)}
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

        {pagination && !loading && !error ? (
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onChange={setPage}
          />
        ) : null}
      </div>

      {modalOpen ? (
        <Modal
          title={editing ? "Editar cliente" : "Novo cliente"}
          onClose={() => setModalOpen(false)}
        >
          <form className="form-grid" onSubmit={submitForm} noValidate>
            {formError ? <div className="form-error" role="alert">{formError}</div> : null}
            <div className="field">
              <label htmlFor="client-name">Nome *</label>
              <input
                id="client-name"
                name="name"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <span className="hint">Entre 2 e 80 caracteres.</span>
            </div>
            <div className="field">
              <label htmlFor="client-email">E-mail *</label>
              <input
                id="client-email"
                name="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="client-company">Empresa</label>
              <input
                id="client-company"
                name="company"
                type="text"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
              <span className="hint">Opcional.</span>
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Excluir cliente"
          message={`Tem certeza de que deseja excluir o cliente "${deleting.name}"? Esta ação não pode ser desfeita.`}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleting(null)}
          busy={deleteBusy}
        />
      ) : null}
    </div>
  );
}
