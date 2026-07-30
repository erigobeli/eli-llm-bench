import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  FormAlert,
  LoadingState,
  Modal,
  Pager,
  useToast,
} from "../components/ui";
import { formatDate } from "../format";
import { UI_PAGE_SIZE, type Client, type Pagination } from "../types";

interface FormState {
  name: string;
  email: string;
  company: string;
}

const EMPTY_FORM: FormState = { name: "", email: "", company: "" };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};
  const name = form.name.trim();
  const email = form.email.trim();
  if (name.length < 2 || name.length > 80) {
    errors.name = "Informe um nome com 2 a 80 caracteres.";
  }
  if (email === "") {
    errors.email = "Informe o e-mail do cliente.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Informe um e-mail válido.";
  }
  if (form.company.trim().length > 120) {
    errors.company = "A empresa deve ter no máximo 120 caracteres.";
  }
  return errors;
}

export default function ClientsPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: UI_PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<Client | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await api.listClients({
        search: search || undefined,
        page,
        pageSize: UI_PAGE_SIZE,
      });
      setClients(result.data);
      setPagination(result.pagination);
      if (result.data.length === 0 && result.pagination.total > 0 && page > 1) {
        setPage(Math.max(1, result.pagination.totalPages));
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Erro inesperado.");
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditing(client);
    setForm({
      name: client.name,
      email: client.email,
      company: client.company ?? "",
    });
    setErrors({});
    setFormError(null);
    setFormOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validate(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      setFormError("Revise os campos destacados para continuar.");
      return;
    }

    setSaving(true);
    setFormError(null);
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      company: form.company.trim() === "" ? null : form.company.trim(),
    };

    try {
      if (editing) {
        await api.updateClient(editing.id, payload);
        toast.success("Cliente atualizado com sucesso.");
      } else {
        await api.createClient(payload);
        toast.success("Cliente criado com sucesso.");
        setPage(1);
      }
      setFormOpen(false);
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado.";
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) {
      return;
    }
    setDeleteBusy(true);
    try {
      await api.deleteClient(deleting.id);
      toast.success("Cliente excluído com sucesso.");
      setDeleting(null);
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado.";
      toast.error(message);
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <section className="page">
      <div className="page__header">
        <div>
          <p className="page__eyebrow">Cadastro</p>
          <h1 className="page__title">Clientes</h1>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={openCreate}
          data-testid="new-client"
        >
          Novo cliente
        </button>
      </div>

      <div className="card">
        <form
          className="toolbar"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setSearch(searchInput.trim());
          }}
        >
          <div className="field field--inline">
            <label htmlFor="client-search">Buscar clientes</label>
            <input
              id="client-search"
              name="search"
              type="search"
              value={searchInput}
              placeholder="Nome, e-mail ou empresa"
              onChange={(event) => {
                const value = event.target.value;
                setSearchInput(value);
                setPage(1);
                setSearch(value.trim());
              }}
            />
          </div>
          <button type="submit" className="btn">
            Buscar
          </button>
          {search ? (
            <button
              type="button"
              className="btn btn--subtle"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setPage(1);
              }}
            >
              Limpar
            </button>
          ) : null}
        </form>

        {loading ? <LoadingState label="Carregando clientes..." /> : null}
        {loadError ? <ErrorState message={loadError} onRetry={load} /> : null}

        {!loading && !loadError && clients.length === 0 ? (
          <EmptyState
            title="Nenhum cliente encontrado"
            description={
              search
                ? "Ajuste a busca para localizar outros registros."
                : "Cadastre o primeiro cliente para começar."
            }
          />
        ) : null}

        {!loading && !loadError && clients.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col" className="hide-sm">
                    E-mail
                  </th>
                  <th scope="col" className="hide-sm">
                    Empresa
                  </th>
                  <th scope="col" className="hide-sm">
                    Atualizado
                  </th>
                  <th scope="col" className="actions-col">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} data-testid="client-row" data-id={client.id}>
                    <td>
                      <span className="cell-title">{client.name}</span>
                      <span className="cell-sub hide-lg">{client.email}</span>
                    </td>
                    <td className="hide-sm cell-muted">{client.email}</td>
                    <td className="hide-sm cell-muted">{client.company ?? "—"}</td>
                    <td className="hide-sm cell-muted">{formatDate(client.updatedAt)}</td>
                    <td className="actions-col">
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn--small"
                          onClick={() => navigate(`/negocios?clientId=${client.id}`)}
                          data-testid="view-deals"
                        >
                          Ver negócios
                        </button>
                        <button
                          type="button"
                          className="btn btn--small"
                          onClick={() => openEdit(client)}
                          data-testid="edit-client"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn--small btn--danger-ghost"
                          onClick={() => setDeleting(client)}
                          data-testid="delete-client"
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
        ) : null}

        {!loadError ? (
          <Pager pagination={pagination} onChange={setPage} label="clientes" />
        ) : null}
      </div>

      {formOpen ? (
        <Modal
          title={editing ? `Editar cliente #${editing.id}` : "Novo cliente"}
          onClose={() => setFormOpen(false)}
          testId="client-form-modal"
        >
          <form className="form" onSubmit={submit} noValidate data-testid="client-form">
            {formError ? <FormAlert message={formError} /> : null}
            <Field label="Nome" htmlFor="client-name" error={errors.name}>
              <input
                id="client-name"
                name="name"
                type="text"
                autoComplete="off"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>
            <Field label="E-mail" htmlFor="client-email" error={errors.email}>
              <input
                id="client-email"
                name="email"
                type="email"
                autoComplete="off"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </Field>
            <Field
              label="Empresa"
              htmlFor="client-company"
              error={errors.company}
              hint="Campo opcional."
            >
              <input
                id="client-company"
                name="company"
                type="text"
                autoComplete="off"
                value={form.company}
                onChange={(event) => setForm({ ...form, company: event.target.value })}
              />
            </Field>
            <div className="form__actions">
              <button
                type="button"
                className="btn"
                onClick={() => setFormOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={saving}
                data-testid="submit-client"
              >
                {saving ? "Salvando..." : "Salvar cliente"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Excluir cliente"
          message={`Deseja realmente excluir o cliente "${deleting.name}"? Esta ação não pode ser desfeita.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
          busy={deleteBusy}
        />
      ) : null}
    </section>
  );
}
