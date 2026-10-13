import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, type Client, type Paged } from "../api";
import { formatDate } from "../format";
import { ConfirmDialog, EmptyState, ErrorState, Field, Loading, Modal, PageHeader, Pager, useDebounced, useToast } from "../ui";

const PAGE_SIZE = 4;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormState {
  name: string;
  email: string;
  company: string;
}
type Errors = Partial<Record<keyof FormState | "form", string>>;

function validate(f: FormState): Errors {
  const e: Errors = {};
  const name = f.name.trim();
  if (!name) e.name = "Informe o nome.";
  else if (name.length < 2 || name.length > 80) e.name = "O nome deve ter entre 2 e 80 caracteres.";
  const email = f.email.trim();
  if (!email) e.email = "Informe o e-mail.";
  else if (!EMAIL_RE.test(email)) e.email = "Informe um e-mail válido.";
  if (f.company.trim().length > 120) e.company = "A empresa deve ter no máximo 120 caracteres.";
  return e;
}

function ClientForm({
  client,
  onClose,
  onSaved,
}: {
  client: Client | null;
  onClose: () => void;
  onSaved: (c: Client, created: boolean) => void;
}) {
  const [form, setForm] = useState<FormState>({
    name: client?.name ?? "",
    email: client?.email ?? "",
    company: client?.company ?? "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    const payload = { name: form.name.trim(), email: form.email.trim(), company: form.company.trim() || null };
    try {
      const saved = client ? await api.updateClient(client.id, payload) : await api.createClient(payload);
      onSaved(saved, !client);
    } catch (err) {
      const msg = (err as Error).message;
      setErrors(/e-mail/i.test(msg) ? { email: msg, form: msg } : { form: msg });
      setSaving(false);
    }
  }

  return (
    <Modal
      title={client ? "Editar cliente" : "Novo cliente"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" form="client-form" className="btn btn-primary" disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </>
      }
    >
      <form id="client-form" className="form" noValidate onSubmit={submit}>
        {errors.form && (
          <div className="form-alert" role="alert">
            {errors.form}
          </div>
        )}
        <Field id="client-name" label="Nome" required error={errors.name}>
          <input
            id="client-name"
            name="name"
            type="text"
            value={form.name}
            onChange={set("name")}
            maxLength={120}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "client-name-error" : undefined}
          />
        </Field>
        <Field id="client-email" label="E-mail" required error={errors.email}>
          <input
            id="client-email"
            name="email"
            type="email"
            value={form.email}
            onChange={set("email")}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "client-email-error" : undefined}
          />
        </Field>
        <Field id="client-company" label="Empresa" error={errors.company} hint="Opcional">
          <input
            id="client-company"
            name="company"
            type="text"
            value={form.company}
            onChange={set("company")}
            aria-invalid={!!errors.company}
          />
        </Field>
      </form>
    </Modal>
  );
}

export default function ClientsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search.trim(), 300);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paged<Client> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Client | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Client | null>(null);
  const [busy, setBusy] = useState(false);

  const seq = useRef(0);
  const load = useCallback(async () => {
    const my = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const r = await api.listClients({ search: debounced, page, pageSize: PAGE_SIZE });
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
  }, [debounced, page]);

  useEffect(() => {
    load();
  }, [load]);


  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.deleteClient(deleting.id);
      toast("success", `Cliente "${deleting.name}" excluído.`);
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

  return (
    <div className="page">
      <PageHeader
        title="Clientes"
        subtitle={result ? `${result.pagination.total} registro(s)` : undefined}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setEditing(null)}>
            Novo cliente
          </button>
        }
      />
      <section className="panel">
        <div className="toolbar">
          <div className="field field-inline search-field">
            <label htmlFor="clients-search">Buscar</label>
            <input
              id="clients-search"
              name="search"
              type="search"
              placeholder="Nome, e-mail ou empresa"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {error && <ErrorState message={error} onRetry={load} />}
        {loading && !result && !error && <Loading label="Carregando clientes…" />}
        {result && !error && (
          <div className={loading ? "is-refreshing" : undefined} aria-busy={loading}>
            {rows.length === 0 ? (
              <EmptyState title={debounced ? "Nenhum cliente encontrado para a busca." : "Nenhum cliente cadastrado."}>
                {!debounced && <span>Use "Novo cliente" para cadastrar o primeiro.</span>}
              </EmptyState>
            ) : (
              <table className="table">
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
                  {rows.map((c) => (
                    <tr key={c.id} data-testid="client-row" data-id={c.id}>
                      <td data-label="Nome" className="strong">
                        {c.name}
                      </td>
                      <td data-label="E-mail" className="break">
                        {c.email}
                      </td>
                      <td data-label="Empresa">{c.company ?? <span className="muted">—</span>}</td>
                      <td data-label="Criado em">{formatDate(c.createdAt)}</td>
                      <td data-label="Ações" className="actions">
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => navigate(`/negocios?clientId=${c.id}`)}
                          aria-label={`Ver negócios de ${c.name}`}
                        >
                          Ver negócios
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => setEditing(c)}
                          aria-label={`Editar ${c.name}`}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger-outline"
                          onClick={() => setDeleting(c)}
                          aria-label={`Excluir ${c.name}`}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <Pager info={result.pagination} onPage={setPage} itemLabel="clientes" />
          </div>
        )}
      </section>

      {editing !== undefined && (
        <ClientForm
          client={editing}
          onClose={() => setEditing(undefined)}
          onSaved={(c, created) => {
            setEditing(undefined);
            toast("success", created ? `Cliente "${c.name}" criado.` : `Cliente "${c.name}" atualizado.`);
            if (created && page !== 1) setPage(1);
            else load();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Excluir cliente"
          message={
            <>
              Deseja realmente excluir o cliente <strong>{deleting.name}</strong>? Esta ação não pode ser desfeita.
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
