import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  api,
  formatCurrency,
  formatDate,
  STAGE_LABELS,
  type Client,
  type Deal,
  type Pagination,
} from '../api';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FormError,
  LoadingState,
  Modal,
  PageHeader,
  Paginator,
  StageBadge,
  useRouter,
  useToast,
} from '../ui';

const PAGE_SIZE = 4;

interface FormState {
  name: string;
  email: string;
  company: string;
}

const EMPTY_FORM: FormState = { name: '', email: '', company: '' };

export default function ClientsPage() {
  const { navigate } = useRouter();
  const { notify } = useToast();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [dealsOf, setDealsOf] = useState<Client | null>(null);
  const [relatedDeals, setRelatedDeals] = useState<Deal[] | null>(null);
  const [relatedError, setRelatedError] = useState<string | null>(null);

  const firstField = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.listClients({ search, page, pageSize: PAGE_SIZE });
      setClients(result.data);
      setPagination(result.pagination);
      if (result.data.length === 0 && result.pagination.total > 0 && page > 1) {
        setPage(Math.max(1, result.pagination.totalPages));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
    window.setTimeout(() => firstField.current?.focus(), 30);
  };

  const openEdit = (client: Client) => {
    setEditing(client);
    setForm({ name: client.name, email: client.email, company: client.company ?? '' });
    setFormError(null);
    setFormOpen(true);
    window.setTimeout(() => firstField.current?.focus(), 30);
  };

  const validate = (): string | null => {
    const name = form.name.trim();
    const email = form.email.trim();
    if (name.length < 2 || name.length > 80) {
      return 'Informe um nome com 2 a 80 caracteres.';
    }
    if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) {
      return 'Informe um e-mail válido, por exemplo: contato@empresa.com.br';
    }
    return null;
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      setFormError(problem);
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      company: form.company.trim() === '' ? null : form.company.trim(),
    };
    try {
      if (editing) {
        await api.updateClient(editing.id, payload);
        notify('success', 'Cliente atualizado com sucesso.');
      } else {
        await api.createClient(payload);
        notify('success', 'Cliente criado com sucesso.');
        setPage(1);
      }
      setFormOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Não foi possível salvar o cliente.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.deleteClient(toDelete.id);
      notify('success', `Cliente "${toDelete.name}" excluído.`);
      setToDelete(null);
      await load();
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Não foi possível excluir o cliente.');
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const openDeals = async (client: Client) => {
    setDealsOf(client);
    setRelatedDeals(null);
    setRelatedError(null);
    try {
      const result = await api.clientDeals(client.id);
      setRelatedDeals(result.data);
    } catch (err) {
      setRelatedError(err instanceof Error ? err.message : 'Erro ao carregar negócios.');
    }
  };

  return (
    <section className="page">
      <PageHeader
        eyebrow="Cadastros"
        title="Clientes"
        subtitle="Gerencie contas, contatos e empresas atendidas."
        actions={
          <button type="button" className="btn btn--primary" onClick={openCreate}>
            Novo cliente
          </button>
        }
      />

      <section className="card">
        <div className="toolbar">
          <div className="field field--search">
            <label htmlFor="client-search">Buscar clientes</label>
            <input
              id="client-search"
              name="search"
              type="search"
              placeholder="Nome, e-mail ou empresa"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              autoComplete="off"
            />
          </div>
          <p className="toolbar__meta">
            {pagination.total} {pagination.total === 1 ? 'registro' : 'registros'}
          </p>
        </div>

        {loading ? <LoadingState label="Carregando clientes…" /> : null}
        {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {!loading && !error && clients.length === 0 ? (
          <EmptyState
            title={search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            hint={
              search
                ? 'Revise os termos da busca ou limpe o campo para ver todos os clientes.'
                : 'Use o botão "Novo cliente" para começar a base.'
            }
          />
        ) : null}

        {!loading && !error && clients.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">E-mail</th>
                  <th scope="col" className="col-secondary">
                    Empresa
                  </th>
                  <th scope="col" className="col-secondary">
                    Criado em
                  </th>
                  <th scope="col" className="col-actions">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} data-testid="client-row" data-id={client.id}>
                    <td>
                      <span className="cell-strong">{client.name}</span>
                    </td>
                    <td>
                      <span className="cell-muted">{client.email}</span>
                    </td>
                    <td className="col-secondary">{client.company ?? '—'}</td>
                    <td className="col-secondary">{formatDate(client.createdAt)}</td>
                    <td className="col-actions">
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn--sm"
                          onClick={() => void openDeals(client)}
                        >
                          Ver negócios
                        </button>
                        <button type="button" className="btn btn--sm" onClick={() => openEdit(client)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn--sm btn--ghost-danger"
                          onClick={() => setToDelete(client)}
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

        <Paginator
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          pageSize={pagination.pageSize}
          onChange={setPage}
        />
      </section>

      {formOpen ? (
        <Modal
          title={editing ? 'Editar cliente' : 'Novo cliente'}
          description="Os campos marcados com * são obrigatórios."
          onClose={() => setFormOpen(false)}
        >
          <form className="form" onSubmit={submit} noValidate>
            <FormError message={formError} />
            <div className="field">
              <label htmlFor="client-name">Nome *</label>
              <input
                id="client-name"
                name="name"
                type="text"
                ref={firstField}
                value={form.name}
                maxLength={80}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="client-email">E-mail *</label>
              <input
                id="client-email"
                name="email"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
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
                maxLength={120}
                onChange={(event) => setForm({ ...form, company: event.target.value })}
              />
            </div>
            <div className="form__actions">
              <button type="button" className="btn" onClick={() => setFormOpen(false)} disabled={saving}>
                Cancelar
              </button>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar cliente'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {toDelete ? (
        <ConfirmDialog
          title="Excluir cliente"
          message={`Tem certeza de que deseja excluir "${toDelete.name}"? Esta ação não pode ser desfeita.`}
          busy={deleting}
          onCancel={() => setToDelete(null)}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}

      {dealsOf ? (
        <Modal
          title={`Negócios de ${dealsOf.name}`}
          description="Somente os negócios relacionados a este cliente."
          onClose={() => setDealsOf(null)}
        >
          {relatedError ? <ErrorState message={relatedError} /> : null}
          {!relatedError && relatedDeals === null ? <LoadingState label="Carregando negócios…" /> : null}
          {!relatedError && relatedDeals !== null && relatedDeals.length === 0 ? (
            <EmptyState
              title="Nenhum negócio relacionado"
              hint="Este cliente ainda não possui negócios cadastrados."
            />
          ) : null}
          {!relatedError && relatedDeals !== null && relatedDeals.length > 0 ? (
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
                      <td>
                        <span className="cell-strong">{deal.title}</span>
                      </td>
                      <td>
                        <StageBadge label={STAGE_LABELS[deal.stage]} stage={deal.stage} />
                      </td>
                      <td className="num">{formatCurrency(deal.valueInCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <div className="form__actions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                const client = dealsOf;
                setDealsOf(null);
                navigate(`/negocios?clientId=${client.id}`);
              }}
            >
              Abrir na tela de negócios
            </button>
            <button type="button" className="btn btn--primary" onClick={() => setDealsOf(null)}>
              Fechar
            </button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
