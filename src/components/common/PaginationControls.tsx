import { Button } from "../ui/Button";

export function PaginationControls({ page, pageSize, count, label, onPageChange }: { page: number; pageSize: number; count: number; label: string; onPageChange(page: number): void }) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  return <nav aria-label={`${label} pagination`} className="flex flex-wrap items-center justify-between gap-3 text-sm text-foreground"><span aria-live="polite">Page {page} of {totalPages} · {count} {label}</span><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label={`Previous ${label} page`}>Previous</Button><Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label={`Next ${label} page`}>Next</Button></div></nav>;
}
