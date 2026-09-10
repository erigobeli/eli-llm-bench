import type { ReactNode } from "react";
import type { Pagination as PaginationMeta } from "../../../shared/types";

export function Pagination({ pagination, onChange }: { pagination: PaginationMeta; onChange: (page: number) => void }) {
  const { page, totalPages, total, pageSize } = pagination;
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return (
    <nav className="pagination" aria-label="Paginação">
      <span className="pagination-info">
        {total === 0 ? "Nenhum registro" : `${first}–${last} de ${total}`}
      </span>
      <div className="pagination-controls">
        <button type="button" className="btn btn-sm" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Anterior">
          Anterior
        </button>
        <span className="pagination-page">
          Página {page} de {Math.max(totalPages, 1)}
        </span>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Próxima"
        >
          Próxima
        </button>
      </div>
    </nav>
  );
}

export function LoadingState({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="state state-loading" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state state-error" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn btn-sm" onClick={onRetry}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="state state-empty">
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {action && <div className="page-actions">{action}</div>}
    </header>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span className="field-error" role="alert">
      {message}
    </span>
  );
}
