export function PriorityChip({ priority }: { priority: string }) {
  const normalized = priority.toLowerCase();
  const className = normalized === "high" ? "text-danger-500" : "text-neutral-700";

  return <span className={`text-sm font-semibold ${className}`}>{priority}</span>;
}
