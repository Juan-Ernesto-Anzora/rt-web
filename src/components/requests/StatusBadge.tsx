export function StatusBadge({ status, category }: { status: string; category?: string }) {
  const normalized = (category ?? status).toLowerCase();
  const className = normalized.includes("waiting")
    ? "bg-warning-500/15 text-neutral-900"
    : normalized.includes("closed")
      ? "bg-neutral-200 text-neutral-700"
      : normalized.includes("terminal")
      ? "bg-neutral-200 text-neutral-700"
      : "bg-primary-50 text-primary-700";

  return <span className={`rounded px-2 py-1 text-xs font-semibold ${className}`}>{status}</span>;
}
