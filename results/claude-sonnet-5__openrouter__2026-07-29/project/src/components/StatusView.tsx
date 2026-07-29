interface StatusViewProps {
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyMessage?: string;
  loadingMessage?: string;
}

export function StatusView({
  loading,
  error,
  isEmpty,
  emptyMessage = "Nenhum registro encontrado.",
  loadingMessage = "Carregando..."
}: StatusViewProps) {
  if (loading) {
    return (
      <div className="status-box status-loading" role="status">
        {loadingMessage}
      </div>
    );
  }
  if (error) {
    return (
      <div className="status-box status-error" role="alert">
        {error}
      </div>
    );
  }
  if (isEmpty) {
    return <div className="status-box status-empty">{emptyMessage}</div>;
  }
  return null;
}
