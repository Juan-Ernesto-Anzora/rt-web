export function LoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
      <span className="sr-only">Loading data</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} aria-hidden="true" className="grid min-h-12 grid-cols-[80px_minmax(0,1fr)_80px] items-center gap-3 px-4 sm:grid-cols-[120px_minmax(0,1fr)_120px]">
          <div className="h-3 rounded bg-neutral-200" />
          <div className="h-3 rounded bg-neutral-200" />
          <div className="h-3 rounded bg-neutral-200" />
        </div>
      ))}
    </div>
  );
}
