import { useEffect, type ReactNode } from 'react';
import { STAGE_LABELS, type Stage } from '../types';

/* ---------------------------------------------------------------- estados */

export function LoadingState({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" data-testid="loading-state">
      <span className="sr-only">{label}</span>
      <div className="skeleton-row" style={{ width: '38%' }} />
      <div className="skeleton-row" style={{ width: '78%' }} />
      <div className="skeleton-row" style={{ width: '62%' }} />
      <div className="skeleton-row" style={{ width: '70%' }} />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state" role="alert" data-testid="error-state">
      <div className="state__title">Não foi possível carregar os dados</div>
      <p>{message}</p>
      {onRetry ? (
        <p style={{ marginTop: 8 }}>
          <button type="button" className="btn" onClick={onRetry}>
            Tentar novamente
          </button>
        </p>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="state" data-testid="empty-state">
      <div className="state__title">{title}</div>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

/* ----------------------------------------------------------------- badge */

export function StageBadge({ stage }: { stage: Stage }) {
  return <span className={`badge badge--${stage}`}>{STAGE_LABELS[stage]}</span>;
}

/* ---------------------------------------------------------------- página */

export function PageHead({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div className="page-head__text">
        <div className="page-head__eyebrow">{eyebrow}</div>
        <h1 className="page-head__title">{title}</h1>
        {subtitle ? <div className="page-head__sub">{subtitle}</div> : null}
      </div>
      {actions ? <div className="page-head__actions">{actions}</div> : null}
    </header>
  );
}

/* ----------------------------------------------------------------- modal */

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide = false,
  testId,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  testId?: string;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={wide ? 'modal modal--wide' : 'modal'}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid={testId}
      >
        <div className="modal__head">
          <h2 className="modal__title">{title}</h2>
          <button type="button" className="modal__close" aria-label="Fechar" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer ? <div className="modal__foot">{footer}</div> : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- confirmar */

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Excluir',
  busy = false,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      testId="confirm-dialog"
      footer={
        <>
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button type="button" className="btn btn--danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Excluindo…' : confirmLabel}
          </button>
        </>
      }
    >
      <p>{message}</p>
      <p className="field__hint" style={{ marginTop: 6 }}>
        Esta ação não pode ser desfeita.
      </p>
    </Modal>
  );
}

/* ------------------------------------------------------------- paginação */

export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  onChange,
  disabled = false,
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}) {
  const effectiveTotalPages = Math.max(totalPages, 1);
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav className="pagination" aria-label="Paginação" data-testid="pagination">
      <span className="pagination__status" data-testid="pagination-status">
        {total === 0
          ? 'Nenhum registro'
          : `Exibindo ${first}–${last} de ${total} · Página ${page} de ${effectiveTotalPages}`}
      </span>
      <span className="pagination__spacer" />
      <button
        type="button"
        className="btn btn--sm"
        aria-label="Anterior"
        title="Anterior"
        data-testid="pagination-prev"
        disabled={disabled || page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Anterior
      </button>
      <button
        type="button"
        className="btn btn--sm"
        aria-label="Próxima"
        title="Próxima"
        data-testid="pagination-next"
        disabled={disabled || page >= effectiveTotalPages}
        onClick={() => onChange(page + 1)}
      >
        Próxima
      </button>
    </nav>
  );
}

/* ---------------------------------------------------------------- campos */

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  grow = false,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  grow?: boolean;
}) {
  return (
    <div className={grow ? 'field field--grow' : 'field'}>
      <label className="field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && !error ? <span className="field__hint">{hint}</span> : null}
      {error ? (
        <span className="field__error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
