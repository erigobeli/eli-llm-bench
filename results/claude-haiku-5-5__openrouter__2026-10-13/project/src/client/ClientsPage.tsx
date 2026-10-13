import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router';
import type { Client } from '../shared/types.js';
import { api, useResource } from './api.js';
import {
  ConfirmPanel,
  ErrorState,
  LoadingState,
  Notice,
  PageHeader,
  Pagination,
} from './components.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAGE_SIZE = 4;

interface ClientFormValues {
  name: string;
  email: string;
  company: string;
}

function validateClient(values: ClientFormValues): Partial<Record<keyof ClientFormValues, string>> {
  const errors: Partial<Record<keyof ClientFormValues, string>> = {};
  const name = values.name.trim();
  if (name.length < 2 || name.length > 80) errors.name = 'Informe um nome com entre 2 e 80 caracteres.';
  const email = values.email.trim();
  if (!email || !EMAIL_PATTERN.test(email)) errors.email = 'Informe um e-mail válido.';
  if (values.company.trim().length > 120) errors.company = 'A empresa deve ter no máximo 120 caracteres.';
  return errors;
}

function ClientForm({
  client,
  onSaved,
  onCancel,
}: {
  client: Client | null;
  onSaved: (message: string) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<ClientFormValues>({
    name: client?.name ?? '',
    email: client?.email ?? '',
    company: client?.company ?? '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ClientFormValues, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (field: keyof ClientFormValues) => (event: ChangeEvent<HTMLInputElement>) =>
    setValues((prev) => ({ ...prev, [field]: event.target.value }));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);
    const validation = validateClient(values);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    const payload = {
      name: values.name.trim(),
      email: values.email.trim(),
      company: values.company.trim() === '' ? null : values.company.trim(),
    };
    setSaving(true);
    try {
      if (client) {
        await api.updateClient(client.id, payload);
        onSaved('Cliente atualizado com sucesso.');
      } else {
        await api.createClient(payload);
        onSaved('Cliente criado com sucesso.');
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Não foi possível salvar o cliente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel form-panel" aria-labelledby="client-form-title">
      <h2 id="client-form-title">{client ? 'Editar cliente' : 'Novo cliente'}</h2>
      {serverError && <Notice kind="error">{serverError}</Notice>}
      <form onSubmit={handleSubmit} noValidate className="form-grid">
        <div className="field">
          <label htmlFor="client-name">Nome</label>
          <input
            id="client-name"
            name="name"
            type="text"
            value={values.name}
            onChange={update('name')}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'client-name-error' : undefined}
            autoComplete="off"
          />
          {errors.name && (
            <span id="client-name-error" className="field-error">
              {errors.name}
            </span>
          )}
        </div>
        <div className="field">
          <label htmlFor="client-email">E-mail</label>
          <input
            id="client-email"
            name="email"
            type="email"
            value={values.email}
            onChange={update('email')}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'client-email-error' : undefined}
            autoComplete="off"
          />
          {errors.email && (
            <span id="client-email-error" className="field-error">
              {errors.email}
            </span>
          )}
        </div>
        <div className="field">
          <label htmlFor="client-company">Empresa (opcional)</label>
          <input
            id="client-company"
            name="company"
            type="text"
            value={values.company}
            onChange={update('company')}
            aria-invalid={Boolean(errors.company)}
            aria-describedby={errors.company ? 'client-company-error' : undefined}
            autoComplete="off"
          />
          {errors.company && (
            <span id="client-company-error" className="field-error">
              {errors.company}
            </span>
          )}
        </div>
        <div className="form-actions">
          <button type="button" className="button button-secondary" onClick={onCancel} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="button button-primary" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar cliente'}
          </button>
        </div>
      </form>
    </section>
  );
}

export function ClientsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [formTarget, setFormTarget] = useState<Client | 'new' | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (search.trim()) params.set('search', search.trim());
  const query = params.toString();

  const clients = useResource(() => api.listClients(new URLSearchParams(query)), [query]);

  useEffect(() => {
    const totalPages = clients.data?.pagination.totalPages ?? 0;
    if (totalPages > 0 && page > totalPages) setPage(totalPages);
  }, [clients.data, page]);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleSaved(message: string) {
    setFormTarget(null);
    setNotice({ kind: 'success', text: message });
    clients.reload();
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.deleteClient(pendingDelete.id);
      setNotice({ kind: 'success', text: `Cliente "${pendingDelete.name}" excluído.` });
      setPendingDelete(null);
      clients.reload();
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Não foi possível excluir o cliente.' });
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Cadastro de clientes e contatos comerciais."
        actions={
          <button
            type="button"
            className="button button-primary"
            onClick={() => {
              setNotice(null);
              setFormTarget('new');
            }}
          >
            Novo cliente
          </button>
        }
      />

      {notice && <Notice kind={notice.kind} onClose={() => setNotice(null)}>{notice.text}</Notice>}

      {formTarget && (
        <ClientForm
          key={formTarget === 'new' ? 'new' : formTarget.id}
          client={formTarget === 'new' ? null : formTarget}
          onSaved={handleSaved}
          onCancel={() => setFormTarget(null)}
        />
      )}

      {pendingDelete && (
        <ConfirmPanel
          title="Excluir cliente"
          message={`Excluir o cliente "${pendingDelete.name}"? Clientes com negócios relacionados não podem ser excluídos.`}
          confirmLabel="Excluir cliente"
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      <section className="panel">
        <div className="toolbar">
          <div className="field field-search">
            <label htmlFor="client-search">Buscar</label>
            <input
              id="client-search"
              name="search"
              type="search"
              placeholder="Nome, e-mail ou empresa"
              value={search}
              onChange={(event) => handleSearch(event.target.value)}
            />
          </div>
        </div>

        {clients.status === 'loading' && !clients.data && <LoadingState label="Carregando clientes..." />}
        {clients.status === 'error' && (
          <ErrorState message={`Não foi possível carregar os clientes: ${clients.error}`} onRetry={clients.reload} />
        )}

        {clients.data && (
          <>
            {clients.data.data.length === 0 ? (
              <p className="state empty-state">
                {search.trim()
                  ? 'Nenhum cliente encontrado para esta busca.'
                  : 'Nenhum cliente cadastrado. Use "Novo cliente" para começar.'}
              </p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Nome</th>
                      <th scope="col">E-mail</th>
                      <th scope="col">Empresa</th>
                      <th scope="col">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.data.data.map((client) => (
                      <tr key={client.id} data-testid="client-row" data-id={client.id}>
                        <td data-label="Nome">
                          <span className="cell-strong">{client.name}</span>
                        </td>
                        <td data-label="E-mail">{client.email}</td>
                        <td data-label="Empresa">{client.company ?? '—'}</td>
                        <td data-label="Ações">
                          <div className="row-actions">
                            <Link to={`/negocios?clientId=${client.id}`} className="link-button">
                              Ver negócios
                            </Link>
                            <button
                              type="button"
                              className="link-button"
                              onClick={() => {
                                setNotice(null);
                                setFormTarget(client);
                              }}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="link-button link-danger"
                              onClick={() => setPendingDelete(client)}
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
            <Pagination
              page={clients.data.pagination.page}
              totalPages={clients.data.pagination.totalPages}
              total={clients.data.pagination.total}
              onChange={setPage}
            />
          </>
        )}
      </section>
    </>
  );
}
