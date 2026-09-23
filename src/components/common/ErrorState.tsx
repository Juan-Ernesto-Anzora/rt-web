import { Button } from "../ui/Button";

export function ErrorState({ message, onRetry, retryLabel = "Refresh" }: { message: string; onRetry?: () => void; retryLabel?: string }) {
  return <div role="alert" aria-live="assertive" className="flex flex-wrap items-center justify-between gap-3 rounded-medium border border-status-danger bg-status-danger-surface px-4 py-3 text-sm">
    <div className="font-semibold text-status-danger">{message}</div>
    {onRetry ? <Button variant="secondary" size="sm" onClick={onRetry}>{retryLabel}</Button> : null}
  </div>;
}
