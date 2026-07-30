import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  createDeal,
  deleteDeal,
  listAllClients,
  listDeals,
  updateDeal,
  type DealPayload,
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
import { centsToReaisInput, formatCurrency, formatDate, reaisToCents } from '../format';
import {
  STAGES,
  STAGE_LABELS,
  type Client,
  type Deal,
  type Pagination as PaginationMeta,
  type Stage,
} from '../types';

const PAGE_SIZE = 4;
const EMPTY_PAGINATION: PaginationMeta = { page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 0 };

interface FormState {
  title: string;
  value: string;
  clientId: string;
  stage: Stage;
}

const EMPTY_FORM: FormState = { title: '', value: '', clientId: '', stage: 'new' };

export function DealsPage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<Stage | ''>('');
  const [clientFilter, setClientFilter] = useState<string>(searchParams.get('clientId') ?? '');
  const [page, setPage] = useState(1);

  const [deals, setDeals] = useState<Deal[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<Deal | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    listAllClients()
      .then(setClients)
      .catch(() => setClients([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listDeals({
        search,
        stage: stageFilter,
        clientId: clientFilter === '' ? '' : Number(clientFilter),
        page,
        pageSize: PAGE_SIZE,
      });
      setDeals(result.data);
      setPagination(result.pagination);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erro desconhecido.');
      setDeals([]);
      setPagination(EMPTY_PAGINATION);
    } finally {
      setLoading(false);
    }
  }, [search, stageFilter, clientFilter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const clientsById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients],
  );
  const clientName = (id: number) => clientsById.get(id)?.name ?? `Cliente #${id}`;

  function changeClientFilter(value: string) {
    setClientFilter(value);
    setPage(1);
    const next = new URLSearchParams(searchParams);
    if (value === '') next.delete('clientId');
    else next.set('clientId', value);
    setSearchParams(next, { replace: true });
  }

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      clientId: clientFilter || (clients[0] ? String(clients[0].id) : ''),
    });
    setFormErrors({});
    setFormOpen(true);
  }

  function openEdit(deal: Deal) {
    setEditing(deal);
    setForm({
      title: deal.title,
      value: centsToReaisInput(deal.valueInCents),
      clientId: String(deal.clientId),
      stage: deal.stage,
    });
    setFormErrors({});
    setFormOpen(true);
  }

  function validate(values: FormState) {
    const errors: Partial<Record<keyof FormState, string>> = {};
    const title = values.title.trim();
    if (title.length < 2 || title.length > 120) {
      errors.title = 'O título deve ter entre 2 e 120 caracteres.';
    }
    const cents = reaisToCents(values.value);
    if (cents === null || cents < 0) {
      errors.value = 'Informe um valor válido, maior ou igual a zero.';
    }
    if (!/^\d+$/.test(values.clientId)) {
      errors.clientId = 'Selecione um cliente.';
    }
    if (!STAGES.includes(values.stage)) {
      errors.stage = 'Selecione uma etapa válida.';
    }
    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validate(form);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload: DealPayload = {
      title: form.title.trim(),
      valueInCents: reaisToCents(form.value) ?? 0,
      clientId: Number(form.clientId),
      stage: form.stage,
    };

    setSaving(true);
    try {
      if (editing) {
        await updateDeal(editing.id, payload);
        toast.success('Negócio atualizado com sucesso.');
      } else {
        await createDeal(payload);
        toast.success('Negócio criado com sucesso.');
        setPage(1);
      }
      setFormOpen(false);
      await load();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Erro desconhecido.';
      setFormErrors({ title: message });
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteDeal(toDelete.id);
      toast.success('Negócio excluído com sucesso.');
      setToDelete(null);
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Erro desconhecido.');
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  async function changeStage(deal: Deal, stage: Stage) {
    try {
      await updateDeal(deal.id, { stage });
      toast.success(`Negócio movido para ${STAGE_LABELS[stage]}.`);
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Erro desconhecido.');
    }
  }

  const showEmpty = !loading && !error && deals.length === 0;
  const filtersActive = search !== '' || stageFilter !== '' || clientFilter !== '';

  return (
    <>
      <PageHead
        eyebrow="Comercial"
        title="Negócios"
        subtitle="Acompanhe oportunidades, valores e etapas de cada negociação."
        actions={
          <button
            type="button"
            className="btn btn--primary"
            onClick={openCreate}
            disabled={clients.length === 0}
            title={clients.length === 0 ? 'Cadastre um cliente antes' : undefined}
          >
            Novo negócio
          </button>
        }
      />

      <section className="card">
        <div className="toolbar">
          <div className="field field--grow">
            <label className="field__label" htmlFor="deal-search">
              Buscar
            </label>
            <input
              id="deal-search"
              name="search"
              type="search"
              className="input"
              placeholder="Título do negócio"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="deal-stage-filter">
              Etapa
            </label>
            <select
              id="deal-stage-filter"
              name="stage"
              className="select"
              value={stageFilter}
              onChange={(event) => {
                setStageFilter(event.target.value as Stage | '');
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
            <label className="field__label" htmlFor="deal-client-filter">
              Cliente
            </label>
            <select
              id="deal-client-filter"
              name="clientId"
              className="select"
              value={clientFilter}
              onChange={(event) => changeClientFilter(event.target.value)}
            >
              <option value="">Todos os clientes</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <span className="field__label" aria-hidden="true">
              &nbsp;
            </span>
            <button
              type="button"
              className="btn"
              disabled={!filtersActive}
              onClick={() => {
                setSearchInput('');
                setSearch('');
                setStageFilter('');
                changeClientFilter('');
                setPage(1);
              }}
            >
              Limpar
            </button>
          </div>
        </div>

        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {loading ? <LoadingState label="Carregando negócios…" /> : null}
        {showEmpty ? (
          <EmptyState
            title="Nenhum negócio encontrado"
            description={
              filtersActive
                ? 'Ajuste a busca ou os filtros para ver mais resultados.'
                : 'Cadastre o primeiro negócio para começar.'
            }
          />
        ) : null}

        {!loading && !error && deals.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">Lista de negócios</caption>
              <thead>
                <tr>
                  <th scope="col">Negócio</th>
                  <th scope="col" className="hide-sm">
                    Cliente
                  </th>
                  <th scope="col">Etapa</th>
                  <th scope="col" className="num">
                    Valor
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
                {deals.map((deal) => (
                  <tr key={deal.id} data-testid="deal-row" data-id={deal.id}>
                    <td>
                      <div className="cell-main">{deal.title}</div>
                      <div className="cell-sub">{clientName(deal.clientId)}</div>
                    </td>
                    <td className="hide-sm">{clientName(deal.clientId)}</td>
                    <td>
                      <StageBadge stage={deal.stage} />
                      <label className="sr-only" htmlFor={`deal-stage-${deal.id}`}>
                        Etapa do negócio {deal.title}
                      </label>
                      <select
                        id={`deal-stage-${deal.id}`}
                        name="stage"
                        className="select"
                        style={{ marginTop: 4, minHeight: 26, fontSize: 12 }}
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
                    <td className="hide-sm">{formatDate(deal.createdAt)}</td>
                    <td className="actions">
                      <button
                        type="button"
                        className="btn btn--sm btn--link"
                        onClick={() => openEdit(deal)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm btn--link"
                        onClick={() => setToDelete(deal)}
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
          title={editing ? `Editar negócio #${editing.id}` : 'Novo negócio'}
          onClose={() => setFormOpen(false)}
          testId="deal-form-modal"
          footer={
            <>
              <button type="button" className="btn" onClick={() => setFormOpen(false)}>
                Cancelar
              </button>
              <button type="submit" form="deal-form" className="btn btn--primary" disabled={saving}>
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </>
          }
        >
          <form id="deal-form" onSubmit={handleSubmit} noValidate>
            <Field label="Título" htmlFor="deal-title" error={formErrors.title}>
              <input
                id="deal-title"
                name="title"
                className="input"
                value={form.title}
                maxLength={160}
                aria-invalid={formErrors.title ? 'true' : undefined}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </Field>
            <div className="form-grid">
              <Field
                label="Valor (R$)"
                htmlFor="deal-value"
                error={formErrors.value}
                hint={
                  reaisToCents(form.value) !== null
                    ? `Equivale a ${formatCurrency(reaisToCents(form.value)!)}`
                    : 'Use ponto ou vírgula para os centavos.'
                }
              >
                <input
                  id="deal-value"
                  name="value"
                  inputMode="decimal"
                  className="input"
                  value={form.value}
                  aria-invalid={formErrors.value ? 'true' : undefined}
                  onChange={(event) => setForm({ ...form, value: event.target.value })}
                />
              </Field>
              <Field label="Etapa" htmlFor="deal-stage" error={formErrors.stage}>
                <select
                  id="deal-stage"
                  name="stage"
                  className="select"
                  value={form.stage}
                  onChange={(event) => setForm({ ...form, stage: event.target.value as Stage })}
                >
                  {STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {STAGE_LABELS[stage]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Cliente" htmlFor="deal-client" error={formErrors.clientId}>
              <select
                id="deal-client"
                name="clientId"
                className="select"
                value={form.clientId}
                onChange={(event) => setForm({ ...form, clientId: event.target.value })}
              >
                <option value="">Selecione um cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </Field>
          </form>
        </Modal>
      ) : null}

      {toDelete ? (
        <ConfirmDialog
          title="Excluir negócio"
          message={`Deseja realmente excluir o negócio “${toDelete.title}”?`}
          busy={deleting}
          onCancel={() => setToDelete(null)}
          onConfirm={() => void handleDelete()}
        />
      ) : null}
    </>
  );
}
