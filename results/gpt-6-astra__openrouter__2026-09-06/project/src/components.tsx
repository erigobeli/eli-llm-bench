import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Inbox,
  LoaderCircle,
  Search,
  X,
} from "lucide-react";
import type { Client, Deal, Page, Stage } from "../shared/types";
import { stages } from "../shared/types";
import { api, parseMoney, stageLabels } from "./lib";

export const NoticeContext = createContext<
  (message: string, error?: boolean) => void
>(() => {});
export const useNotice = () => useContext(NoticeContext);

export function Notice({
  message,
  error,
  onClose,
}: {
  message: string;
  error: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className={`notice ${error ? "notice-error" : ""}`}
      role={error ? "alert" : "status"}
      aria-label="Notificação"
    >
      {error ? <AlertCircle size={19} /> : <CheckCircle2 size={19} />}
      <span>{message}</span>
      <button
        className="icon-button"
        aria-label="Fechar mensagem"
        onClick={onClose}
      >
        <X size={17} />
      </button>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <div className="eyebrow">ESPAÇO COMERCIAL</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

export function LoadState({
  loading,
  error,
  empty,
  onRetry,
  children,
}: {
  loading: boolean;
  error: string;
  empty?: boolean;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (loading)
    return (
      <div className="content-state" role="status">
        <LoaderCircle className="spin" size={25} />
        <strong>Carregando dados...</strong>
      </div>
    );
  if (error)
    return (
      <div className="content-state" role="alert">
        <AlertCircle size={27} />
        <strong>Não foi possível carregar</strong>
        <p>{error}</p>
        <button className="button" onClick={onRetry}>
          Tentar novamente
        </button>
      </div>
    );
  if (empty)
    return (
      <div className="content-state">
        <Inbox size={30} />
        <strong>Nenhum registro encontrado</strong>
        <p>Altere os filtros ou adicione um novo registro.</p>
      </div>
    );
  return children;
}

export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="search-field">
      <Search size={18} />
      <input
        aria-label="Buscar"
        name="search"
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function Pagination({
  pagination,
  onPage,
}: {
  pagination: Page<unknown>["pagination"];
  onPage: (page: number) => void;
}) {
  const { page, pageSize, total, totalPages } = pagination;
  return (
    <footer className="pagination">
      <span>
        {total
          ? `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} de ${total} registros`
          : "0 registros"}
      </span>
      <nav aria-label="Paginação">
        <button
          className="button button-small"
          aria-label="Anterior"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft size={16} />
          <span>Anterior</span>
        </button>
        <span className="page-counter">
          {page} / {Math.max(1, totalPages)}
        </span>
        <button
          className="button button-small"
          aria-label="Próxima"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          <span>Próxima</span>
          <ChevronRight size={16} />
        </button>
      </nav>
    </footer>
  );
}

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span className={`stage-badge stage-${stage}`}>
      <span />
      {stageLabels[stage]}
    </span>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    const previous = document.activeElement as HTMLElement | null;
    element.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="dialog-title"
      className="modal"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="modal-header">
        <h2 id="dialog-title">{title}</h2>
        <button
          className="icon-button"
          type="button"
          aria-label="Fechar"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function DeleteDialog({
  kind,
  record,
  onClose,
  onDeleted,
}: {
  kind: "clients" | "deals";
  record: Client | Deal;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const notify = useNotice();
  const name = "name" in record ? record.name : record.title;
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await api(`/api/${kind}/${record.id}`, { method: "DELETE" });
      notify(
        kind === "clients"
          ? "Cliente excluído com sucesso."
          : "Negócio excluído com sucesso.",
      );
      onDeleted();
    } catch (error) {
      setError((error as Error).message);
      setBusy(false);
    }
  }
  return (
    <Modal
      title={kind === "clients" ? "Excluir cliente" : "Excluir negócio"}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="modal-body">
        <p>
          Deseja excluir <strong>{name}</strong>?
        </p>
        <p className="muted">
          Esta ação não pode ser desfeita.
          {kind === "clients"
            ? " Clientes com negócios relacionados não podem ser excluídos."
            : ""}
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="modal-footer">
        <button className="button" disabled={busy} onClick={onClose}>
          Cancelar
        </button>
        <button
          className="button button-danger"
          disabled={busy}
          onClick={remove}
        >
          {busy ? "Excluindo..." : "Confirmar exclusão"}
        </button>
      </div>
    </Modal>
  );
}

export function ClientForm({
  client,
  onClose,
  onSaved,
}: {
  client: Client | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const notify = useNotice();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      await api(`/api/clients${client ? `/${client.id}` : ""}`, {
        method: client ? "PATCH" : "POST",
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          company: form.get("company"),
        }),
      });
      notify(
        client
          ? "Cliente atualizado com sucesso."
          : "Cliente criado com sucesso.",
      );
      onSaved();
    } catch (error) {
      setError((error as Error).message);
      setBusy(false);
    }
  }
  return (
    <Modal
      title={client ? "Editar cliente" : "Novo cliente"}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={submit} noValidate>
        <div className="modal-body form-fields">
          <p className="form-hint">Os campos com * são obrigatórios.</p>
          <label htmlFor="client-name">
            Nome *
            <input
              id="client-name"
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={80}
              defaultValue={client?.name}
              placeholder="Nome do cliente"
              autoFocus
            />
          </label>
          <label htmlFor="client-email">
            E-mail *
            <input
              id="client-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={client?.email}
              placeholder="nome@empresa.com.br"
            />
          </label>
          <label htmlFor="client-company">
            Empresa
            <input
              id="client-company"
              name="company"
              autoComplete="organization"
              defaultValue={client?.company || ""}
              placeholder="Nome da empresa (opcional)"
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="modal-footer">
          <button
            className="button"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="button button-primary"
            type="submit"
            disabled={busy}
          >
            {busy ? "Salvando..." : "Salvar cliente"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function DealForm({
  deal,
  clients,
  initialClient,
  onClose,
  onSaved,
}: {
  deal: Deal | null;
  clients: Client[];
  initialClient?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const notify = useNotice();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const valueInCents = parseMoney(String(form.get("valueInCents")));
      setBusy(true);
      await api(`/api/deals${deal ? `/${deal.id}` : ""}`, {
        method: deal ? "PATCH" : "POST",
        body: JSON.stringify({
          title: form.get("title"),
          valueInCents,
          clientId: Number(form.get("clientId")),
          stage: form.get("stage"),
        }),
      });
      notify(
        deal
          ? "Negócio atualizado com sucesso."
          : "Negócio criado com sucesso.",
      );
      onSaved();
    } catch (error) {
      setError((error as Error).message);
      setBusy(false);
    }
  }
  return (
    <Modal
      title={deal ? "Editar negócio" : "Novo negócio"}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={submit} noValidate>
        <div className="modal-body form-fields">
          <p className="form-hint">Os campos com * são obrigatórios.</p>
          <label htmlFor="deal-title">
            Título *
            <input
              id="deal-title"
              name="title"
              required
              minLength={2}
              maxLength={120}
              defaultValue={deal?.title}
              placeholder="Nome da oportunidade"
              autoFocus
            />
          </label>
          <div className="form-field">
            <label htmlFor="deal-client">Cliente *</label>
            <select
              id="deal-client"
              name="clientId"
              required
              defaultValue={deal?.clientId || initialClient || ""}
            >
              <option value="">Selecione um cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          {!clients.length && (
            <p className="form-error" role="alert">
              Cadastre um cliente antes de criar um negócio.
            </p>
          )}
          <div className="form-columns">
            <label htmlFor="deal-value">
              Valor (R$) *
              <input
                id="deal-value"
                name="valueInCents"
                inputMode="decimal"
                required
                defaultValue={
                  deal
                    ? (deal.valueInCents / 100).toFixed(2).replace(".", ",")
                    : ""
                }
                placeholder="0,00"
              />
            </label>
            <div className="form-field">
              <label htmlFor="deal-stage">Etapa *</label>
              <select
                id="deal-stage"
                name="stage"
                defaultValue={deal?.stage || "new"}
              >
                {stages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stageLabels[stage]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="modal-footer">
          <button
            className="button"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="button button-primary"
            type="submit"
            disabled={busy || !clients.length}
          >
            {busy ? "Salvando..." : "Salvar negócio"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
