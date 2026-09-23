import { Skeleton } from "../ui/Skeleton";

export function LoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="divide-y divide-border rounded-medium border border-border bg-surface">
      <span className="sr-only">Loading data</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} aria-hidden="true" className="grid min-h-12 grid-cols-[80px_minmax(0,1fr)_80px] items-center gap-3 px-4 sm:grid-cols-[120px_minmax(0,1fr)_120px]">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      ))}
    </div>
  );
}
