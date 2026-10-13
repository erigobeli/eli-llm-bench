import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import type { Client, Deal, Stage } from '../shared/types.js';
import { api, fetchAll, STAGE_LABELS, STAGE_ORDER, useResource } from './api.js';
import { ConfirmPanel, ErrorState, LoadingState, Notice, PageHeader, Pagination } from './components.js';
import { formatCurrency } from './format.js';

const PAGE_SIZE = 4;

interface DealFormValues {
  title: string;
  value: string;
  clientId: string;
  stage: Stage;
}

type DealFormErrors = Partial<Record<keyof DealFormValues, string>>;

function validateDeal(values: DealFormValues): DealFormErrors {
  const errors: DealFormErrors = {};
  const title = values.title.trim();
  if (title.length < 2 || title.length > 120) errors.title = 'Informe um título com entre 2 e 120 caracteres.';
  const value = Number(values.value.replace(',', '.'));
  if (values.value.trim() === '' || !Number.isFinite(value) || value < 0) {
    errors.value = 'Informe um valor maior ou igual a zero.';
  }
  if (!values.clientId) errors.clientId = 'Selecione um cliente.';
  if (!STAGE_ORDER.includes(values.stage)) errors.stage = 'Selecione uma etapa válida.';
  return errors;
}

function DealForm({
  deal,
  clients,
  defaultClientId,
  onSaved,
  onCancel,
}: {
  deal: Deal | null;
  clients: Client[];
  defaultClientId: string;
  onSaved: (message: string) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<DealFormValues>({
    title: deal?.title ?? '',
    value: deal ? String(deal.valueInCents / 100) : '',
    clientId: deal ? String(deal.clientId) : defaultClientId,
    stage: deal?.stage ?? 'new',
  });
  const [errors, setErrors] = useState<DealFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update =
    (field: keyof DealFormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues((prev) => ({ ...prev, [field]: event.target.value }));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);
    const validation = validateDeal(values);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    const payload = {
      title: values.title.trim(),
      valueInCents: Math.round(Number(values.value.replace(',', '.')) * 100),
      clientId: Number(values.clientId),
      stage: values.stage,
    };
    setSaving(true);
    try {
      if (deal) {
        await api.updateDeal(deal.id, payload);
        onSaved('Negócio atualizado com sucesso.');
      } else {
        await api.createDeal(payload);
        onSaved('Negócio criado com sucesso.');
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Não foi possível salvar o negócio.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel form-panel" aria-labelledby="deal-form-title">
      <h2 id="deal-form-title">{deal ? 'Editar negócio' : 'Novo negócio'}</h2>
      {serverError && <Notice kind="error">{serverError}</Notice>}
      {clients.length === 0 && (
        <Notice kind="info">Cadastre um cliente antes de criar um negócio.</Notice>
      )}
      <form onSubmit={handleSubmit} noValidate className="form-grid">
        <div className="field">
          <label htmlFor="deal-title">Título</label>
          <input
            id="deal-title"
            name="title"
            type="text"
            value={values.title}
            onChange={update('title')}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'deal-title-error' : undefined}
            autoComplete="off"
          />
          {errors.title && (
            <span id="deal-title-error" className="field-error">
              {errors.title}
            </span>
          )}
        </div>
        <div className="field">
          <label htmlFor="deal-value">Valor (R$)</label>
          <input
            id="deal-value"
            name="value"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={values.value}
            onChange={update('value')}
            aria-invalid={Boolean(errors.value)}
            aria-describedby={errors.value ? 'deal-value-error' : undefined}
          />
          {errors.value && (
            <span id="deal-value-error" className="field-error">
              {errors.value}
            </span>
          )}
        </div>
        <div className="field">
          <label htmlFor="deal-client">Cliente</label>
          <select
            id="deal-client"
            name="clientId"
            value={values.clientId}
            onChange={update('clientId')}
            aria-invalid={Boolean(errors.clientId)}
            aria-describedby={errors.clientId ? 'deal-client-error' : undefined}
          >
            <option value="">Selecione um cliente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          {errors.clientId && (
            <span id="deal-client-error" className="field-error">
              {errors.clientId}
            </span>
          )}
        </div>
        <div className="field">
          <label htmlFor="deal-stage">Etapa</label>
          <select id="deal-stage" name="stage" value={values.stage} onChange={update('stage')}>
            {STAGE_ORDER.map((stage) => (
              <option key={stage} value={stage}>
                {STAGE_LABELS[stage]}
              </option>
            ))}
          </select>
        </div>
        <div className="form-actions">
          <button type="button" className="button button-secondary" onClick={onCancel} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="button button-primary" disabled={saving || clients.length === 0}>
            {saving ? 'Salvando...' : 'Salvar negócio'}
          </button>
        </div>
      </form>
    </section>
  );
}

export function DealsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const clientIdFilter = searchParams.get('clientId') ?? '';

  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [page, setPage] = useState(1);
  const [formTarget, setFormTarget] = useState<Deal | 'new' | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Deal | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const clientOptions = useResource(() => fetchAll(api.listClients), []);

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (search.trim()) params.set('search', search.trim());
  if (stageFilter) params.set('stage', stageFilter);
  if (clientIdFilter) params.set('clientId', clientIdFilter);
  const query = params.toString();

  const deals = useResource(() => api.listDeals(new URLSearchParams(query)), [query]);

  useEffect(() => {
    const totalPages = deals.data?.pagination.totalPages ?? 0;
    if (totalPages > 0 && page > totalPages) setPage(totalPages);
  }, [deals.data, page]);

  const clients = useMemo(() => clientOptions.data ?? [], [clientOptions.data]);
  const filteredClient = clients.find((client) => String(client.id) === clientIdFilter);

  function updateClientFilter(value: string) {
    setPage(1);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set('clientId', value);
      else next.delete('clientId');
      return next;
    });
  }

  function handleSaved(message: string) {
    setFormTarget(null);
    setNotice({ kind: 'success', text: message });
    deals.reload();
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.deleteDeal(pendingDelete.id);
      setNotice({ kind: 'success', text: `Negócio "${pendingDelete.title}" excluído.` });
      setPendingDelete(null);
      deals.reload();
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Não foi possível excluir o negócio.' });
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Negócios"
        description="Oportunidades comerciais por cliente e etapa."
        actions={
          <button
            type="button"
            className="button button-primary"
            onClick={() => {
              setNotice(null);
              setFormTarget('new');
            }}
          >
            Novo negócio
          </button>
        }
      />

      {notice && <Notice kind={notice.kind} onClose={() => setNotice(null)}>{notice.text}</Notice>}

      {formTarget && (
        <DealForm
          key={formTarget === 'new' ? `new-${clientIdFilter}` : formTarget.id}
          deal={formTarget === 'new' ? null : formTarget}
          clients={clients}
          defaultClientId={clientIdFilter}
          onSaved={handleSaved}
          onCancel={() => setFormTarget(null)}
        />
      )}

      {pendingDelete && (
        <ConfirmPanel
          title="Excluir negócio"
          message={`Excluir o negócio "${pendingDelete.title}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir negócio"
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      <section className="panel">
        <div className="toolbar toolbar-wrap">
          <div className="field field-search">
            <label htmlFor="deal-search">Buscar</label>
            <input
              id="deal-search"
              name="search"
              type="search"
              placeholder="Título do negócio"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="deal-stage-filter">Etapa</label>
            <select
              id="deal-stage-filter"
              name="stage"
              value={stageFilter}
              onChange={(event) => {
                setStageFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas as etapas</option>
              {STAGE_ORDER.map((stage) => (
                <option key={stage} value={stage}>
                  {STAGE_LABELS[stage]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="deal-client-filter">Cliente</label>
            <select
              id="deal-client-filter"
              name="clientId"
              value={clientIdFilter}
              onChange={(event) => updateClientFilter(event.target.value)}
            >
              <option value="">Todos os clientes</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {clientIdFilter && (
          <div className="filter-chip-row">
            <span className="filter-chip">
              Cliente: {filteredClient?.name ?? `#${clientIdFilter}`}
              <button type="button" className="link-button" onClick={() => updateClientFilter('')}>
                Limpar filtro
              </button>
            </span>
          </div>
        )}

        {deals.status === 'loading' && !deals.data && <LoadingState label="Carregando negócios..." />}
        {deals.status === 'error' && (
          <ErrorState message={`Não foi possível carregar os negócios: ${deals.error}`} onRetry={deals.reload} />
        )}

        {deals.data && (
          <>
            {deals.data.data.length === 0 ? (
              <p className="state empty-state">
                {search.trim() || stageFilter || clientIdFilter
                  ? 'Nenhum negócio encontrado com os filtros atuais.'
                  : 'Nenhum negócio cadastrado. Use "Novo negócio" para começar.'}
              </p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Título</th>
                      <th scope="col">Cliente</th>
                      <th scope="col">Valor</th>
                      <th scope="col">Etapa</th>
                      <th scope="col">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deals.data.data.map((deal) => (
                      <tr key={deal.id} data-testid="deal-row" data-id={deal.id}>
                        <td data-label="Título">
                          <span className="cell-strong">{deal.title}</span>
                        </td>
                        <td data-label="Cliente">{deal.clientName}</td>
                        <td data-label="Valor" className="num">
                          {formatCurrency(deal.valueInCents)}
                        </td>
                        <td data-label="Etapa">
                          <span className={`stage-badge stage-${deal.stage}`}>{STAGE_LABELS[deal.stage]}</span>
                        </td>
                        <td data-label="Ações">
                          <div className="row-actions">
                            <button
                              type="button"
                              className="link-button"
                              onClick={() => {
                                setNotice(null);
                                setFormTarget(deal);
                              }}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="link-button link-danger"
                              onClick={() => setPendingDelete(deal)}
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
              page={deals.data.pagination.page}
              totalPages={deals.data.pagination.totalPages}
              total={deals.data.pagination.total}
              onChange={setPage}
            />
          </>
        )}
      </section>
    </>
  );
}
