import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Deal, Client } from '../types';

export default function Pipeline() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);

  const stages = [
    { id: 'new', label: 'Novo' },
    { id: 'contact', label: 'Em contato' },
    { id: 'proposal', label: 'Proposta' },
    { id: 'won', label: 'Fechado' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load all deals
      let allDeals: Deal[] = [];
      const clientsData = await api.getClients(1, 100);
      setClients(clientsData.data);

      // Load all deals from all pages
      for (let p = 1; ; p++) {
        const dealsData = await api.getDeals(p, 100);
        allDeals = [...allDeals, ...dealsData.data];
        if (p >= dealsData.pagination.totalPages) break;
      }

      setDeals(allDeals);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar pipeline');
    } finally {
      setLoading(false);
    }
  };

  const getClientName = (clientId: number) => {
    const client = clients.find((c) => c.id === clientId);
    return client?.name || 'Desconhecido';
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const getDealsForStage = (stage: string) => {
    return deals.filter((deal) => deal.stage === stage);
  };

  const handleDragStart = (deal: Deal) => {
    setDraggedDeal(deal);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.style.backgroundColor = '#f0f0f0';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.style.backgroundColor = 'transparent';
  };

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.currentTarget.style.backgroundColor = 'transparent';

    if (!draggedDeal) return;

    if (draggedDeal.stage === stageId) {
      setDraggedDeal(null);
      return;
    }

    try {
      setError('');
      setSuccess('');

      await api.updateDeal(draggedDeal.id, { stage: stageId as 'new' | 'contact' | 'proposal' | 'won' });
      setSuccess('Etapa atualizada com sucesso');

      // Update local state
      setDeals((prevDeals) =>
        prevDeals.map((deal) =>
          deal.id === draggedDeal.id ? { ...deal, stage: stageId as 'new' | 'contact' | 'proposal' | 'won' } : deal
        )
      );

      setDraggedDeal(null);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar etapa');
      setDraggedDeal(null);
    }
  };

  const handleStageSelect = async (deal: Deal, newStage: string) => {
    if (deal.stage === newStage) return;

    try {
      setError('');
      setSuccess('');

      await api.updateDeal(deal.id, { stage: newStage as 'new' | 'contact' | 'proposal' | 'won' });
      setSuccess('Etapa atualizada com sucesso');

      setDeals((prevDeals) =>
        prevDeals.map((d) =>
          d.id === deal.id ? { ...d, stage: newStage as 'new' | 'contact' | 'proposal' | 'won' } : d
        )
      );
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar etapa');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Pipeline</h1>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {loading ? (
        <div className="loading">Carregando...</div>
      ) : (
        <div className="pipeline">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className="pipeline-column"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <div className="pipeline-header">{stage.label}</div>
              <div>
                {getDealsForStage(stage.id).map((deal) => (
                  <div
                    key={deal.id}
                    className="deal-card"
                    data-testid="deal-card"
                    data-id={deal.id}
                    draggable
                    onDragStart={() => handleDragStart(deal)}
                  >
                    <div className="deal-title">{deal.title}</div>
                    <div className="deal-value">{formatCurrency(deal.valueInCents)}</div>
                    <div className="deal-client">{getClientName(deal.clientId)}</div>
                    <div style={{ marginTop: '10px' }}>
                      <select
                        value={deal.stage}
                        onChange={(e) => handleStageSelect(deal, e.target.value)}
                        style={{ fontSize: '12px', padding: '4px' }}
                      >
                        <option value="new">Novo</option>
                        <option value="contact">Em contato</option>
                        <option value="proposal">Proposta</option>
                        <option value="won">Fechado</option>
                      </select>
                    </div>
                  </div>
                ))}
                {getDealsForStage(stage.id).length === 0 && (
                  <div style={{ color: '#ccc', textAlign: 'center', padding: '20px', fontSize: '12px' }}>
                    Nenhum negócio
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
