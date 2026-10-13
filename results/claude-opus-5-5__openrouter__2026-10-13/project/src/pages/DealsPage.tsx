import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { api, STAGES, stageLabel, type Client, type Deal, type Paged, type Stage } from "../api";
import { centsToInput, formatCurrency, formatDate, parseMoneyToCents } from "../format";
import { ConfirmDialog, EmptyState, ErrorState, Field, Loading, Modal, PageHeader, Pager, useDebounced, useToast } from "../ui";

const PAGE_SIZE = 4;

interface FormState {
  title: string;
  value: string;
  clientId: string;
  stage: Stage;
}
type Errors = Partial<Record<keyof FormState | "form", string>>;

function validate(f: FormState): Errors {
  const e: Errors = {};
  const title = f.title.trim();
  if (!title) e.title = "Informe o título.";
  else if (title.length < 2 || title.length > 120) e.title = "O título deve ter entre 2 e 120 caracteres.";
  if (!f.value.trim()) e.value = "Informe o valor.";
  else if (parseMoneyToCents(f.value) === null) e.value = "Informe um valor válido, maior ou igual a zero (ex.: 1.500,00).";
  if (!f.clientId) e.clientId = "Selecione o cliente.";
  if (!STAGES.some((s) => s.value === f.stage)) e.stage = "Selecione uma etapa válida.";
  return e;
}

function DealForm({
  deal,
  clients,
  defaultClientId,
  onClose,
  onSaved,
}: {
  deal: Deal | null;
  clients: Client[];
  defaultClientId?: string;
  onClose: () => void;
  onSaved: (d: Deal, created: boolean) => void;
}) {
  const [form, setForm] = useState<FormState>({
    title: deal?.title ?? "",
    value: deal ? centsToInput(deal.valueInCents) : "",
    clientId: deal ? String(deal.clientId) : (defaultClientId ?? ""),
    stage: deal?.stage ?? "new",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      valueInCents: parseMoneyToCents(form.value)!,
      clientId: Number(form.clientId),
      stage: form.stage,
    };
    try {
      const saved = deal ? await api.updateDeal(deal.id, payload) : await api.createDeal(payload);
      onSaved(saved, !deal);
    } catch (err) {
      setErrors({ form: (err as Error).message });
      setSaving(false);
    }
  }

  return (
    <Modal
      title={deal ? "Editar negócio" : "Novo negócio"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" form="deal-form" className="btn btn-primary" disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </>
      }
    >
      <form id="deal-form" className="form" noValidate onSubmit={submit}>
        {errors.form && (
          <div className="form-alert" role="alert">
            {errors.form}
          </div>
        )}
        <Field id="deal-title" label="Título" required error={errors.title}>
          <input
            id="deal-title"
            name="title"
            type="text"
            value={form.title}
            onChange={set("title")}
            maxLength={160}
            aria-invalid={!!errors.title}
          />
        </Field>
        <Field id="deal-value" label="Valor (R$)" required error={errors.value} hint="Ex.: 1.500,00">
          <input
            id="deal-value"
            name="value"
            type="text"
            inputMode="decimal"
            value={form.value}
            onChange={set("value")}
            aria-invalid={!!errors.value}
          />
        </Field>
        <Field id="deal-client" label="Cliente" required error={errors.clientId}>
          <select
            id="deal-client"
            name="clientId"
            value={form.clientId}
            onChange={set("clientId")}
            aria-invalid={!!errors.clientId}
          >
            <option value="">Selecione…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field id="deal-stage" label="Etapa" required error={errors.stage}>
          <select id="deal-stage" name="stage" value={form.stage} onChange={set("stage")}>
            {STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </form>
    </Modal>
  );
}

export default function DealsPage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const clientFilter = params.get("clientId") ?? "";
  const stageParam = params.get("stage") ?? "";
  const stageFilter = STAGES.some((s) => s.value === stageParam) ? stageParam : "";

  const [search, setSearch] = useState("");
  const debounced = useDebounced(search.trim(), 300);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paged<Deal> | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Deal | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Deal | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .allClients()
      .then(setClients)
      .catch(() => setClients([]));
  }, []);

  const seq = useRef(0);
  const load = useCallback(async () => {
    const my = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const r = await api.listDeals({
        search: debounced,
        stage: stageFilter,
        clientId: clientFilter,
        page,
        pageSize: PAGE_SIZE,
      });
      if (my !== seq.current) return;
      if (r.data.length === 0 && page > 1 && r.pagination.totalPages > 0) {
        setPage(Math.min(page - 1, r.pagination.totalPages));
        return;
      }
      setResult(r);
    } catch (e) {
      if (my === seq.current) setError((e as Error).message);
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, [debounced, stageFilter, clientFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const selectedClient = clientFilter ? clientMap.get(Number(clientFilter)) : undefined;

  function setFilter(key: "clientId" | "stage", value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setPage(1);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.deleteDeal(deleting.id);
      toast("success", `Negócio "${deleting.title}" excluído.`);
      setDeleting(null);
      load();
    } catch (e) {
      toast("error", (e as Error).message);
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  }

  const rows = result?.data ?? [];
  const hasFilters = !!(debounced || stageFilter || clientFilter);

  return (
    <div className="page">
      <PageHeader
        title={selectedClient ? `Negócios de ${selectedClient.name}` : "Negócios"}
        subtitle={result ? `${result.pagination.total} registro(s)` : undefined}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setEditing(null)}>
            Novo negócio
          </button>
        }
      />
      <section className="panel">
        <div className="toolbar">
          <div className="field field-inline search-field">
            <label htmlFor="deals-search">Buscar</label>
            <input
              id="deals-search"
              name="search"
              type="search"
              placeholder="Título do negócio"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="field field-inline">
            <label htmlFor="deals-stage">Etapa</label>
            <select id="deals-stage" name="stage" value={stageFilter} onChange={(e) => setFilter("stage", e.target.value)}>
              <option value="">Todas as etapas</option>
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field field-inline">
            <label htmlFor="deals-client">Cliente</label>
            <select
              id="deals-client"
              name="clientId"
              value={clientFilter}
              onChange={(e) => setFilter("clientId", e.target.value)}
            >
              <option value="">Todos os clientes</option>
              {clientFilter && !selectedClient && <option value={clientFilter}>Cliente #{clientFilter}</option>}
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {hasFilters && (
            <button
              type="button"
              className="btn btn-sm btn-link toolbar-clear"
              onClick={() => {
                setSearch("");
                setParams(new URLSearchParams(), { replace: true });
                setPage(1);
              }}
            >
              Limpar filtros
            </button>
          )}
        </div>

        {error && <ErrorState message={error} onRetry={load} />}
        {loading && !result && !error && <Loading label="Carregando negócios…" />}
        {result && !error && (
          <div className={loading ? "is-refreshing" : undefined} aria-busy={loading}>
            {rows.length === 0 ? (
              <EmptyState title={hasFilters ? "Nenhum negócio encontrado com os filtros atuais." : "Nenhum negócio cadastrado."}>
                {!hasFilters && <span>Use "Novo negócio" para cadastrar o primeiro.</span>}
              </EmptyState>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Cliente</th>
                    <th>Etapa</th>
                    <th className="num">Valor</th>
                    <th>Atualizado em</th>
                    <th className="actions-col">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((d) => (
                    <tr key={d.id} data-testid="deal-row" data-id={d.id}>
                      <td data-label="Título" className="strong">
                        {d.title}
                      </td>
                      <td data-label="Cliente">{clientMap.get(d.clientId)?.name ?? `Cliente #${d.clientId}`}</td>
                      <td data-label="Etapa">
                        <span className={`badge badge-${d.stage}`}>{stageLabel(d.stage)}</span>
                      </td>
                      <td data-label="Valor" className="num">
                        {formatCurrency(d.valueInCents)}
                      </td>
                      <td data-label="Atualizado em">{formatDate(d.updatedAt)}</td>
                      <td data-label="Ações" className="actions">
                        <button type="button" className="btn btn-sm" onClick={() => setEditing(d)} aria-label={`Editar ${d.title}`}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger-outline"
                          onClick={() => setDeleting(d)}
                          aria-label={`Excluir ${d.title}`}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <Pager info={result.pagination} onPage={setPage} itemLabel="negócios" />
          </div>
        )}
      </section>

      {editing !== undefined && (
        <DealForm
          deal={editing}
          clients={clients}
          defaultClientId={clientFilter || undefined}
          onClose={() => setEditing(undefined)}
          onSaved={(d, created) => {
            setEditing(undefined);
            toast("success", created ? `Negócio "${d.title}" criado.` : `Negócio "${d.title}" atualizado.`);
            if (created && page !== 1) setPage(1);
            else load();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Excluir negócio"
          message={
            <>
              Deseja realmente excluir o negócio <strong>{deleting.title}</strong>? Esta ação não pode ser desfeita.
            </>
          }
          busy={busy}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
