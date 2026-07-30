import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createClient,
  deleteClient,
  listClients,
  listDeals,
  updateClient,
  type ClientPayload,
} from '../api';
import { useToast } from '../components/ToastProvider';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Modal,
  PageHead,
  Pagination,
  StageBadge,
} from '../components/Ui';
import { formatCurrency, formatDate } from '../format';
import type { Client, Deal, Pagination as PaginationMeta } from '../types';

const PAGE_SIZE = 4;
const EMPTY_PAGINATION: PaginationMeta = { page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 0 };

interface FormState {
  name: string;
  email: string;
  company: string;
}

const EMPTY_FORM: FormState = { name: '', email: '', company: '' };

export function ClientsPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [clients, setClients] = useState<Client[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [dealsOf, setDealsOf] = useState<Client | null>(null);
  const [relatedDeals, setRelatedDeals] = useState<Deal[] | null>(null);
  const [relatedError, setRelatedError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listClients({ search, page, pageSize: PAGE_SIZE });
      setClients(result.data);
      setPagination(result.pagination);
      if (result.data.length === 0 && page > 1 && result.pagination.totalPages > 0) {
        setPage(Math.min(page, result.pagination.totalPages));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erro desconhecido.');
      setClients([]);
      setPagination(EMPTY_PAGINATION);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormOpen(true);
  }

  function openEdit(client: Client) {
    setEditing(client);
    setForm({ name: client.name, email: client.email, company: client.company ?? '' });
    setFormErrors({});
    setFormOpen(true);
  }

  function validate(values: FormState) {
    const errors: Partial<Record<keyof FormState, string>> = {};
    const name = values.name.trim();
    const email = values.email.trim();
    if (name.length < 2 || name.length > 80) {
      errors.name = 'O nome deve ter entre 2 e 80 caracteres.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(email)) {
      errors.email = 'Informe um e-mail válido.';
    }
    if (values.company.trim().length > 120) {
      errors.company = 'A empresa deve ter no máximo 120 caracteres.';
    }
    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validate(form);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload: ClientPayload = {
      name: form.name.trim(),
      email: form.email.trim(),
      company: form.company.trim() === '' ? null : form.company.trim(),
    };

    setSaving(true);
    try {
      if (editing) {
        await updateClient(editing.id, payload);
        toast.success('Cliente atualizado com sucesso.');
      } else {
        await createClient(payload);
        toast.success('Cliente criado com sucesso.');
        setPage(1);
      }
      setFormOpen(false);
      await load();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Erro desconhecido.';
      setFormErrors({ email: message });
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteClient(toDelete.id);
      toast.success('Cliente excluído com sucesso.');
      setToDelete(null);
      await load();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Erro desconhecido.';
      toast.error(message);
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  async function openDeals(client: Client) {
    setDealsOf(client);
    setRelatedDeals(null);
    setRelatedError(null);
    try {
      const result = await listDeals({ clientId: client.id, pageSize: 50 });
      setRelatedDeals(result.data);
    } catch (cause) {
      setRelatedError(cause instanceof Error ? cause.message : 'Erro desconhecido.');
    }
  }

  const showEmpty = !loading && !error && clients.length === 0;

  return (
    <>
      <PageHead
        eyebrow="Cadastro"
        title="Clientes"
        subtitle="Gerencie a base de clientes e acesse os negócios relacionados."
        actions={
          <button type="button" className="btn btn--primary" onClick={openCreate}>
            Novo cliente
          </button>
        }
      />

      <section className="card">
        <div className="toolbar">
          <div className="field field--grow">
            <label className="field__label" htmlFor="client-search">
              Buscar
            </label>
            <input
              id="client-search"
              name="search"
              type="search"
              className="input"
              placeholder="Nome, e-mail ou empresa"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
          <div className="field">
            <span className="field__label" aria-hidden="true">
              &nbsp;
            </span>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setSearchInput('');
                setSearch('');
                setPage(1);
              }}
              disabled={searchInput === '' && search === ''}
            >
              Limpar
            </button>
          </div>
        </div>

        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {loading ? <LoadingState label="Carregando clientes…" /> : null}
        {showEmpty ? (
          <EmptyState
            title="Nenhum cliente encontrado"
            description={
              search
                ? 'Ajuste a busca ou limpe o filtro para ver todos os clientes.'
                : 'Cadastre o primeiro cliente para começar.'
            }
          />
        ) : null}

        {!loading && !error && clients.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">Lista de clientes</caption>
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
                    Criado em
                  </th>
                  <th scope="col" className="actions">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} data-testid="client-row" data-id={client.id}>
                    <td>
                      <div className="cell-main">{client.name}</div>
                      <div className="cell-sub">{client.email}</div>
                    </td>
                    <td className="hide-sm">{client.email}</td>
                    <td className="hide-sm">{client.company ?? '—'}</td>
                    <td className="hide-sm">{formatDate(client.createdAt)}</td>
                    <td className="actions">
                      <button
                        type="button"
                        className="btn btn--sm btn--link"
                        onClick={() => void openDeals(client)}
                      >
                        Ver negócios
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm btn--link"
                        onClick={() => openEdit(client)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm btn--link"
                        onClick={() => setToDelete(client)}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          totalPages={pagination.totalPages}
          disabled={loading}
          onChange={setPage}
        />
      </section>

      {formOpen ? (
        <Modal
          title={editing ? `Editar cliente #${editing.id}` : 'Novo cliente'}
          onClose={() => setFormOpen(false)}
          testId="client-form-modal"
          footer={
            <>
              <button type="button" className="btn" onClick={() => setFormOpen(false)}>
                Cancelar
              </button>
              <button type="submit" form="client-form" className="btn btn--primary" disabled={saving}>
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </>
          }
        >
          <form id="client-form" onSubmit={handleSubmit} noValidate>
            <Field label="Nome" htmlFor="client-name" error={formErrors.name}>
              <input
                id="client-name"
                name="name"
                className="input"
                value={form.name}
                maxLength={120}
                aria-invalid={formErrors.name ? 'true' : undefined}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>
            <Field label="E-mail" htmlFor="client-email" error={formErrors.email}>
              <input
                id="client-email"
                name="email"
                type="email"
                className="input"
                value={form.email}
                aria-invalid={formErrors.email ? 'true' : undefined}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </Field>
            <Field
              label="Empresa"
              htmlFor="client-company"
              hint="Opcional"
              error={formErrors.company}
            >
              <input
                id="client-company"
                name="company"
                className="input"
                value={form.company}
                onChange={(event) => setForm({ ...form, company: event.target.value })}
              />
            </Field>
          </form>
        </Modal>
      ) : null}

      {toDelete ? (
        <ConfirmDialog
          title="Excluir cliente"
          message={`Deseja realmente excluir o cliente “${toDelete.name}”?`}
          busy={deleting}
          onCancel={() => setToDelete(null)}
          onConfirm={() => void handleDelete()}
        />
      ) : null}

      {dealsOf ? (
        <Modal
          title={`Negócios de ${dealsOf.name}`}
          wide
          testId="client-deals-modal"
          onClose={() => setDealsOf(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setDealsOf(null)}>
                Fechar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => navigate(`/negocios?clientId=${dealsOf.id}`)}
              >
                Abrir em Negócios
              </button>
            </>
          }
        >
          {relatedError ? <div className="alert">{relatedError}</div> : null}
          {!relatedDeals && !relatedError ? <LoadingState label="Carregando negócios…" /> : null}
          {relatedDeals && relatedDeals.length === 0 ? (
            <EmptyState
              title="Nenhum negócio relacionado"
              description="Este cliente ainda não possui negócios cadastrados."
            />
          ) : null}
          {relatedDeals && relatedDeals.length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Negócio</th>
                    <th scope="col">Etapa</th>
                    <th scope="col" className="num">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {relatedDeals.map((deal) => (
                    <tr key={deal.id} data-testid="deal-row" data-id={deal.id}>
                      <td className="cell-main">{deal.title}</td>
                      <td>
                        <StageBadge stage={deal.stage} />
                      </td>
                      <td className="num">{formatCurrency(deal.valueInCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Modal>
      ) : null}
    </>
  );
}
