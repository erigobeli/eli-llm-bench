import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import ConfirmDialog from '../components/ConfirmDialog';
import Feedback from '../components/Feedback';
import type { FeedbackMessage } from '../components/Feedback';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import {
  formatCurrency,
  formatDate,
  STAGE_LABELS,
} from '../types';
import type { Client, Deal, Pagination as PaginationMeta } from '../types';

const PAGE_SIZE = 4;

interface ClientFormState {
  name: string;
  email: string;
  company: string;
}

const EMPTY_FORM: ClientFormState = { name: '', email: '', company: '' };

function ClientForm({
  initial,
  onSubmit,
  onCancel,
  busy,
  error,
}: {
  initial: ClientFormState;
  onSubmit: (values: ClientFormState) => void;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
}) {
  const [values, setValues] = useState<ClientFormState>(initial);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(values);
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="form-field">
        <label htmlFor="client-name">Nome</label>
        <input
          id="client-name"
          name="name"
          type="text"
          value={values.name}
          onChange={(event) => setValues({ ...values, name: event.target.value })}
          minLength={2}
          maxLength={80}
          required
        />
      </div>
      <div className="form-field">
        <label htmlFor="client-email">E-mail</label>
        <input
          id="client-email"
          name="email"
          type="email"
          value={values.email}
          onChange={(event) => setValues({ ...values, email: event.target.value })}
          required
        />
      </div>
      <div className="form-field">
        <label htmlFor="client-company">Empresa</label>
        <input
          id="client-company"
          name="company"
          type="text"
          value={values.company}
          onChange={(event) =>
            setValues({ ...values, company: event.target.value })
          }
          placeholder="Opcional"
        />
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}

export default function Clients() {
  const [rows, setRows] = useState<Client[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [dealsFor, setDealsFor] = useState<Client | null>(null);
  const [relatedDeals, setRelatedDeals] = useState<Deal[]>([]);
  const [dealsLoading, setDealsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.clients.list({
        search,
        page,
        pageSize: PAGE_SIZE,
      });
      setRows(response.data);
      setMeta(response.pagination);
      setFeedback(null);
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erro ao carregar clientes.',
      });
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const applySearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditing(client);
    setFormError(null);
    setFormOpen(true);
  };

  const handleSave = async (values: ClientFormState) => {
    setFormBusy(true);
    setFormError(null);
    const payload = {
      name: values.name,
      email: values.email,
      company: values.company.trim() === '' ? null : values.company,
    };
    try {
      if (editing) {
        await api.clients.update(editing.id, payload);
        setFeedback({ type: 'success', text: 'Cliente atualizado com sucesso.' });
      } else {
        await api.clients.create(payload);
        setPage(1);
        setFeedback({ type: 'success', text: 'Cliente criado com sucesso.' });
      }
      setFormOpen(false);
      await load();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Erro ao salvar.');
    } finally {
      setFormBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await api.clients.remove(deleteTarget.id);
      setDeleteTarget(null);
      setFeedback({ type: 'success', text: 'Cliente excluído.' });
      await load();
    } catch (error) {
      setDeleteTarget(null);
      setFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erro ao excluir.',
      });
    } finally {
      setDeleteBusy(false);
    }
  };

  const viewDeals = async (client: Client) => {
    setDealsFor(client);
    setRelatedDeals([]);
    setDealsLoading(true);
    try {
      const response = await api.deals.list({ clientId: client.id, pageSize: 50 });
      setRelatedDeals(response.data);
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erro ao carregar negócios.',
      });
    } finally {
      setDealsLoading(false);
    }
  };

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Clientes</h1>
          <p className="page-sub">Cadastro e manutenção de clientes</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          Novo cliente
        </button>
      </header>

      <main className="content">
        <Feedback message={feedback} onClose={() => setFeedback(null)} />

        <section className="card">
          <form className="toolbar" onSubmit={applySearch}>
            <div className="search-field">
              <label className="sr-only" htmlFor="client-search">
                Buscar clientes
              </label>
              <input
                id="client-search"
                name="search"
                type="search"
                placeholder="Buscar por nome, e-mail ou empresa"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-secondary">
              Buscar
            </button>
          </form>

          {loading ? (
            <div className="state-box" role="status">
              Carregando clientes…
            </div>
          ) : rows.length === 0 ? (
            <div className="state-box empty">
              Nenhum cliente encontrado.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Empresa</th>
                    <th>Criado em</th>
                    <th className="actions-col">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((client) => (
                    <tr
                      key={client.id}
                      data-testid="client-row"
                      data-id={client.id}
                    >
                      <td data-label="Nome">{client.name}</td>
                      <td data-label="E-mail">{client.email}</td>
                      <td data-label="Empresa">{client.company ?? '—'}</td>
                      <td data-label="Criado em">{formatDate(client.createdAt)}</td>
                      <td className="actions-col">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => void viewDeals(client)}
                        >
                          Ver negócios
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => openEdit(client)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm danger"
                          onClick={() => setDeleteTarget(client)}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && rows.length > 0 && (
            <Pagination
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              onChange={setPage}
            />
          )}
        </section>
      </main>

      {formOpen && (
        <Modal
          title={editing ? 'Editar cliente' : 'Novo cliente'}
          onClose={() => setFormOpen(false)}
        >
          <ClientForm
            initial={
              editing
                ? {
                    name: editing.name,
                    email: editing.email,
                    company: editing.company ?? '',
                  }
                : EMPTY_FORM
            }
            onSubmit={handleSave}
            onCancel={() => setFormOpen(false)}
            busy={formBusy}
            error={formError}
          />
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Excluir cliente"
          message={`Confirma a exclusão de "${deleteTarget.name}"? Esta ação não pode ser desfeita.`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void confirmDelete()}
          busy={deleteBusy}
        />
      )}

      {dealsFor && (
        <Modal
          title={`Negócios de ${dealsFor.name}`}
          onClose={() => setDealsFor(null)}
          wide
        >
          {dealsLoading ? (
            <div className="state-box" role="status">
              Carregando negócios…
            </div>
          ) : relatedDeals.length === 0 ? (
            <div className="state-box empty">
              Este cliente ainda não possui negócios.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Etapa</th>
                    <th className="num">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {relatedDeals.map((deal) => (
                    <tr key={deal.id} data-testid="deal-row" data-id={deal.id}>
                      <td>{deal.title}</td>
                      <td>
                        <span className={`stage-tag stage-${deal.stage}`}>
                          {STAGE_LABELS[deal.stage]}
                        </span>
                      </td>
                      <td className="num">{formatCurrency(deal.valueInCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
