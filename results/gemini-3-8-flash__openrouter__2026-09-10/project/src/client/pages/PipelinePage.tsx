import React, { useEffect, useState, useCallback } from 'react';
import { getDeals, updateDeal, getClients, createDeal } from '../api.js';
import { Deal, Client, DealStage } from '../../shared/types.js';
import { formatCurrencyBRL, STAGES, STAGE_LABELS } from '../utils.js';
import { FeedbackBanner } from '../components/FeedbackBanner.js';
import { Modal } from '../components/Modal.js';

interface PipelinePageProps {
  onNavigate: (path: string) => void;
}

export const PipelinePage: React.FC<PipelinePageProps> = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Drag state
  const [draggedDealId, setDraggedDealId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);

  // Quick Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newDealForm, setNewDealForm] = useState({
    title: '',
    valueInReais: '',
    clientId: '',
    stage: 'new' as DealStage,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [dealsRes, clientsRes] = await Promise.all([
        getDeals({ pageSize: 50 }),
        getClients({ pageSize: 50 }),
      ]);
      setDeals(dealsRes.data);
      setClients(clientsRes.data);
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Erro ao carregar dados do pipeline.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Stage change handler (persists immediately to SQLite)
  const handleMoveStage = async (dealId: number, targetStage: DealStage) => {
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === targetStage) return;

    // Optimistic UI update
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: targetStage } : d))
    );

    try {
      await updateDeal(dealId, { stage: targetStage });
      setBanner({
        type: 'success',
        message: `Negócio "${deal.title}" movido para "${STAGE_LABELS[targetStage]}" com sucesso!`,
      });
    } catch (err: any) {
      // Revert on error
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, stage: deal.stage } : d))
      );
      setBanner({
        type: 'error',
        message: err.message || 'Erro ao persistir mudança de etapa.',
      });
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, dealId: number) => {
    e.dataTransfer.setData('text/plain', dealId.toString());
    e.dataTransfer.effectAllowed = 'move';
    setDraggedDealId(dealId);
  };

  const handleDragEnd = () => {
    setDraggedDealId(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e: React.DragEvent, stage: DealStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stage) {
      setDragOverStage(stage);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStage: DealStage) => {
    e.preventDefault();
    setDragOverStage(null);
    const dataId = e.dataTransfer.getData('text/plain');
    const dealId = dataId ? parseInt(dataId, 10) : draggedDealId;
    if (dealId && !isNaN(dealId)) {
      handleMoveStage(dealId, targetStage);
    }
    setDraggedDealId(null);
  };

  const getClientName = (clientId: number) => {
    const found = clients.find((c) => c.id === clientId);
    return found ? found.name : `Cliente #${clientId}`;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const title = newDealForm.title.trim();
    if (title.length < 2 || title.length > 120) {
      setFormError('Título deve ter entre 2 e 120 caracteres.');
      return;
    }

    const val = parseFloat(newDealForm.valueInReais.replace(',', '.'));
    if (isNaN(val) || val < 0) {
      setFormError('Valor deve ser um número maior ou igual a zero.');
      return;
    }

    const clientId = parseInt(newDealForm.clientId, 10);
    if (isNaN(clientId) || !clientId) {
      setFormError('Selecione um cliente.');
      return;
    }

    try {
      await createDeal({
        title,
        valueInCents: Math.round(val * 100),
        clientId,
        stage: newDealForm.stage,
      });
      setIsCreateOpen(false);
      setNewDealForm({ title: '', valueInReais: '', clientId: '', stage: 'new' });
      setBanner({ type: 'success', message: 'Negócio criado com sucesso no pipeline!' });
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao criar negócio.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pipeline de Negócios</h1>
          <p className="page-subtitle">Acompanhe as oportunidades pelas etapas do funil</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setNewDealForm({
              title: '',
              valueInReais: '',
              clientId: clients[0] ? clients[0].id.toString() : '',
              stage: 'new',
            });
            setFormError(null);
            setIsCreateOpen(true);
          }}
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

      {loading ? (
        <div className="state-loading">Carregando pipeline...</div>
      ) : (
        /* REQ-PIPELINE-RENDER: Colunas exatamente na ordem: Novo, Em contato, Proposta, Fechado */
        <div className="pipeline-board">
          {STAGES.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage === stage.key);
            const stageTotal = stageDeals.reduce((acc, d) => acc + d.valueInCents, 0);
            const isTarget = dragOverStage === stage.key;

            return (
              <div
                key={stage.key}
                className={`pipeline-column ${isTarget ? 'drag-over' : ''}`}
                onDragOver={(e) => handleDragOver(e, stage.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.key)}
              >
                <div className="column-header">
                  <div className="column-header-top">
                    <h3 className="column-title">{stage.label}</h3>
                    <span className="column-badge">{stageDeals.length}</span>
                  </div>
                  <div className="column-total">{formatCurrencyBRL(stageTotal)}</div>
                </div>

                <div className="column-body">
                  {stageDeals.length === 0 ? (
                    <div style={{ padding: '24px 8px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                      Nenhum negócio nesta etapa
                    </div>
                  ) : (
                    stageDeals.map((deal) => {
                      const isDragging = draggedDealId === deal.id;
                      return (
                        <div
                          key={deal.id}
                          className={`deal-card ${isDragging ? 'dragging' : ''}`}
                          data-testid="deal-card"
                          data-id={deal.id}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, deal.id)}
                          onDragEnd={handleDragEnd}
                        >
                          <div className="deal-card-title">{deal.title}</div>
                          <div className="deal-card-client">{getClientName(deal.clientId)}</div>
                          <div className="deal-card-value">{formatCurrencyBRL(deal.valueInCents)}</div>

                          <div className="deal-card-actions">
                            <span style={{ fontSize: '11px', color: '#64748b' }}>Mover etapa:</span>
                            {/* REQ-PIPELINE-PERSISTENCE: Controle alternativo acessível (select) */}
                            <select
                              name="stage"
                              className="stage-select-compact"
                              value={deal.stage}
                              onChange={(e) => handleMoveStage(deal.id, e.target.value as DealStage)}
                              aria-label={`Alterar etapa do negócio ${deal.title}`}
                            >
                              {STAGES.map((s) => (
                                <option key={s.key} value={s.key}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        title="Novo Negócio no Pipeline"
        onClose={() => setIsCreateOpen(false)}
      >
        <form onSubmit={handleCreateSubmit}>
          {formError && (
            <div className="feedback-banner error" style={{ marginBottom: '14px' }}>
              {formError}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="pipeline-deal-title" className="form-label">
              Título *
            </label>
            <input
              id="pipeline-deal-title"
              name="title"
              type="text"
              className="form-control"
              value={newDealForm.title}
              onChange={(e) => setNewDealForm({ ...newDealForm, title: e.target.value })}
              required
              minLength={2}
              maxLength={120}
            />
          </div>

          <div className="form-group">
            <label htmlFor="pipeline-deal-value" className="form-label">
              Valor (R$) *
            </label>
            <input
              id="pipeline-deal-value"
              name="value"
              type="number"
              step="0.01"
              min="0"
              className="form-control"
              placeholder="0.00"
              value={newDealForm.valueInReais}
              onChange={(e) => setNewDealForm({ ...newDealForm, valueInReais: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="pipeline-deal-client" className="form-label">
              Cliente *
            </label>
            <select
              id="pipeline-deal-client"
              name="clientId"
              className="form-select"
              value={newDealForm.clientId}
              onChange={(e) => setNewDealForm({ ...newDealForm, clientId: e.target.value })}
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
            <label htmlFor="pipeline-deal-stage" className="form-label">
              Etapa Inicial *
            </label>
            <select
              id="pipeline-deal-stage"
              name="stage"
              className="form-select"
              value={newDealForm.stage}
              onChange={(e) => setNewDealForm({ ...newDealForm, stage: e.target.value as DealStage })}
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
              onClick={() => setIsCreateOpen(false)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Salvar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
