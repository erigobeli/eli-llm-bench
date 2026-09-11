export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Excluir',
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
    <div className="modal-backdrop" role="presentation">
      <div className="modal modal-sm" role="alertdialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <h2>{title}</h2>
        </header>
        <div className="modal-body">
          <p className="confirm-text">{message}</p>
        </div>
        <footer className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Excluindo…' : confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
