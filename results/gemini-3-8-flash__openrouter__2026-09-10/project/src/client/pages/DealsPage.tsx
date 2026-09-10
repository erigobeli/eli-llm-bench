import React, { useEffect, useState, useCallback } from 'react';
import { getDeals, createDeal, updateDeal, deleteDeal, getClients } from '../api.js';
import { Deal, Client, DealStage } from '../../shared/types.js';
import { Modal } from '../components/Modal.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { FeedbackBanner } from '../components/FeedbackBanner.js';
import { formatCurrencyBRL, STAGES, STAGE_LABELS } from '../utils.js';

interface DealsPageProps {
  initialClientId?: number | null;
  onNavigate: (path: string) => void;
}

export const DealsPage: React.FC<DealsPageProps> = ({ initialClientId }) => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('');
  const [clientFilter, setClientFilter] = useState<string>(initialClientId ? initialClientId.toString() : '');
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form Create/Edit state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    valueInReais: '',
    clientId: '',
    stage: 'new' as DealStage,
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirm state
  const [deletingDeal, setDeletingDeal] = useState<Deal | null>(null);

  // Load clients for dropdown filter and creation
  useEffect(() => {
    async function loadAllClients() {
      try {
        const res = await getClients({ pageSize: 50 });
        setClients(res.data);
      } catch {
        // ignore
      }
    }
    loadAllClients();
  }, []);

  const loadDeals = useCallback(
    async (
      targetPage = page,
      searchTerm = search,
      stage = stageFilter,
      selectedClientId = clientFilter
    ) => {
      try {
        setLoading(true);
        const res = await getDeals({
          page: targetPage,
          pageSize: 4, // Exactly 4 records per page
          search: searchTerm,
          stage: stage || undefined,
          clientId: selectedClientId ? parseInt(selectedClientId, 10) : undefined,
        });
        setDeals(res.data);
        setPage(res.pagination.page);
        setTotalPages(res.pagination.totalPages);
        setTotal(res.pagination.total);
      } catch (err: any) {
        setBanner({ type: 'error', message: err.message || 'Erro ao carregar negócios.' });
      } finally {
        setLoading(false);
      }
    },
    [page, search, stageFilter, clientFilter]
  );

  useEffect(() => {
    loadDeals(1, search, stageFilter, clientFilter);
  }, [search, stageFilter, clientFilter]);

  const handlePrevPage = () => {
    if (page > 1) {
      loadDeals(page - 1, search, stageFilter, clientFilter);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      loadDeals(page + 1, search, stageFilter, clientFilter);
    }
  };

  const openCreateModal = () => {
    setEditingDeal(null);
    setFormData({
      title: '',
      valueInReais: '',
      clientId: clientFilter || (clients[0] ? clients[0].id.toString() : ''),
      stage: 'new',
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (deal: Deal) => {
    setEditingDeal(deal);
    setFormData({
      title: deal.title,
      valueInReais: (deal.valueInCents / 100).toFixed(2),
      clientId: deal.clientId.toString(),
      stage: deal.stage,
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedTitle = formData.title.trim();
    if (trimmedTitle.length < 2 || trimmedTitle.length > 120) {
      setFormError('Título deve ter entre 2 e 120 caracteres.');
      return;
    }

    const cleanedVal = formData.valueInReais.replace(',', '.').trim();
    const parsedVal = parseFloat(cleanedVal);
    if (isNaN(parsedVal) || parsedVal < 0) {
      setFormError('Valor deve ser um número maior ou igual a zero.');
      return;
    }
    const valueInCents = Math.round(parsedVal * 100);

    const clientIdNum = parseInt(formData.clientId, 10);
    if (isNaN(clientIdNum) || !clientIdNum) {
      setFormError('Selecione um cliente válido.');
      return;
    }

    try {
      if (editingDeal) {
        await updateDeal(editingDeal.id, {
          title: trimmedTitle,
          valueInCents,
          clientId: clientIdNum,
          stage: formData.stage,
        });
        setBanner({ type: 'success', message: 'Negócio atualizado com sucesso!' });
      } else {
        await createDeal({
          title: trimmedTitle,
          valueInCents,
          clientId: clientIdNum,
          stage: formData.stage,
        });
        setBanner({ type: 'success', message: 'Negócio cadastrado com sucesso!' });
      }
      setIsFormOpen(false);
      loadDeals(editingDeal ? page : 1, search, stageFilter, clientFilter);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar negócio.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingDeal) return;
    try {
      await deleteDeal(deletingDeal.id);
      setBanner({ type: 'success', message: 'Negócio excluído com sucesso!' });
      setDeletingDeal(null);
      const targetPage = deals.length === 1 && page > 1 ? page - 1 : page;
      loadDeals(targetPage, search, stageFilter, clientFilter);
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Erro ao excluir negócio.' });
      setDeletingDeal(null);
    }
  };

  const getClientName = (clientId: number) => {
    const found = clients.find((c) => c.id === clientId);
    return found ? found.name : `Cliente #${clientId}`;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Negócios</h1>
          <p className="page-subtitle">Gerencie suas oportunidades comerciais</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={openCreateModal}
        >
          + Novo Negócio
        </button>
      </div>

      {banner && (
        <FeedbackBanner
          type={banner.type}
          message={banner.message}
          onDismiss={() => setBanner(null)}
        />
      )}

      {/* Filter Bar with Search, Stage and Client */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <input
            type="search"
            name="search"
            className="form-control"
            placeholder="Buscar por título do negócio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar negócios"
          />
        </div>

        <div>
          <select
            name="stageFilter"
            className="form-select"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            aria-label="Filtrar por etapa"
          >
            <option value="">Todas as etapas</option>
            {STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            name="clientFilter"
            className="form-select"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            aria-label="Filtrar por cliente"
          >
            <option value="">Todos os clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {(search || stageFilter || clientFilter) && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              setSearch('');
              setStageFilter('');
              setClientFilter('');
            }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Table Panel */}
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Lista de Negócios ({total})</h2>
        </div>

        {loading ? (
          <div className="state-loading">Carregando negócios...</div>
        ) : deals.length === 0 ? (
          <div className="state-empty">Nenhum negócio encontrado.</div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Título</th>
                  <th>Valor</th>
                  <th>Cliente</th>
                  <th>Etapa</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((d) => (
                  <tr key={d.id} data-testid="deal-row" data-id={d.id}>
                    <td>#{d.id}</td>
                    <td style={{ fontWeight: 600 }}>{d.title}</td>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                      {formatCurrencyBRL(d.valueInCents)}
                    </td>
                    <td>{getClientName(d.clientId)}</td>
                    <td>
                      <span className={`badge badge-${d.stage}`}>
                        {STAGE_LABELS[d.stage]}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => openEditModal(d)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => setDeletingDeal(d)}
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

        {/* Pagination Controls */}
        <div className="pagination-container">
          <div className="pagination-info">
            Página {page} de {totalPages} (Total: {total})
          </div>
          <div className="pagination-controls">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handlePrevPage}
              disabled={page <= 1}
              aria-label="Página anterior"
            >
              Anterior
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleNextPage}
              disabled={page >= totalPages}
              aria-label="Próxima página"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        title={editingDeal ? 'Editar Negócio' : 'Novo Negócio'}
        onClose={() => setIsFormOpen(false)}
      >
        <form onSubmit={handleFormSubmit}>
          {formError && (
            <div className="feedback-banner error" style={{ marginBottom: '14px' }}>
              {formError}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="deal-title" className="form-label">
              Título do Negócio *
            </label>
            <input
              id="deal-title"
              name="title"
              type="text"
              className="form-control"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              minLength={2}
              maxLength={120}
            />
          </div>

          <div className="form-group">
            <label htmlFor="deal-value" className="form-label">
              Valor (R$) *
            </label>
            <input
              id="deal-value"
              name="value"
              type="number"
              step="0.01"
              min="0"
              className="form-control"
              placeholder="0.00"
              value={formData.valueInReais}
              onChange={(e) => setFormData({ ...formData, valueInReais: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="deal-client" className="form-label">
              Cliente *
            </label>
            <select
              id="deal-client"
              name="clientId"
              className="form-select"
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              required
              style={{ width: '100%' }}
            >
              <option value="">Selecione um cliente...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="deal-stage" className="form-label">
              Etapa *
            </label>
            <select
              id="deal-stage"
              name="stage"
              className="form-select"
              value={formData.stage}
              onChange={(e) => setFormData({ ...formData, stage: e.target.value as DealStage })}
              required
              style={{ width: '100%' }}
            >
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-footer" style={{ margin: '20px -18px -18px', padding: '12px 18px' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setIsFormOpen(false)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Salvar
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deletingDeal !== null}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir o negócio "${deletingDeal?.title}"?`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingDeal(null)}
        isDanger={true}
      />
    </div>
  );
};
