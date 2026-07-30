import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  api,
  centsFromInput,
  formatCurrency,
  formatDate,
  inputFromCents,
  STAGES,
  STAGE_LABELS,
  type Client,
  type Deal,
  type Pagination,
  type Stage,
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
  title: string;
  value: string;
  clientId: string;
  stage: Stage;
}

const EMPTY_FORM: FormState = { title: '', value: '', clientId: '', stage: 'new' };

export default function DealsPage() {
  const { search: locationSearch } = useRouter();
  const { notify } = useToast();

  const initialClientId = useMemo(() => {
    const value = new URLSearchParams(locationSearch).get('clientId');
    return value && /^\d+$/.test(value) ? value : '';
  }, [locationSearch]);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('');
  const [clientFilter, setClientFilter] = useState<string>(initialClientId);
  const [page, setPage] = useState(1);

  const [deals, setDeals] = useState<Deal[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<Deal | null>(null);
  const [deleting, setDeleting] = useState(false);

  const firstField = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setClientFilter(initialClientId);
    setPage(1);
  }, [initialClientId]);

  const loadClients = useCallback(async () => {
    try {
      const result = await api.listClients({ page: 1, pageSize: 50 });
      setClients(result.data);
    } catch {
      setClients([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.listDeals({
        search,
        stage: stageFilter,
        clientId: clientFilter,
        page,
        pageSize: PAGE_SIZE,
      });
      setDeals(result.data);
      setPagination(result.pagination);
      if (result.data.length === 0 && result.pagination.total > 0 && page > 1) {
        setPage(Math.max(1, result.pagination.totalPages));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }, [search, stageFilter, clientFilter, page]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

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

  const clientName = (id: number) => clients.find((client) => client.id === id)?.name ?? `#${id}`;

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      clientId: clientFilter || (clients[0] ? String(clients[0].id) : ''),
    });
    setFormError(null);
    setFormOpen(true);
    window.setTimeout(() => firstField.current?.focus(), 30);
  };

  const openEdit = (deal: Deal) => {
    setEditing(deal);
    setForm({
      title: deal.title,
      value: inputFromCents(deal.valueInCents),
      clientId: String(deal.clientId),
      stage: deal.stage,
    });
    setFormError(null);
    setFormOpen(true);
    window.setTimeout(() => firstField.current?.focus(), 30);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = form.title.trim();
    if (title.length < 2 || title.length > 120) {
      setFormError('Informe um título com 2 a 120 caracteres.');
      return;
    }
    const valueInCents = centsFromInput(form.value);
    if (valueInCents === null) {
      setFormError('Informe um valor válido, maior ou igual a zero.');
      return;
    }
    if (!/^\d+$/.test(form.clientId)) {
      setFormError('Selecione o cliente responsável pelo negócio.');
      return;
    }

    setSaving(true);
    setFormError(null);
    const payload = {
      title,
      valueInCents,
      clientId: Number(form.clientId),
      stage: form.stage,
    };
    try {
      if (editing) {
        await api.updateDeal(editing.id, payload);
        notify('success', 'Negócio atualizado com sucesso.');
      } else {
        await api.createDeal(payload);
        notify('success', 'Negócio criado com sucesso.');
        setPage(1);
      }
      setFormOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Não foi possível salvar o negócio.');
    } finally {
      setSaving(false);
    }
  };

  const changeStage = async (deal: Deal, stage: Stage) => {
    try {
      await api.updateDeal(deal.id, { stage });
      notify('success', `Etapa alterada para ${STAGE_LABELS[stage]}.`);
      await load();
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Não foi possível alterar a etapa.');
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.deleteDeal(toDelete.id);
      notify('success', `Negócio "${toDelete.title}" excluído.`);
      setToDelete(null);
      await load();
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Não foi possível excluir o negócio.');
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="page">
      <PageHeader
        eyebrow="Comercial"
        title="Negócios"
        subtitle="Acompanhe oportunidades, valores e etapas de negociação."
        actions={
          <button type="button" className="btn btn--primary" onClick={openCreate}>
            Novo negócio
          </button>
        }
      />

      <section className="card">
        <div className="toolbar toolbar--filters">
          <div className="field field--search">
            <label htmlFor="deal-search">Buscar negócios</label>
            <input
              id="deal-search"
              name="search"
              type="search"
              placeholder="Título do negócio"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label htmlFor="deal-stage-filter">Filtrar por etapa</label>
            <select
              id="deal-stage-filter"
              name="stageFilter"
              value={stageFilter}
              onChange={(event) => {
                setStageFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas as etapas</option>
              {STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {STAGE_LABELS[stage]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="deal-client-filter">Filtrar por cliente</label>
            <select
              id="deal-client-filter"
              name="clientIdFilter"
              value={clientFilter}
              onChange={(event) => {
                setClientFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos os clientes</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          <p className="toolbar__meta">
            {pagination.total} {pagination.total === 1 ? 'registro' : 'registros'}
          </p>
        </div>

        {loading ? <LoadingState label="Carregando negócios…" /> : null}
        {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {!loading && !error && deals.length === 0 ? (
          <EmptyState
            title="Nenhum negócio encontrado"
            hint="Ajuste a busca e os filtros ou cadastre um novo negócio."
          />
        ) : null}

        {!loading && !error && deals.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Negócio</th>
                  <th scope="col" className="col-secondary">
                    Cliente
                  </th>
                  <th scope="col">Etapa</th>
                  <th scope="col" className="num">
                    Valor
                  </th>
                  <th scope="col" className="col-secondary">
                    Atualizado
                  </th>
                  <th scope="col" className="col-actions">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => (
                  <tr key={deal.id} data-testid="deal-row" data-id={deal.id}>
                    <td>
                      <span className="cell-strong">{deal.title}</span>
                    </td>
                    <td className="col-secondary">{clientName(deal.clientId)}</td>
                    <td>
                      <label className="sr-only" htmlFor={`deal-stage-${deal.id}`}>
                        Etapa do negócio {deal.title}
                      </label>
                      <select
                        id={`deal-stage-${deal.id}`}
                        name="stage"
                        className="select--inline"
                        value={deal.stage}
                        onChange={(event) => void changeStage(deal, event.target.value as Stage)}
                      >
                        {STAGES.map((stage) => (
                          <option key={stage} value={stage}>
                            {STAGE_LABELS[stage]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="num">{formatCurrency(deal.valueInCents)}</td>
                    <td className="col-secondary">{formatDate(deal.updatedAt)}</td>
                    <td className="col-actions">
                      <div className="row-actions">
                        <button type="button" className="btn btn--sm" onClick={() => openEdit(deal)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn--sm btn--ghost-danger"
                          onClick={() => setToDelete(deal)}
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
          title={editing ? 'Editar negócio' : 'Novo negócio'}
          description="Os campos marcados com * são obrigatórios."
          onClose={() => setFormOpen(false)}
        >
          <form className="form" onSubmit={submit} noValidate>
            <FormError message={formError} />
            <div className="field">
              <label htmlFor="deal-title">Título *</label>
              <input
                id="deal-title"
                name="title"
                type="text"
                ref={firstField}
                value={form.title}
                maxLength={120}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                required
              />
            </div>
            <div className="form__row">
              <div className="field">
                <label htmlFor="deal-value">Valor (R$) *</label>
                <input
                  id="deal-value"
                  name="value"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={form.value}
                  onChange={(event) => setForm({ ...form, value: event.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="deal-stage">Etapa *</label>
                <select
                  id="deal-stage"
                  name="stage"
                  value={form.stage}
                  onChange={(event) => setForm({ ...form, stage: event.target.value as Stage })}
                >
                  {STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {STAGE_LABELS[stage]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="deal-client">Cliente *</label>
              <select
                id="deal-client"
                name="clientId"
                value={form.clientId}
                onChange={(event) => setForm({ ...form, clientId: event.target.value })}
                required
              >
                <option value="">Selecione um cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form__actions">
              <button type="button" className="btn" onClick={() => setFormOpen(false)} disabled={saving}>
                Cancelar
              </button>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar negócio'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {toDelete ? (
        <ConfirmDialog
          title="Excluir negócio"
          message={`Tem certeza de que deseja excluir "${toDelete.title}"? Esta ação não pode ser desfeita.`}
          busy={deleting}
          onCancel={() => setToDelete(null)}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}
    </section>
  );
}
