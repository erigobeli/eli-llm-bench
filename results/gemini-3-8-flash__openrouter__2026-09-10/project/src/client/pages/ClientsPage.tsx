import React, { useEffect, useState, useCallback } from 'react';
import { getClients, createClient, updateClient, deleteClient, getDeals } from '../api.js';
import { Client, Deal } from '../../shared/types.js';
import { Modal } from '../components/Modal.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { FeedbackBanner } from '../components/FeedbackBanner.js';
import { formatCurrencyBRL, STAGE_LABELS } from '../utils.js';

interface ClientsPageProps {
  onNavigate: (path: string) => void;
}

export const ClientsPage: React.FC<ClientsPageProps> = ({ onNavigate }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal create/edit state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', company: '' });
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirm state
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);

  // View related deals state
  const [viewingDealsClient, setViewingDealsClient] = useState<Client | null>(null);
  const [clientDeals, setClientDeals] = useState<Deal[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);

  const loadClients = useCallback(async (targetPage = page, searchTerm = search) => {
    try {
      setLoading(true);
      const res = await getClients({
        page: targetPage,
        pageSize: 4, // Exactly 4 records per page
        search: searchTerm,
      });
      setClients(res.data);
      setPage(res.pagination.page);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Erro ao carregar clientes.' });
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadClients(1, search);
  }, [search]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handlePrevPage = () => {
    if (page > 1) {
      loadClients(page - 1, search);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      loadClients(page + 1, search);
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingClient(null);
    setFormData({ name: '', email: '', company: '' });
    setFormError(null);
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email,
      company: client.company || '',
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  // Submit Create/Edit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = formData.name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 80) {
      setFormError('Nome deve ter entre 2 e 80 caracteres.');
      return;
    }

    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFormError('Informe um e-mail válido.');
      return;
    }

    try {
      if (editingClient) {
        await updateClient(editingClient.id, {
          name: trimmedName,
          email: trimmedEmail,
          company: formData.company.trim() || null,
        });
        setBanner({ type: 'success', message: 'Cliente atualizado com sucesso!' });
      } else {
        await createClient({
          name: trimmedName,
          email: trimmedEmail,
          company: formData.company.trim() || null,
        });
        setBanner({ type: 'success', message: 'Cliente cadastrado com sucesso!' });
      }
      setIsFormOpen(false);
      loadClients(editingClient ? page : 1, search);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar cliente.');
    }
  };

  // Delete Action
  const handleConfirmDelete = async () => {
    if (!deletingClient) return;
    try {
      await deleteClient(deletingClient.id);
      setBanner({ type: 'success', message: 'Cliente excluído com sucesso!' });
      setDeletingClient(null);
      // Reload current page or prev page if last item
      const targetPage = clients.length === 1 && page > 1 ? page - 1 : page;
      loadClients(targetPage, search);
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Erro ao excluir cliente.' });
      setDeletingClient(null);
    }
  };

  // View Related Deals
  const handleViewDeals = async (client: Client) => {
    setViewingDealsClient(client);
    setLoadingDeals(true);
    try {
      const res = await getDeals({ clientId: client.id, pageSize: 50 });
      setClientDeals(res.data);
    } catch (err: any) {
      setBanner({ type: 'error', message: 'Erro ao carregar negócios do cliente.' });
    } finally {
      setLoadingDeals(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">Gerencie o cadastro de clientes e contatos</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={openCreateModal}
        >
          + Novo Cliente
        </button>
      </div>

      {banner && (
        <FeedbackBanner
          type={banner.type}
          message={banner.message}
          onDismiss={() => setBanner(null)}
        />
      )}

      {/* Filter / Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <input
            type="search"
            name="search"
            className="form-control"
            placeholder="Buscar por nome, e-mail ou empresa..."
            value={search}
            onChange={handleSearchChange}
            aria-label="Buscar clientes"
          />
        </div>
      </div>

      {/* Table Panel */}
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Lista de Clientes ({total})</h2>
        </div>

        {loading ? (
          <div className="state-loading">Carregando clientes...</div>
        ) : clients.length === 0 ? (
          <div className="state-empty">Nenhum cliente encontrado.</div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Empresa</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} data-testid="client-row" data-id={c.id}>
                    <td>#{c.id}</td>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{c.email}</td>
                    <td>{c.company || '-'}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => handleViewDeals(c)}
                        >
                          Ver negócios
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => openEditModal(c)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => setDeletingClient(c)}
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
        title={editingClient ? 'Editar Cliente' : 'Novo Cliente'}
        onClose={() => setIsFormOpen(false)}
      >
        <form onSubmit={handleFormSubmit}>
          {formError && (
            <div className="feedback-banner error" style={{ marginBottom: '14px' }}>
              {formError}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="client-name" className="form-label">
              Nome *
            </label>
            <input
              id="client-name"
              name="name"
              type="text"
              className="form-control"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              minLength={2}
              maxLength={80}
            />
          </div>

          <div className="form-group">
            <label htmlFor="client-email" className="form-label">
              E-mail *
            </label>
            <input
              id="client-email"
              name="email"
              type="email"
              className="form-control"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="client-company" className="form-label">
              Empresa (opcional)
            </label>
            <input
              id="client-company"
              name="company"
              type="text"
              className="form-control"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            />
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
        isOpen={deletingClient !== null}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir o cliente "${deletingClient?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingClient(null)}
        isDanger={true}
      />

      {/* View Related Deals Modal */}
      <Modal
        isOpen={viewingDealsClient !== null}
        title={`Negócios de ${viewingDealsClient?.name}`}
        onClose={() => setViewingDealsClient(null)}
      >
        <div>
          {loadingDeals ? (
            <div className="state-loading">Carregando negócios relacionados...</div>
          ) : clientDeals.length === 0 ? (
            <div className="state-empty">Este cliente não possui negócios cadastrados.</div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Valor</th>
                    <th>Etapa</th>
                  </tr>
                </thead>
                <tbody>
                  {clientDeals.map((d) => (
                    <tr key={d.id} data-testid="deal-row" data-id={d.id}>
                      <td style={{ fontWeight: 600 }}>{d.title}</td>
                      <td>{formatCurrencyBRL(d.valueInCents)}</td>
                      <td>
                        <span className={`badge badge-${d.stage}`}>
                          {STAGE_LABELS[d.stage]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                const clientId = viewingDealsClient?.id;
                setViewingDealsClient(null);
                if (clientId) {
                  onNavigate(`/negocios?clientId=${clientId}`);
                }
              }}
            >
              Filtrar na página de negócios →
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setViewingDealsClient(null)}
            >
              Fechar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
