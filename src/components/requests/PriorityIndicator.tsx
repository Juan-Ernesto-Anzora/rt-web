export type Priority = "low" | "normal" | "high" | "urgent";

export function PriorityIndicator({ priority, concise = false }: { priority: string; concise?: boolean }) {
  const normalized = priority.toLowerCase();
  const known = ["low", "normal", "high", "urgent"].includes(normalized);
  const emphasized = known && (normalized === "high" || normalized === "urgent");
  if (concise) {
    const label = known ? normalized[0].toUpperCase() + normalized.slice(1) : priority;
    return <span className={`text-sm font-medium ${emphasized ? "text-status-danger" : "text-foreground"}`}>{label}</span>;
  }
  // Preserve unknown server text without assigning an invented domain meaning.
  const className = emphasized ? "bg-status-danger-surface text-status-danger" : "bg-surface text-foreground";
  return <span className={`rounded-small px-1 text-sm font-semibold ${className}`}>Priority: {priority}</span>;
}
