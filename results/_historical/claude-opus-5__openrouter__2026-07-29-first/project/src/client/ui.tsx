import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/* ------------------------------------------------------------------ router */

interface RouterValue {
  path: string;
  search: string;
  navigate: (to: string) => void;
}

const RouterContext = createContext<RouterValue>({ path: '/', search: '', navigate: () => {} });

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState(() => ({
    path: window.location.pathname || '/',
    search: window.location.search,
  }));

  useEffect(() => {
    const onPop = () =>
      setLocation({ path: window.location.pathname || '/', search: window.location.search });
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: string) => {
    const url = new URL(to, window.location.origin);
    if (url.pathname + url.search !== window.location.pathname + window.location.search) {
      window.history.pushState({}, '', url.pathname + url.search);
    }
    setLocation({ path: url.pathname || '/', search: url.search });
    window.scrollTo(0, 0);
  }, []);

  const value = useMemo(
    () => ({ path: location.path, search: location.search, navigate }),
    [location.path, location.search, navigate],
  );
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterValue {
  return useContext(RouterContext);
}

export function Link({
  to,
  className,
  children,
  ...rest
}: { to: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { navigate } = useRouter();
  return (
    <a
      href={to}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

/* ------------------------------------------------------------------- toasts */

type ToastKind = 'success' | 'error';
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastValue {
  notify: (kind: ToastKind, message: string) => void;
}

const ToastContext = createContext<ToastValue>({ notify: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4500);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.kind}`}>
            <span className="toast__mark" aria-hidden="true" />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  return useContext(ToastContext);
}

/* -------------------------------------------------------------------- modal */

export function Modal({
  title,
  description,
  onClose,
  children,
  labelledBy = 'modal-title',
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  labelledBy?: string;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.classList.add('has-modal');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('has-modal');
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <header className="modal__head">
          <div>
            <h2 id={labelledBy}>{title}</h2>
            {description ? <p className="modal__desc">{description}</p> : null}
          </div>
          <button type="button" className="btn btn--icon" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </header>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Excluir',
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel} labelledBy="confirm-title">
      <p className="confirm__text">{message}</p>
      <div className="form__actions">
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
        <button type="button" className="btn btn--danger" onClick={onConfirm} disabled={busy}>
          {busy ? 'Excluindo…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------- states */

export function LoadingState({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state state--error" role="alert">
      <strong>Não foi possível carregar os dados.</strong>
      <span>{message}</span>
      {onRetry ? (
        <button type="button" className="btn btn--sm" onClick={onRetry}>
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="state state--empty">
      <strong>{title}</strong>
      {hint ? <span>{hint}</span> : null}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="form__error" role="alert">
      {message}
    </p>
  );
}

/* --------------------------------------------------------------- paginação */

export function Paginator({
  page,
  totalPages,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const lastPage = Math.max(totalPages, 1);

  return (
    <nav className="paginator" aria-label="Paginação">
      <p className="paginator__info">
        {total === 0
          ? 'Nenhum registro'
          : `Exibindo ${first}–${last} de ${total} • Página ${page} de ${lastPage}`}
      </p>
      <div className="paginator__controls">
        <button
          type="button"
          className="btn btn--sm"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Anterior"
          title="Anterior"
        >
          Anterior
        </button>
        <button
          type="button"
          className="btn btn--sm"
          onClick={() => onChange(page + 1)}
          disabled={page >= lastPage}
          aria-label="Próxima"
          title="Próxima"
        >
          Próxima
        </button>
      </div>
    </nav>
  );
}

/* ---------------------------------------------------------------- primitivos */

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="page-head">
      <div className="page-head__text">
        <p className="page-head__eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {subtitle ? <p className="page-head__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-head__actions">{actions}</div> : null}
    </header>
  );
}

export function StageBadge({ label, stage }: { label: string; stage: string }) {
  return <span className={`badge badge--${stage}`}>{label}</span>;
}
