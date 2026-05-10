export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-danger-500 bg-white px-4 py-3 text-sm">
      <div className="font-semibold text-danger-500">{message}</div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-neutral-300 px-3 py-2 font-semibold text-neutral-700 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
        >
          Refresh
        </button>
      )}
    </div>
  );
}
