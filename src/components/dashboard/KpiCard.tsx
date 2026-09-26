import { Skeleton } from "../ui/Skeleton";

export function KpiCard({ label, value, loading }: { label: string; value: number | null; loading?: boolean }) {
  return (
    <div className="min-w-0 bg-surface px-4 py-3 text-foreground">
      <div className="text-xs font-semibold text-text-muted">{label}</div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-16" />
      ) : (
        <div className="mt-1 text-2xl font-bold tabular-nums">{value ?? "—"}</div>
      )}
    </div>
  );
}
