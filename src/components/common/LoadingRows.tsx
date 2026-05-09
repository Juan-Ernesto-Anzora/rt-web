export function LoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="grid min-h-12 grid-cols-[120px_1fr_100px_100px_132px_132px_110px] items-center gap-3 px-4">
          <div className="h-3 rounded bg-neutral-200" />
          <div className="h-3 rounded bg-neutral-200" />
          <div className="h-3 rounded bg-neutral-200" />
          <div className="h-3 rounded bg-neutral-200" />
          <div className="h-3 rounded bg-neutral-200" />
          <div className="h-3 rounded bg-neutral-200" />
          <div className="h-3 rounded bg-neutral-200" />
        </div>
      ))}
    </div>
  );
}
