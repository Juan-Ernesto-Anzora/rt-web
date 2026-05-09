export function KpiCard({ label, value, loading }: { label: string; value: number; loading?: boolean }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold text-neutral-500">{label}</div>
      {loading ? (
        <div className="mt-3 h-7 w-16 rounded bg-neutral-200" />
      ) : (
        <div className="mt-1 text-2xl font-bold text-neutral-900">{value}</div>
      )}
    </div>
  );
}
