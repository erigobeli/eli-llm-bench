import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  createDeal,
  deleteDeal,
  fetchAllClients,
  fetchDeals,
  updateDeal,
} from '../api';
import {
  formatCurrency,
  formatDate,
  PIPELINE_STAGES,
  STAGE_LABELS,
  type Client,
  type Deal,
  type DealStage,
  type PaginationMeta,
} from '../types';

const PAGE_SIZE = 4;

export function DealsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialClientParam = searchParams.get('clientId') || '';

  const titleInputRef = useRef<HTMLInputElement | null>(null);

  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [clientIdFilter, setClientIdFilter] = useState(initialClientParam);
  const [loading, setLoading] = useState(true);

  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formValueInCents, setFormValueInCents] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [formStage, setFormStage] = useState<DealStage>('new');
  const [submitting, setSubmitting] = useState(false);

  const [confirmingDelete, setConfirmingDelete] = useState<Deal | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const paramClient = searchParams.get('clientId') || '';
    if (paramClient !== clientIdFilter) {
      setClientIdFilter(paramClient);
      setPage(1);
    }
  }, [searchParams, clientIdFilter]);

  useEffect(() => {
    let active = true;
    fetchAllClients()
      .then((list) => {
        if (!active) return;
        setClients(list);
      })
      .catch(() => {
        // Handled in main load
      });
    return () => {
      active = false;
    };
  }, []);

  const loadDeals = useCallback(
    async (
      targetPage: number,
      targetSearch: string,
      targetStage: string,
      targetClientId: string
    ) => {
      setLoading(true);
      try {
        const response = await fetchDeals({
          page: targetPage,
          pageSize: PAGE_SIZE,
          search: targetSearch,
          stage: targetStage,
          clientId: targetClientId,
        });

        if (response.data.length === 0 && targetPage > 1 && response.pagination.total > 0) {
          const fallbackPage = Math.max(1, response.pagination.totalPages);
          setPage(fallbackPage);
          return;
        }

        setDeals(response.data);
        setPagination(response.pagination);
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Erro ao carregar negócios.'
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadDeals(page, search, stageFilter, clientIdFilter);
  }, [page, search, stageFilter, clientIdFilter, loadDeals]);

  function resetForm() {
    setEditingDeal(null);
    setFormTitle('');
    setFormValueInCents('');
    setFormClientId(clientIdFilter || (clients[0] ? String(clients[0].id) : ''));
    setFormStage('new');
  }

  function handleStartCreate() {
    resetForm();
    setErrorMessage(null);
    titleInputRef.current?.focus();
  }

  function handleStartEdit(deal: Deal) {
    setEditingDeal(deal);
    setFormTitle(deal.title);
    setFormValueInCents(String(deal.valueInCents));
    setFormClientId(String(deal.clientId));
    setFormStage(deal.stage);
    setErrorMessage(null);
    setSuccessMessage(null);
    titleInputRef.current?.focus();
  }

  function handleClientFilterChange(nextClientId: string) {
    setClientIdFilter(nextClientId);
    setPage(1);
    const nextParams = new URLSearchParams(searchParams);
    if (nextClientId) {
      nextParams.set('clientId', nextClientId);
    } else {
      nextParams.delete('clientId');
    }
    setSearchParams(nextParams, { replace: true });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedTitle = formTitle.trim();
    if (trimmedTitle.length < 2 || trimmedTitle.length > 120) {
      setErrorMessage('O título do negócio deve ter entre 2 e 120 caracteres.');
      return;
    }

    const rawVal = formValueInCents.trim();
    if (rawVal === '') {
      setErrorMessage('Informe o valor do negócio em centavos.');
      return;
    }
    const parsedValue = Number(rawVal);
    if (!Number.isInteger(parsedValue) || parsedValue < 0) {
      setErrorMessage(
        'O valor do negócio deve ser um número inteiro maior ou igual a zero.'
      );
      return;
    }

    const parsedClientId = Number.parseInt(formClientId, 10);
    if (!Number.isInteger(parsedClientId) || parsedClientId < 1) {
      setErrorMessage('Selecione um cliente válido para o negócio.');
      return;
    }

    if (!PIPELINE_STAGES.some((s) => s.stage === formStage)) {
      setErrorMessage('Selecione uma etapa válida.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingDeal) {
        await updateDeal(editingDeal.id, {
          title: trimmedTitle,
          valueInCents: parsedValue,
          clientId: parsedClientId,
          stage: formStage,
        });
        setSuccessMessage('Negócio atualizado com sucesso.');
        resetForm();
        await loadDeals(page, search, stageFilter, clientIdFilter);
      } else {
        await createDeal({
          title: trimmedTitle,
          valueInCents: parsedValue,
          clientId: parsedClientId,
          stage: formStage,
        });
        setSuccessMessage('Negócio cadastrado com sucesso.');
        resetForm();
        if (page !== 1) {
          setPage(1);
        } else {
          await loadDeals(1, search, stageFilter, clientIdFilter);
        }
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao salvar negócio.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!confirmingDelete) return;
    setDeleting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await deleteDeal(confirmingDelete.id);
      if (editingDeal?.id === confirmingDelete.id) {
        resetForm();
      }
      setConfirmingDelete(null);
      setSuccessMessage('Negócio excluído com sucesso.');
      await loadDeals(page, search, stageFilter, clientIdFilter);
    } catch (err) {
      setConfirmingDelete(null);
      setErrorMessage(
        err instanceof Error ? err.message : 'Não foi possível excluir o negócio.'
      );
    } finally {
      setDeleting(false);
    }
  }

  const clientMap = new Map(clients.map((c) => [c.id, c.name]));
  const totalPagesDisplay = Math.max(1, pagination.totalPages);
  const previewNumber = Number(formValueInCents);
  const showPreview =
    formValueInCents.trim() !== '' &&
    Number.isInteger(previewNumber) &&
    previewNumber >= 0;

  return (
    <div>
      <header className="page-header">
        <div className="page-header-titles">
          <p className="page-eyebrow">Oportunidades comerciais</p>
          <h1 className="page-title">Negócios</h1>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-primary" onClick={handleStartCreate}>
            Novo negócio
          </button>
        </div>
      </header>

      {errorMessage && (
        <div role="alert" className="alert alert-error">
          <span>{errorMessage}</span>
          <button
            type="button"
            className="alert-close"
            onClick={() => setErrorMessage(null)}
          >
            Fechar
          </button>
        </div>
      )}

      {successMessage && (
        <div role="status" className="alert alert-success">
          <span>{successMessage}</span>
          <button
            type="button"
            className="alert-close"
            onClick={() => setSuccessMessage(null)}
          >
            Fechar
          </button>
        </div>
      )}

      {clientIdFilter && (
        <div className="alert alert-info">
          <span>
            Exibindo negócios relacionados a:{' '}
            <strong>
              {clientMap.get(Number(clientIdFilter)) || `Cliente #${clientIdFilter}`}
            </strong>
          </span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => handleClientFilterChange('')}
          >
            Limpar filtro de cliente
          </button>
        </div>
      )}

      <div className="workspace-grid">
        <section className="panel" aria-label="Formulário de negócio">
          <div className="panel-header">
            <h2 className="panel-title">
              {editingDeal ? `Editar negócio #${editingDeal.id}` : 'Novo negócio'}
            </h2>
          </div>
          <div className="panel-body">
            <form className="form-stack" onSubmit={handleSubmit} noValidate>
              <div className="form-field">
                <label className="form-label" htmlFor="deal-title">
                  Título
                </label>
                <input
                  ref={titleInputRef}
                  id="deal-title"
                  name="title"
                  type="text"
                  className="form-input"
                  placeholder="Título da oportunidade"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="deal-value">
                  Valor (em centavos)
                </label>
                <input
                  id="deal-value"
                  name="valueInCents"
                  type="number"
                  step="1"
                  className="form-input"
                  placeholder="Ex: 150000"
                  value={formValueInCents}
                  onChange={(e) => setFormValueInCents(e.target.value)}
                />
                {showPreview && (
                  <span className="form-hint">
                    Equivale a {formatCurrency(previewNumber)}
                  </span>
                )}
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="deal-client">
                  Cliente
                </label>
                <select
                  id="deal-client"
                  name="clientId"
                  className="form-select"
                  value={formClientId}
                  onChange={(e) => setFormClientId(e.target.value)}
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="deal-stage">
                  Etapa
                </label>
                <select
                  id="deal-stage"
                  name="stage"
                  className="form-select"
                  value={formStage}
                  onChange={(e) => setFormStage(e.target.value as DealStage)}
                >
                  {PIPELINE_STAGES.map((st) => (
                    <option key={st.stage} value={st.stage}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {editingDeal ? 'Salvar alterações' : 'Salvar negócio'}
                </button>
                {editingDeal && (
                  <button
                    type="button"
                    className="btn"
                    onClick={resetForm}
                    disabled={submitting}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        </section>

        <section className="panel" aria-label="Listagem de negócios">
          <div className="panel-header">
            <h2 className="panel-title">Registros de negócios</h2>
            <span className="pagination-info">{pagination.total} no total</span>
          </div>

          <div className="filter-bar">
            <div className="form-field">
              <label className="form-label" htmlFor="deal-search">
                Buscar
              </label>
              <input
                id="deal-search"
                name="search"
                type="search"
                className="form-input"
                placeholder="Buscar por título..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="deal-stage-filter">
                Filtrar por etapa
              </label>
              <select
                id="deal-stage-filter"
                name="stageFilter"
                className="form-select"
                value={stageFilter}
                onChange={(e) => {
                  setStageFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todas as etapas</option>
                {PIPELINE_STAGES.map((st) => (
                  <option key={st.stage} value={st.stage}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="deal-client-filter">
                Filtrar por cliente
              </label>
              <select
                id="deal-client-filter"
                name="clientFilter"
                className="form-select"
                value={clientIdFilter}
                onChange={(e) => handleClientFilterChange(e.target.value)}
              >
                <option value="">Todos os clientes</option>
                {clients.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="state-box">Carregando negócios...</div>
          ) : deals.length === 0 ? (
            <div className="state-box">Nenhum negócio encontrado.</div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Cliente</th>
                    <th>Etapa</th>
                    <th>Valor</th>
                    <th>Atualizado em</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {deals.map((deal) => (
                    <tr
                      key={deal.id}
                      data-testid="deal-row"
                      data-id={deal.id}
                    >
                      <td className="cell-primary">{deal.title}</td>
                      <td>
                        {clientMap.get(deal.clientId) || `Cliente #${deal.clientId}`}
                      </td>
                      <td>
                        <span className={`stage-badge stage-${deal.stage}`}>
                          {STAGE_LABELS[deal.stage]}
                        </span>
                      </td>
                      <td className="cell-primary">
                        {formatCurrency(deal.valueInCents)}
                      </td>
                      <td className="cell-secondary">{formatDate(deal.updatedAt)}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => handleStartEdit(deal)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger-outline"
                            onClick={() => {
                              setErrorMessage(null);
                              setSuccessMessage(null);
                              setConfirmingDelete(deal);
                            }}
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

          <div className="pagination-bar">
            <span className="pagination-info">
              Página {page} de {totalPagesDisplay}
            </span>
            <div className="pagination-controls">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Anterior
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= pagination.totalPages}
              >
                Próxima
              </button>
            </div>
          </div>
        </section>
      </div>

      {confirmingDelete && (
        <div className="modal-backdrop">
          <div
            className="modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-deal-title"
          >
            <div className="modal-header">
              <h3 id="confirm-delete-deal-title" className="modal-title">
                Confirmar exclusão
              </h3>
            </div>
            <div className="modal-body">
              Tem certeza que deseja excluir o negócio{' '}
              <strong>{confirmingDelete.title}</strong>? Esta ação não pode ser desfeita.
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn"
                onClick={() => setConfirmingDelete(null)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
