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
  STAGES,
} from '../types';
import type { Client, Deal, Pagination as PaginationMeta, Stage } from '../types';

const PAGE_SIZE = 4;

interface DealFormState {
  title: string;
  value: string;
  clientId: string;
  stage: Stage;
}

function DealForm({
  initial,
  clients,
  onSubmit,
  onCancel,
  busy,
  error,
}: {
  initial: DealFormState;
  clients: Client[];
  onSubmit: (values: DealFormState) => void;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
}) {
  const [values, setValues] = useState<DealFormState>(initial);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(values);
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="form-field">
        <label htmlFor="deal-title">Título</label>
        <input
          id="deal-title"
          name="title"
          type="text"
          value={values.title}
          onChange={(event) => setValues({ ...values, title: event.target.value })}
          minLength={2}
          maxLength={120}
          required
        />
      </div>
      <div className="form-field">
        <label htmlFor="deal-value">Valor (R$)</label>
        <input
          id="deal-value"
          name="value"
          type="number"
          min={0}
          step="0.01"
          value={values.value}
          onChange={(event) => setValues({ ...values, value: event.target.value })}
          required
        />
      </div>
      <div className="form-field">
        <label htmlFor="deal-client">Cliente</label>
        <select
          id="deal-client"
          name="clientId"
          value={values.clientId}
          onChange={(event) =>
            setValues({ ...values, clientId: event.target.value })
          }
          required
        >
          <option value="" disabled>
            Selecione um cliente
          </option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>
      <div className="form-field">
        <label htmlFor="deal-stage">Etapa</label>
        <select
          id="deal-stage"
          name="stage"
          value={values.stage}
          onChange={(event) =>
            setValues({ ...values, stage: event.target.value as Stage })
          }
        >
          {STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {STAGE_LABELS[stage]}
            </option>
          ))}
        </select>
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

export default function Deals() {
  const [rows, setRows] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientMap, setClientMap] = useState<Record<number, string>>({});
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Deal | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const loadClients = useCallback(async () => {
    try {
      const response = await api.clients.list({ pageSize: 50 });
      setClients(response.data);
      const map: Record<number, string> = {};
      for (const client of response.data) map[client.id] = client.name;
      setClientMap(map);
    } catch {
      /* filtros e formulário degradam sem a lista de clientes */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.deals.list({
        search,
        stage: stageFilter,
        clientId: clientFilter,
        page,
        pageSize: PAGE_SIZE,
      });
      setRows(response.data);
      setMeta(response.pagination);
      setFeedback(null);
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erro ao carregar negócios.',
      });
    } finally {
      setLoading(false);
    }
  }, [search, stageFilter, clientFilter, page]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

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

  const openEdit = (deal: Deal) => {
    setEditing(deal);
    setFormError(null);
    setFormOpen(true);
  };

  const handleSave = async (values: DealFormState) => {
    setFormBusy(true);
    setFormError(null);
    const clientId = Number.parseInt(values.clientId, 10);
    const valueInCents = Math.round(Number.parseFloat(values.value) * 100);
    if (!Number.isFinite(valueInCents) || valueInCents < 0) {
      setFormError('Informe um valor válido.');
      setFormBusy(false);
      return;
    }
    const payload = {
      title: values.title,
      valueInCents,
      clientId,
      stage: values.stage,
    };
    try {
      if (editing) {
        await api.deals.update(editing.id, payload);
        setFeedback({ type: 'success', text: 'Negócio atualizado com sucesso.' });
      } else {
        await api.deals.create(payload);
        setPage(1);
        setFeedback({ type: 'success', text: 'Negócio criado com sucesso.' });
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
      await api.deals.remove(deleteTarget.id);
      setDeleteTarget(null);
      setFeedback({ type: 'success', text: 'Negócio excluído.' });
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

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Negócios</h1>
          <p className="page-sub">Oportunidades comerciais</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          Novo negócio
        </button>
      </header>

      <main className="content">
        <Feedback message={feedback} onClose={() => setFeedback(null)} />

        <section className="card">
          <form className="toolbar toolbar-wrap" onSubmit={applySearch}>
            <div className="search-field">
              <label className="sr-only" htmlFor="deal-search">
                Buscar negócios
              </label>
              <input
                id="deal-search"
                name="search"
                type="search"
                placeholder="Buscar por título"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
            <div className="filter-field">
              <label htmlFor="deal-stage-filter">Etapa</label>
              <select
                id="deal-stage-filter"
                name="stage"
                value={stageFilter}
                onChange={(event) => {
                  setPage(1);
                  setStageFilter(event.target.value);
                }}
              >
                <option value="">Todas</option>
                {STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {STAGE_LABELS[stage]}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-field">
              <label htmlFor="deal-client-filter">Cliente</label>
              <select
                id="deal-client-filter"
                name="clientId"
                value={clientFilter}
                onChange={(event) => {
                  setPage(1);
                  setClientFilter(event.target.value);
                }}
              >
                <option value="">Todos</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-secondary">
              Buscar
            </button>
          </form>

          {loading ? (
            <div className="state-box" role="status">
              Carregando negócios…
            </div>
          ) : rows.length === 0 ? (
            <div className="state-box empty">Nenhum negócio encontrado.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Cliente</th>
                    <th>Etapa</th>
                    <th className="num">Valor</th>
                    <th>Atualizado</th>
                    <th className="actions-col">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((deal) => (
                    <tr key={deal.id} data-testid="deal-row" data-id={deal.id}>
                      <td data-label="Título">{deal.title}</td>
                      <td data-label="Cliente">
                        {clientMap[deal.clientId] ?? `Cliente #${deal.clientId}`}
                      </td>
                      <td data-label="Etapa">
                        <span className={`stage-tag stage-${deal.stage}`}>
                          {STAGE_LABELS[deal.stage]}
                        </span>
                      </td>
                      <td data-label="Valor" className="num">
                        {formatCurrency(deal.valueInCents)}
                      </td>
                      <td data-label="Atualizado">{formatDate(deal.updatedAt)}</td>
                      <td className="actions-col">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => openEdit(deal)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm danger"
                          onClick={() => setDeleteTarget(deal)}
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
          title={editing ? 'Editar negócio' : 'Novo negócio'}
          onClose={() => setFormOpen(false)}
        >
          <DealForm
            initial={
              editing
                ? {
                    title: editing.title,
                    value: (editing.valueInCents / 100).toFixed(2),
                    clientId: String(editing.clientId),
                    stage: editing.stage,
                  }
                : {
                    title: '',
                    value: '0.00',
                    clientId: clients[0] ? String(clients[0].id) : '',
                    stage: 'new',
                  }
            }
            clients={clients}
            onSubmit={handleSave}
            onCancel={() => setFormOpen(false)}
            busy={formBusy}
            error={formError}
          />
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Excluir negócio"
          message={`Confirma a exclusão de "${deleteTarget.title}"? Esta ação não pode ser desfeita.`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void confirmDelete()}
          busy={deleteBusy}
        />
      )}
    </>
  );
}
