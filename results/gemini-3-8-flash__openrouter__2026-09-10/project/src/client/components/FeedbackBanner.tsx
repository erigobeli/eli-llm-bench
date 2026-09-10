import React from 'react';

interface FeedbackBannerProps {
  type: 'success' | 'error';
  message: string;
  onDismiss?: () => void;
}

export const FeedbackBanner: React.FC<FeedbackBannerProps> = ({ type, message, onDismiss }) => {
  if (!message) return null;

  return (
    <div className={`feedback-banner ${type}`} role="alert">
      <span>{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            color: 'inherit',
            fontWeight: 700,
            padding: '0 4px',
          }}
          aria-label="Dispensar mensagem"
        >
          ✕
        </button>
      )}
    </div>
  );
};
