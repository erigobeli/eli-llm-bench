import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  FormAlert,
  LoadingState,
  Modal,
  Pager,
  useToast,
} from "../components/ui";
import { centsToInput, formatCents, parseCurrencyToCents } from "../format";
import {
  STAGES,
  STAGE_LABELS,
  UI_PAGE_SIZE,
  type Client,
  type Deal,
  type Pagination,
  type Stage,
} from "../types";

interface FormState {
  title: string;
  value: string;
  clientId: string;
  stage: Stage;
}

const EMPTY_FORM: FormState = { title: "", value: "", clientId: "", stage: "new" };

function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};
  const title = form.title.trim();
  if (title.length < 2 || title.length > 120) {
    errors.title = "Informe um título com 2 a 120 caracteres.";
  }
  const cents = parseCurrencyToCents(form.value);
  if (cents === null) {
    errors.value = "Informe um valor válido maior ou igual a zero.";
  }
  if (form.clientId.trim() === "") {
    errors.clientId = "Selecione o cliente do negócio.";
  }
  if (!STAGES.includes(form.stage)) {
    errors.stage = "Selecione uma etapa válida.";
  }
  return errors;
}

export default function DealsPage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialClientFilter = searchParams.get("clientId") ?? "";

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>(searchParams.get("stage") ?? "");
  const [clientFilter, setClientFilter] = useState<string>(initialClientFilter);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: UI_PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [clients, setClients] = useState<Client[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<Deal | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    api
      .listClients({ page: 1, pageSize: 50 })
      .then((result) => setClients(result.data))
      .catch(() => setClients([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await api.listDeals({
        search: search || undefined,
        stage: stageFilter || undefined,
        clientId: clientFilter || undefined,
        page,
        pageSize: UI_PAGE_SIZE,
      });
      setDeals(result.data);
      setPagination(result.pagination);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Erro inesperado.");
      setDeals([]);
    } finally {
      setLoading(false);
    }
  }, [clientFilter, page, search, stageFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (clientFilter) {
      next.set("clientId", clientFilter);
    }
    if (stageFilter) {
      next.set("stage", stageFilter);
    }
    setSearchParams(next, { replace: true });
  }, [clientFilter, setSearchParams, stageFilter]);

  const clientsById = useMemo(() => {
    const map = new Map<number, Client>();
    for (const client of clients) {
      map.set(client.id, client);
    }
    return map;
  }, [clients]);

  const clientName = (clientId: number) =>
    clientsById.get(clientId)?.name ?? `Cliente #${clientId}`;

  const selectedClient = clientFilter ? clientsById.get(Number(clientFilter)) : undefined;

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      clientId: clientFilter || (clients[0] ? String(clients[0].id) : ""),
      stage: (stageFilter as Stage) || "new",
    });
    setErrors({});
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (deal: Deal) => {
    setEditing(deal);
    setForm({
      title: deal.title,
      value: centsToInput(deal.valueInCents),
      clientId: String(deal.clientId),
      stage: deal.stage,
    });
    setErrors({});
    setFormError(null);
    setFormOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validate(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      setFormError("Revise os campos destacados para continuar.");
      return;
    }

    setSaving(true);
    setFormError(null);
    const payload = {
      title: form.title.trim(),
      valueInCents: parseCurrencyToCents(form.value) ?? 0,
      clientId: Number(form.clientId),
      stage: form.stage,
    };

    try {
      if (editing) {
        await api.updateDeal(editing.id, payload);
        toast.success("Negócio atualizado com sucesso.");
      } else {
        await api.createDeal(payload);
        toast.success("Negócio criado com sucesso.");
        setPage(1);
      }
      setFormOpen(false);
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado.";
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) {
      return;
    }
    setDeleteBusy(true);
    try {
      await api.deleteDeal(deleting.id);
      toast.success("Negócio excluído com sucesso.");
      setDeleting(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro inesperado.");
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  const changeStage = async (deal: Deal, stage: Stage) => {
    try {
      await api.updateDeal(deal.id, { stage });
      toast.success(`Etapa atualizada para ${STAGE_LABELS[stage]}.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro inesperado.");
    }
  };

  return (
    <section className="page">
      <div className="page__header">
        <div>
          <p className="page__eyebrow">Pipeline comercial</p>
          <h1 className="page__title">Negócios</h1>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={openCreate}
          data-testid="new-deal"
        >
          Novo negócio
        </button>
      </div>

      {selectedClient ? (
        <div className="notice" data-testid="client-filter-notice">
          <span>
            Exibindo apenas os negócios de <strong>{selectedClient.name}</strong>.
          </span>
          <button
            type="button"
            className="btn btn--small"
            onClick={() => {
              setClientFilter("");
              setPage(1);
            }}
          >
            Remover filtro
          </button>
        </div>
      ) : null}

      <div className="card">
        <form
          className="toolbar toolbar--filters"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setSearch(searchInput.trim());
          }}
        >
          <div className="field field--inline">
            <label htmlFor="deal-search">Buscar negócios</label>
            <input
              id="deal-search"
              name="search"
              type="search"
              value={searchInput}
              placeholder="Título do negócio"
              onChange={(event) => {
                setSearchInput(event.target.value);
                setPage(1);
                setSearch(event.target.value.trim());
              }}
            />
          </div>
          <div className="field field--inline">
            <label htmlFor="deal-stage-filter">Etapa</label>
            <select
              id="deal-stage-filter"
              name="stage"
              value={stageFilter}
              onChange={(event) => {
                setStageFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas as etapas</option>
              {STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {STAGE_LABELS[stage]}
                </option>
              ))}
            </select>
          </div>
          <div className="field field--inline">
            <label htmlFor="deal-client-filter">Cliente</label>
            <select
              id="deal-client-filter"
              name="clientId"
              value={clientFilter}
              onChange={(event) => {
                setClientFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos os clientes</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn">
            Aplicar
          </button>
        </form>

        {loading ? <LoadingState label="Carregando negócios..." /> : null}
        {loadError ? <ErrorState message={loadError} onRetry={load} /> : null}

        {!loading && !loadError && deals.length === 0 ? (
          <EmptyState
            title="Nenhum negócio encontrado"
            description="Ajuste os filtros ou cadastre um novo negócio."
          />
        ) : null}

        {!loading && !loadError && deals.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Negócio</th>
                  <th scope="col" className="hide-sm">
                    Cliente
                  </th>
                  <th scope="col">Etapa</th>
                  <th scope="col" className="num hide-sm">
                    Valor
                  </th>
                  <th scope="col" className="actions-col">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => (
                  <tr key={deal.id} data-testid="deal-row" data-id={deal.id}>
                    <td>
                      <span className="cell-title">{deal.title}</span>
                      <span className="cell-sub hide-lg">
                        {clientName(deal.clientId)} · {formatCents(deal.valueInCents)}
                      </span>
                    </td>
                    <td className="hide-sm cell-muted">{clientName(deal.clientId)}</td>
                    <td>
                      <label className="sr-only" htmlFor={`row-stage-${deal.id}`}>
                        Etapa do negócio {deal.title}
                      </label>
                      <select
                        id={`row-stage-${deal.id}`}
                        name="stage"
                        className="stage-select"
                        value={deal.stage}
                        onChange={(event) =>
                          void changeStage(deal, event.target.value as Stage)
                        }
                      >
                        {STAGES.map((stage) => (
                          <option key={stage} value={stage}>
                            {STAGE_LABELS[stage]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="num hide-sm">{formatCents(deal.valueInCents)}</td>
                    <td className="actions-col">
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn--small"
                          onClick={() => openEdit(deal)}
                          data-testid="edit-deal"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn--small btn--danger-ghost"
                          onClick={() => setDeleting(deal)}
                          data-testid="delete-deal"
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
        ) : null}

        {!loadError ? (
          <Pager pagination={pagination} onChange={setPage} label="negócios" />
        ) : null}
      </div>

      {formOpen ? (
        <Modal
          title={editing ? `Editar negócio #${editing.id}` : "Novo negócio"}
          onClose={() => setFormOpen(false)}
          testId="deal-form-modal"
        >
          <form className="form" onSubmit={submit} noValidate data-testid="deal-form">
            {formError ? <FormAlert message={formError} /> : null}
            <Field label="Título" htmlFor="deal-title" error={errors.title}>
              <input
                id="deal-title"
                name="title"
                type="text"
                autoComplete="off"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </Field>
            <Field
              label="Valor (R$)"
              htmlFor="deal-value"
              error={errors.value}
              hint="Use vírgula para centavos, por exemplo 1500,00."
            >
              <input
                id="deal-value"
                name="valueInCents"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={form.value}
                onChange={(event) => setForm({ ...form, value: event.target.value })}
              />
            </Field>
            <Field label="Cliente" htmlFor="deal-client" error={errors.clientId}>
              <select
                id="deal-client"
                name="clientId"
                value={form.clientId}
                onChange={(event) => setForm({ ...form, clientId: event.target.value })}
              >
                <option value="">Selecione um cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Etapa" htmlFor="deal-stage" error={errors.stage}>
              <select
                id="deal-stage"
                name="stage"
                value={form.stage}
                onChange={(event) =>
                  setForm({ ...form, stage: event.target.value as Stage })
                }
              >
                {STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {STAGE_LABELS[stage]}
                  </option>
                ))}
              </select>
            </Field>
            <div className="form__actions">
              <button type="button" className="btn" onClick={() => setFormOpen(false)}>
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={saving}
                data-testid="submit-deal"
              >
                {saving ? "Salvando..." : "Salvar negócio"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Excluir negócio"
          message={`Deseja realmente excluir o negócio "${deleting.title}"? Esta ação não pode ser desfeita.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
          busy={deleteBusy}
        />
      ) : null}
    </section>
  );
}
