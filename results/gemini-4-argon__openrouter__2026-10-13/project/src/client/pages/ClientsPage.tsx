import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createClient,
  deleteClient,
  fetchClients,
  updateClient,
} from '../api';
import { formatDate, type Client, type PaginationMeta } from '../types';

const PAGE_SIZE = 4;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ClientsPage() {
  const navigate = useNavigate();
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [confirmingDelete, setConfirmingDelete] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadClients = useCallback(async (targetPage: number, targetSearch: string) => {
    setLoading(true);
    try {
      const response = await fetchClients({
        page: targetPage,
        pageSize: PAGE_SIZE,
        search: targetSearch,
      });

      if (response.data.length === 0 && targetPage > 1 && response.pagination.total > 0) {
        const fallbackPage = Math.max(1, response.pagination.totalPages);
        setPage(fallbackPage);
        return;
      }

      setClients(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Erro ao carregar lista de clientes.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients(page, search);
  }, [page, search, loadClients]);

  function resetForm() {
    setEditingClient(null);
    setFormName('');
    setFormEmail('');
    setFormCompany('');
  }

  function handleStartCreate() {
    resetForm();
    setErrorMessage(null);
    nameInputRef.current?.focus();
  }

  function handleStartEdit(client: Client) {
    setEditingClient(client);
    setFormName(client.name);
    setFormEmail(client.email);
    setFormCompany(client.company ?? '');
    setErrorMessage(null);
    setSuccessMessage(null);
    nameInputRef.current?.focus();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedName = formName.trim();
    const trimmedEmail = formEmail.trim();
    const trimmedCompany = formCompany.trim();

    if (trimmedName.length < 2 || trimmedName.length > 80) {
      setErrorMessage('O nome do cliente deve ter entre 2 e 80 caracteres.');
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setErrorMessage('Informe um endereço de e-mail válido.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingClient) {
        await updateClient(editingClient.id, {
          name: trimmedName,
          email: trimmedEmail,
          company: trimmedCompany.length > 0 ? trimmedCompany : null,
        });
        setSuccessMessage('Cliente atualizado com sucesso.');
        resetForm();
        await loadClients(page, search);
      } else {
        await createClient({
          name: trimmedName,
          email: trimmedEmail,
          company: trimmedCompany.length > 0 ? trimmedCompany : null,
        });
        setSuccessMessage('Cliente cadastrado com sucesso.');
        resetForm();
        if (page !== 1) {
          setPage(1);
        } else {
          await loadClients(1, search);
        }
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao salvar cliente.');
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
      await deleteClient(confirmingDelete.id);
      if (editingClient?.id === confirmingDelete.id) {
        resetForm();
      }
      setConfirmingDelete(null);
      setSuccessMessage('Cliente excluído com sucesso.');
      await loadClients(page, search);
    } catch (err) {
      setConfirmingDelete(null);
      setErrorMessage(
        err instanceof Error ? err.message : 'Não foi possível excluir o cliente.'
      );
    } finally {
      setDeleting(false);
    }
  }

  const totalPagesDisplay = Math.max(1, pagination.totalPages);

  return (
    <div>
      <header className="page-header">
        <div className="page-header-titles">
          <p className="page-eyebrow">Cadastro comercial</p>
          <h1 className="page-title">Clientes</h1>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-primary" onClick={handleStartCreate}>
            Novo cliente
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

      <div className="workspace-grid">
        <section className="panel" aria-label="Formulário de cliente">
          <div className="panel-header">
            <h2 className="panel-title">
              {editingClient ? `Editar cliente #${editingClient.id}` : 'Novo cliente'}
            </h2>
          </div>
          <div className="panel-body">
            <form className="form-stack" onSubmit={handleSubmit} noValidate>
              <div className="form-field">
                <label className="form-label" htmlFor="client-name">
                  Nome
                </label>
                <input
                  ref={nameInputRef}
                  id="client-name"
                  name="name"
                  type="text"
                  className="form-input"
                  placeholder="Nome completo ou razão social"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="client-email">
                  E-mail
                </label>
                <input
                  id="client-email"
                  name="email"
                  type="email"
                  className="form-input"
                  placeholder="contato@empresa.com.br"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="client-company">
                  Empresa
                </label>
                <input
                  id="client-company"
                  name="company"
                  type="text"
                  className="form-input"
                  placeholder="Opcional"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {editingClient ? 'Salvar alterações' : 'Salvar cliente'}
                </button>
                {editingClient && (
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

        <section className="panel" aria-label="Listagem de clientes">
          <div className="panel-header">
            <h2 className="panel-title">Registros de clientes</h2>
            <span className="pagination-info">{pagination.total} no total</span>
          </div>

          <div className="filter-bar">
            <div className="form-field">
              <label className="form-label" htmlFor="client-search">
                Buscar
              </label>
              <input
                id="client-search"
                name="search"
                type="search"
                className="form-input"
                placeholder="Filtrar por nome, e-mail ou empresa..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          {loading ? (
            <div className="state-box">Carregando clientes...</div>
          ) : clients.length === 0 ? (
            <div className="state-box">Nenhum cliente encontrado.</div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Empresa</th>
                    <th>Atualizado em</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr
                      key={client.id}
                      data-testid="client-row"
                      data-id={client.id}
                    >
                      <td className="cell-primary">{client.name}</td>
                      <td>{client.email}</td>
                      <td>{client.company || '—'}</td>
                      <td className="cell-secondary">{formatDate(client.updatedAt)}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => navigate(`/negocios?clientId=${client.id}`)}
                          >
                            Ver negócios
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => handleStartEdit(client)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger-outline"
                            onClick={() => {
                              setErrorMessage(null);
                              setSuccessMessage(null);
                              setConfirmingDelete(client);
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
            aria-labelledby="confirm-delete-client-title"
          >
            <div className="modal-header">
              <h3 id="confirm-delete-client-title" className="modal-title">
                Confirmar exclusão
              </h3>
            </div>
            <div className="modal-body">
              Tem certeza que deseja excluir o cliente{' '}
              <strong>{confirmingDelete.name}</strong>? Esta ação não pode ser desfeita.
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
