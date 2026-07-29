import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Client } from '../types';

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', company: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  const PAGE_SIZE = 4;

  useEffect(() => {
    loadClients();
  }, [page, search]);

  const loadClients = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getClients(page, PAGE_SIZE, search);
      setClients(data.data);
      setTotalPages(data.pagination.totalPages);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingId(null);
    setFormData({ name: '', email: '', company: '' });
    setShowForm(true);
  };

  const handleEdit = (client: Client) => {
    setEditingId(client.id);
    setFormData({ name: client.name, email: client.email, company: client.company || '' });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');

      if (editingId) {
        await api.updateClient(editingId, formData);
        setSuccess('Cliente atualizado com sucesso');
      } else {
        await api.createClient(formData);
        setSuccess('Cliente criado com sucesso');
        setPage(1);
      }

      setShowForm(false);
      await loadClients();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar cliente');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setError('');
      setSuccess('');
      await api.deleteClient(id);
      setSuccess('Cliente excluído com sucesso');
      setShowDeleteConfirm(null);
      await loadClients();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir cliente');
      setShowDeleteConfirm(null);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Clientes</h1>
        <div className="page-actions">
          <button className="btn-primary" onClick={handleAdd}>+ Novo cliente</button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="filter-group">
        <div className="filter-field search-input">
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou empresa..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit}>
          <h2 style={{ marginBottom: '20px' }}>{editingId ? 'Editar' : 'Novo'} cliente</h2>
          <div className="form-group">
            <label htmlFor="name">Nome *</label>
            <input
              id="name"
              type="text"
              name="name"
              placeholder="Nome do cliente"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">E-mail *</label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="email@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="company">Empresa</label>
            <input
              id="company"
              type="text"
              name="company"
              placeholder="Nome da empresa (opcional)"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">Salvar</button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="loading">Carregando...</div>
      ) : clients.length === 0 ? (
        <div className="empty-state">Nenhum cliente encontrado</div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Empresa</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} data-testid="client-row" data-id={client.id}>
                    <td>{client.name}</td>
                    <td>{client.email}</td>
                    <td>{client.company || '-'}</td>
                    <td>
                      <div className="actions">
                        <button className="btn-secondary btn-small" onClick={() => handleEdit(client)}>Editar</button>
                        <button
                          className="btn-danger btn-small"
                          onClick={() => setShowDeleteConfirm(client.id)}
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
            <p>Tem certeza que deseja excluir este cliente?</p>
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
