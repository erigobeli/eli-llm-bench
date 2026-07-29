import { useCallback, useEffect, useState } from "react";
import { api, formatCurrency } from "../api";
import { Client, Deal, STAGE_LABELS, STAGES, Stage } from "../types";
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Loading,
  Modal,
  Pagination,
} from "../components";
import { useToast } from "../toast";

const PAGE_SIZE = 4;

interface FormState {
  title: string;
  value: string; // reais, as text
  clientId: string;
  stage: Stage;
}

const EMPTY_FORM: FormState = { title: "", value: "", clientId: "", stage: "new" };

export default function DealsPage() {
  const { notify } = useToast();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<Deal | null>(null);

  const loadClients = useCallback(async () => {
    try {
      const res = await api.listClients({ pageSize: 50 });
      setClients(res.data);
    } catch {
      /* ignore, filter still usable */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listDeals({
        search,
        stage: stageFilter || undefined,
        clientId: clientFilter ? Number(clientFilter) : undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setDeals(res.data);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [search, stageFilter, clientFilter, page]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    load();
  }, [load]);

  const clientName = (id: number) =>
    clients.find((c) => c.id === id)?.name ?? `Cliente #${id}`;

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, clientId: clients[0] ? String(clients[0].id) : "" });
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(deal: Deal) {
    setEditing(deal);
    setForm({
      title: deal.title,
      value: (deal.valueInCents / 100).toFixed(2),
      clientId: String(deal.clientId),
      stage: deal.stage,
    });
    setFormError(null);
    setShowForm(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const reais = Number(form.value.replace(",", "."));
    if (!Number.isFinite(reais) || reais < 0) {
      setFormError("Informe um valor válido maior ou igual a zero.");
      return;
    }
    if (!form.clientId) {
      setFormError("Selecione um cliente.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        valueInCents: Math.round(reais * 100),
        clientId: Number(form.clientId),
        stage: form.stage,
      };
      if (editing) {
        await api.updateDeal(editing.id, payload);
        notify("success", "Negócio atualizado com sucesso.");
      } else {
        await api.createDeal(payload);
        notify("success", "Negócio criado com sucesso.");
      }
      setShowForm(false);
      if (!editing) setPage(1);
      await load();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await api.deleteDeal(toDelete.id);
      notify("success", "Negócio excluído com sucesso.");
      setToDelete(null);
      if (deals.length === 1 && page > 1) setPage((p) => p - 1);
      else await load();
    } catch (err) {
      notify("error", (err as Error).message);
      setToDelete(null);
    }
  }

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Negócios</h1>
          <p className="page-subtitle">Acompanhe as oportunidades comerciais.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} type="button">
          Novo negócio
        </button>
      </header>

      <form className="toolbar" onSubmit={applySearch} role="search">
        <input
          className="input"
          type="search"
          name="search"
          placeholder="Buscar por título"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          aria-label="Buscar negócios"
        />
        <select
          className="input"
          name="stage"
          aria-label="Filtrar por etapa"
          value={stageFilter}
          onChange={(e) => {
            setPage(1);
            setStageFilter(e.target.value);
          }}
        >
          <option value="">Todas as etapas</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          className="input"
          name="clientId"
          aria-label="Filtrar por cliente"
          value={clientFilter}
          onChange={(e) => {
            setPage(1);
            setClientFilter(e.target.value);
          }}
        >
          <option value="">Todos os clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="btn btn-secondary" type="submit">
          Buscar
        </button>
      </form>

      {loading && <Loading />}
      {error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && deals.length === 0 && (
        <EmptyState message="Nenhum negócio encontrado." />
      )}

      {!loading && !error && deals.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Cliente</th>
                <th>Etapa</th>
                <th className="col-value">Valor</th>
                <th className="col-actions">Ações</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id} data-testid="deal-row" data-id={d.id}>
                  <td>{d.title}</td>
                  <td>{clientName(d.clientId)}</td>
                  <td>
                    <span className={`badge badge-${d.stage}`}>
                      {STAGE_LABELS[d.stage]}
                    </span>
                  </td>
                  <td className="col-value">{formatCurrency(d.valueInCents)}</td>
                  <td className="col-actions">
                    <div className="row-actions">
                      <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={() => openEdit(d)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-ghost btn-ghost-danger"
                        type="button"
                        onClick={() => setToDelete(d)}
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

      {!loading && !error && total > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onChange={setPage}
        />
      )}

      {showForm && (
        <Modal
          title={editing ? "Editar negócio" : "Novo negócio"}
          onClose={() => setShowForm(false)}
        >
          <form className="form" onSubmit={submitForm}>
            {formError && (
              <div className="form-error" role="alert">
                {formError}
              </div>
            )}
            <label className="field">
              <span className="field-label">Título</span>
              <input
                className="input"
                name="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                minLength={2}
                maxLength={120}
              />
            </label>
            <label className="field">
              <span className="field-label">Valor (R$)</span>
              <input
                className="input"
                name="value"
                type="number"
                min="0"
                step="0.01"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                required
              />
            </label>
            <label className="field">
              <span className="field-label">Cliente</span>
              <select
                className="input"
                name="clientId"
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                required
              >
                <option value="" disabled>
                  Selecione um cliente
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Etapa</span>
              <select
                className="input"
                name="stage"
                value={form.stage}
                onChange={(e) =>
                  setForm({ ...form, stage: e.target.value as Stage })
                }
                required
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-actions">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setShowForm(false)}
              >
                Cancelar
              </button>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Excluir negócio"
          message={`Tem certeza de que deseja excluir "${toDelete.title}"? Esta ação não pode ser desfeita.`}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
