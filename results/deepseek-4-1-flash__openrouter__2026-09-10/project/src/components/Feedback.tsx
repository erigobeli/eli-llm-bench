export type FeedbackType = 'success' | 'error' | 'info';

export interface FeedbackMessage {
  type: FeedbackType;
  text: string;
}

export default function Feedback({
  message,
  onClose,
}: {
  message: FeedbackMessage | null;
  onClose?: () => void;
}) {
  if (!message) return null;
  return (
    <div className={`alert alert-${message.type}`} role="status">
      <span>{message.text}</span>
      {onClose && (
        <button
          type="button"
          className="alert-close"
          aria-label="Fechar aviso"
          onClick={onClose}
        >
          ×
        </button>
      )}
    </div>
  );
}
