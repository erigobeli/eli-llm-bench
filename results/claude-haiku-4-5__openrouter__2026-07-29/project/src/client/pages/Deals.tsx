import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Deal, Client } from '../types';

export default function Deals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [clientId, setClientId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ title: '', valueInCents: '', clientId: '', stage: 'new' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  const PAGE_SIZE = 4;

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    loadDeals();
  }, [page, search, stage, clientId]);

  const loadClients = async () => {
    try {
      const data = await api.getClients(1, 100);
      setClients(data.data);
    } catch (err) {
      console.error('Erro ao carregar clientes', err);
    }
  };

  const loadDeals = async () => {
    try {
      setLoading(true);
      setError('');
      const filters: any = {};
      if (search) filters.search = search;
      if (stage) filters.stage = stage;
      if (clientId) filters.clientId = parseInt(clientId);

      const data = await api.getDeals(page, PAGE_SIZE, filters);
      setDeals(data.data);
      setTotalPages(data.pagination.totalPages);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar negócios');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingId(null);
    setFormData({ title: '', valueInCents: '', clientId: '', stage: 'new' });
    setShowForm(true);
  };

  const handleEdit = (deal: Deal) => {
    setEditingId(deal.id);
    setFormData({
      title: deal.title,
      valueInCents: deal.valueInCents.toString(),
      clientId: deal.clientId.toString(),
      stage: deal.stage
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');

      const data = {
        title: formData.title,
        valueInCents: parseInt(formData.valueInCents) || 0,
        clientId: parseInt(formData.clientId),
        stage: formData.stage as 'new' | 'contact' | 'proposal' | 'won'
      };

      if (editingId) {
        await api.updateDeal(editingId, data);
        setSuccess('Negócio atualizado com sucesso');
      } else {
        await api.createDeal(data);
        setSuccess('Negócio criado com sucesso');
        setPage(1);
      }

      setShowForm(false);
      await loadDeals();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar negócio');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setError('');
      setSuccess('');
      await api.deleteDeal(id);
      setSuccess('Negócio excluído com sucesso');
      setShowDeleteConfirm(null);
      await loadDeals();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir negócio');
      setShowDeleteConfirm(null);
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

  const stageName = (s: string) => {
    const stages: { [key: string]: string } = {
      'new': 'Novo',
      'contact': 'Em contato',
      'proposal': 'Proposta',
      'won': 'Fechado'
    };
    return stages[s] || s;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Negócios</h1>
        <div className="page-actions">
          <button className="btn-primary" onClick={handleAdd}>+ Novo negócio</button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="filter-group">
        <div className="filter-field search-input">
          <input
            type="text"
            placeholder="Buscar por título..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="filter-field">
          <select value={stage} onChange={(e) => {
            setStage(e.target.value);
            setPage(1);
          }}>
            <option value="">Todas as etapas</option>
            <option value="new">Novo</option>
            <option value="contact">Em contato</option>
            <option value="proposal">Proposta</option>
            <option value="won">Fechado</option>
          </select>
        </div>
        <div className="filter-field">
          <select value={clientId} onChange={(e) => {
            setClientId(e.target.value);
            setPage(1);
          }}>
            <option value="">Todos os clientes</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit}>
          <h2 style={{ marginBottom: '20px' }}>{editingId ? 'Editar' : 'Novo'} negócio</h2>
          <div className="form-group">
            <label htmlFor="title">Título *</label>
            <input
              id="title"
              type="text"
              name="title"
              placeholder="Título do negócio"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="valueInCents">Valor (centavos) *</label>
            <input
              id="valueInCents"
              type="number"
              name="valueInCents"
              placeholder="0"
              value={formData.valueInCents}
              onChange={(e) => setFormData({ ...formData, valueInCents: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="clientId">Cliente *</label>
            <select
              id="clientId"
              name="clientId"
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              required
            >
              <option value="">Selecione um cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="stage">Etapa *</label>
            <select
              id="stage"
              name="stage"
              value={formData.stage}
              onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
              required
            >
              <option value="new">Novo</option>
              <option value="contact">Em contato</option>
              <option value="proposal">Proposta</option>
              <option value="won">Fechado</option>
            </select>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">Salvar</button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="loading">Carregando...</div>
      ) : deals.length === 0 ? (
        <div className="empty-state">Nenhum negócio encontrado</div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Cliente</th>
                  <th>Valor</th>
                  <th>Etapa</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => (
                  <tr key={deal.id} data-testid="deal-row" data-id={deal.id}>
                    <td>{deal.title}</td>
                    <td>{getClientName(deal.clientId)}</td>
                    <td>{formatCurrency(deal.valueInCents)}</td>
                    <td>{stageName(deal.stage)}</td>
                    <td>
                      <div className="actions">
                        <button className="btn-secondary btn-small" onClick={() => handleEdit(deal)}>Editar</button>
                        <button
                          className="btn-danger btn-small"
                          onClick={() => setShowDeleteConfirm(deal.id)}
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

          <div className="pagination">
            <button
              className="btn-secondary"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              aria-label="Anterior"
            >
              Anterior
            </button>
            <span className="pagination-info">Página {page} de {totalPages}</span>
            <button
              className="btn-secondary"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              aria-label="Próxima"
            >
              Próxima
            </button>
          </div>
        </>
      )}

      {showDeleteConfirm !== null && (
        <div className="modal open">
          <div className="modal-content">
            <h2 className="modal-title">Confirmar exclusão</h2>
            <p>Tem certeza que deseja excluir este negócio?</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowDeleteConfirm(null)}>Cancelar</button>
              <button className="btn-danger" onClick={() => handleDelete(showDeleteConfirm)}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
