import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router';

const NAV_ITEMS = [
  { to: '/', label: 'Visão geral', end: true },
  { to: '/clientes', label: 'Clientes' },
  { to: '/negocios', label: 'Negócios' },
  { to: '/pipeline', label: 'Pipeline' },
];

export function Layout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="brand">CRMBench Modelo</span>
      </header>
      <nav className="sidebar" aria-label="Navegação principal">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
            {item.label}
          </NavLink>
        ))}
      </nav>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function Notice({
  kind,
  children,
  onClose,
}: {
  kind: 'success' | 'error' | 'info';
  children: ReactNode;
  onClose?: () => void;
}) {
  return (
    <div className={`notice notice-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <span>{children}</span>
      {onClose && (
        <button type="button" className="link-button" onClick={onClose}>
          Fechar
        </button>
      )}
    </div>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <p className="state" role="status">
      {label}
    </p>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="notice notice-error" role="alert">
      <span>{message}</span>
      <button type="button" className="button button-secondary" onClick={onRetry}>
        Tentar novamente
      </button>
    </div>
  );
}

export function ConfirmPanel({
  title,
  message,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="confirm-panel" role="alertdialog" aria-modal="false" aria-labelledby="confirm-title">
      <h2 id="confirm-title">{title}</h2>
      <p>{message}</p>
      <div className="form-actions">
        <button type="button" className="button button-secondary" onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
        <button type="button" className="button button-danger" onClick={onConfirm} disabled={busy}>
          {busy ? 'Excluindo...' : confirmLabel}
        </button>
      </div>
    </section>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const lastPage = Math.max(1, totalPages);
  return (
    <nav className="pagination" aria-label="Paginação">
      <span className="muted">
        {total} {total === 1 ? 'registro' : 'registros'}
      </span>
      <div className="pagination-controls">
        <button type="button" className="button button-secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Anterior
        </button>
        <span>
          Página {page} de {lastPage}
        </span>
        <button
          type="button"
          className="button button-secondary"
          disabled={page >= lastPage}
          onClick={() => onChange(page + 1)}
        >
          Próxima
        </button>
      </div>
    </nav>
  );
}
