import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  api,
  formatCurrency,
  STAGE_LABELS,
  STAGE_ORDER,
  type Client,
  type Deal,
  type PaginationMeta,
  type Stage
} from "../api";
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  Pagination,
  useToast
} from "../ui";

const PAGE_SIZE = 4;

interface FormState {
  title: string;
  value: string;
  clientId: string;
  stage: Stage;
}

const EMPTY_FORM: FormState = { title: "", value: "", clientId: "", stage: "new" };

function parseCurrencyToCents(raw: string): number | null {
  const normalized = raw
    .trim()
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (normalized === "") return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export default function DealsPage() {
  const { notify } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const stageFilter = searchParams.get("stage") ?? "";
  const clientFilter = searchParams.get("clientId") ?? "";

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<Deal | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const loadClients = useCallback(async () => {
    try {
      const result = await api.listClients({ page: 1, pageSize: 50 });
      setClients(result.data);
    } catch {
      // filtros seguem funcionando mesmo sem a lista de clientes
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.listDeals({
        search,
        stage: stageFilter || undefined,
        clientId: clientFilter || undefined,
        page,
        pageSize: PAGE_SIZE
      });
      setDeals(result.data);
      setPagination(result.pagination);
      if (result.data.length === 0 && page > 1) {
        setPage(result.pagination.totalPages);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar negócios.");
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

  const updateFilter = (key: "stage" | "clientId", value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "") next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
    setPage(1);
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      clientId: clientFilter || ""
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (deal: Deal) => {
    setEditing(deal);
    setForm({
      title: deal.title,
      value: (deal.valueInCents / 100).toFixed(2).replace(".", ","),
      clientId: String(deal.clientId),
      stage: deal.stage
    });
    setFormError(null);
    setModalOpen(true);
  };

  const submitForm = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const title = form.title.trim();
    if (title.length < 2 || title.length > 120) {
      setFormError("O título deve ter entre 2 e 120 caracteres.");
      return;
    }
    const valueInCents = parseCurrencyToCents(form.value);
    if (valueInCents === null) {
      setFormError("Informe um valor válido, maior ou igual a zero.");
      return;
    }
    const clientId = Number(form.clientId);
    if (!Number.isInteger(clientId) || clientId < 1) {
      setFormError("Selecione o cliente do negócio.");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await api.updateDeal(editing.id, {
          title,
          valueInCents,
          clientId,
          stage: form.stage
        });
        notify("success", "Negócio atualizado com sucesso.");
      } else {
        await api.createDeal({ title, valueInCents, clientId, stage: form.stage });
        notify("success", "Negócio criado com sucesso.");
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar o negócio.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.deleteDeal(deleting.id);
      notify("success", "Negócio excluído com sucesso.");
      setDeleting(null);
      await load();
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Erro ao excluir o negócio.");
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  const clientName = (id: number) =>
    clients.find((c) => c.id === id)?.name ?? `Cliente #${id}`;

  const filteredClientName = clientFilter
    ? clients.find((c) => String(c.id) === clientFilter)?.name
    : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Negócios</h1>
          <p>
            {filteredClientName
              ? `Exibindo negócios do cliente ${filteredClientName}.`
              : "Acompanhe as oportunidades comerciais em andamento."}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          Novo negócio
        </button>
      </div>

      <div className="panel">
        <form className="panel-toolbar" onSubmit={submitSearch} role="search">
          <div className="toolbar-field" style={{ flex: "1 1 200px" }}>
            <label htmlFor="deal-search">Buscar</label>
            <input
              id="deal-search"
              name="search"
              type="search"
              placeholder="Título do negócio"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="toolbar-field">
            <label htmlFor="deal-stage-filter">Etapa</label>
            <select
              id="deal-stage-filter"
              name="stage"
              value={stageFilter}
              onChange={(e) => updateFilter("stage", e.target.value)}
            >
              <option value="">Todas</option>
              {STAGE_ORDER.map((stage) => (
                <option key={stage} value={stage}>
                  {STAGE_LABELS[stage]}
                </option>
              ))}
            </select>
          </div>
          <div className="toolbar-field">
            <label htmlFor="deal-client-filter">Cliente</label>
            <select
              id="deal-client-filter"
              name="clientId"
              value={clientFilter}
              onChange={(e) => updateFilter("clientId", e.target.value)}
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
          <LoadingState label="Carregando negócios..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : deals.length === 0 ? (
          <EmptyState
            message={
              search || stageFilter || clientFilter
                ? "Nenhum negócio encontrado para os filtros informados."
                : "Nenhum negócio cadastrado. Crie o primeiro negócio."
            }
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Cliente</th>
                  <th>Etapa</th>
                  <th className="cell-number">Valor</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => (
                  <tr key={deal.id} data-testid="deal-row" data-id={deal.id}>
                    <td>{deal.title}</td>
                    <td className="cell-muted">{clientName(deal.clientId)}</td>
                    <td>
                      <span className={`badge badge-${deal.stage}`}>
                        {STAGE_LABELS[deal.stage]}
                      </span>
                    </td>
                    <td className="cell-number">{formatCurrency(deal.valueInCents)}</td>
                    <td>
                      <div className="cell-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEdit(deal)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => setDeleting(deal)}
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

        {pagination && !loading && !error ? (
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onChange={setPage}
          />
        ) : null}
      </div>

      {modalOpen ? (
        <Modal
          title={editing ? "Editar negócio" : "Novo negócio"}
          onClose={() => setModalOpen(false)}
        >
          <form className="form-grid" onSubmit={submitForm} noValidate>
            {formError ? <div className="form-error" role="alert">{formError}</div> : null}
            <div className="field">
              <label htmlFor="deal-title">Título *</label>
              <input
                id="deal-title"
                name="title"
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
              <span className="hint">Entre 2 e 120 caracteres.</span>
            </div>
            <div className="field">
              <label htmlFor="deal-value">Valor (R$) *</label>
              <input
                id="deal-value"
                name="value"
                type="text"
                inputMode="decimal"
                placeholder="Ex.: 1.500,00"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="deal-client">Cliente *</label>
              <select
                id="deal-client"
                name="clientId"
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                required
              >
                <option value="">Selecione um cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="deal-stage">Etapa *</label>
              <select
                id="deal-stage"
                name="stage"
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value as Stage })}
                required
              >
                {STAGE_ORDER.map((stage) => (
                  <option key={stage} value={stage}>
                    {STAGE_LABELS[stage]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Excluir negócio"
          message={`Tem certeza de que deseja excluir o negócio "${deleting.title}"? Esta ação não pode ser desfeita.`}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleting(null)}
          busy={deleteBusy}
        />
      ) : null}
    </div>
  );
}
