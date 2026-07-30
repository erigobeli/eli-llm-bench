import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Pagination } from "../types";

/* ------------------------------- toasts ------------------------------- */

type ToastKind = "success" | "error";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi>({
  success: () => undefined,
  error: () => undefined,
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const push = useCallback((kind: ToastKind, message: string) => {
    counter.current += 1;
    const id = counter.current;
    setToasts((current) => [...current, { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 5000);
  }, []);

  const value = useMemo<ToastApi>(
    () => ({
      success: (message: string) => push("success", message),
      error: (message: string) => push("error", message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast--${toast.kind}`}
            role={toast.kind === "error" ? "alert" : "status"}
            data-testid={toast.kind === "error" ? "toast-error" : "toast-success"}
          >
            <span className="toast__title">
              {toast.kind === "error" ? "Erro" : "Sucesso"}
            </span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

/* -------------------------------- modal -------------------------------- */

export function Modal({
  title,
  onClose,
  children,
  footer,
  testId,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  testId?: string;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid={testId}
      >
        <header className="modal__header">
          <h2>{title}</h2>
          <button
            type="button"
            className="btn btn--icon"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer ? <footer className="modal__footer">{footer}</footer> : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Excluir",
  onConfirm,
  onCancel,
  busy,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      testId="confirm-dialog"
      footer={
        <>
          <button type="button" className="btn" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={onConfirm}
            disabled={busy}
            data-testid="confirm-delete"
          >
            {busy ? "Excluindo..." : confirmLabel}
          </button>
        </>
      }
    >
      <p className="confirm-text">{message}</p>
    </Modal>
  );
}

/* ------------------------------- states ------------------------------- */

export function LoadingState({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="state" data-testid="loading" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state state--error" data-testid="error-state" role="alert">
      <strong>Não foi possível carregar os dados.</strong>
      <span>{message}</span>
      {onRetry ? (
        <button type="button" className="btn" onClick={onRetry}>
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="state state--empty" data-testid="empty-state">
      <strong>{title}</strong>
      {description ? <span>{description}</span> : null}
    </div>
  );
}

/* ------------------------------ paginação ------------------------------ */

export function Pager({
  pagination,
  onChange,
  label,
}: {
  pagination: Pagination;
  onChange: (page: number) => void;
  label: string;
}) {
  const totalPages = Math.max(1, pagination.totalPages);
  const canPrevious = pagination.page > 1;
  const canNext = pagination.page < totalPages;

  return (
    <nav className="pager" aria-label={`Paginação de ${label}`}>
      <span className="pager__info" data-testid="pagination-info">
        Página {pagination.page} de {totalPages} · {pagination.total} registro
        {pagination.total === 1 ? "" : "s"}
      </span>
      <div className="pager__actions">
        <button
          type="button"
          className="btn"
          onClick={() => onChange(pagination.page - 1)}
          disabled={!canPrevious}
          aria-label="Anterior"
          data-testid="pagination-previous"
        >
          Anterior
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => onChange(pagination.page + 1)}
          disabled={!canNext}
          aria-label="Próxima"
          data-testid="pagination-next"
        >
          Próxima
        </button>
      </div>
    </nav>
  );
}

/* -------------------------------- forms -------------------------------- */

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className={`field${error ? " field--invalid" : ""}`}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && !error ? <span className="field__hint">{hint}</span> : null}
      {error ? (
        <span className="field__error" role="alert" data-testid="field-error">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function FormAlert({ message }: { message: string }) {
  return (
    <div className="form-alert" role="alert" data-testid="form-error">
      {message}
    </div>
  );
}

export function StageBadge({ stage, label }: { stage: string; label: string }) {
  return <span className={`badge badge--${stage}`}>{label}</span>;
}
