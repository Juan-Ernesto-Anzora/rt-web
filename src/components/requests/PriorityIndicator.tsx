export type Priority = "low" | "normal" | "high" | "urgent";

export function PriorityIndicator({ priority }: { priority: string }) {
  const normalized = priority.toLowerCase();
  const known = ["low", "normal", "high", "urgent"].includes(normalized);
  // Preserve unknown server text without assigning an invented domain meaning.
  const className = known && (normalized === "high" || normalized === "urgent") ? "bg-status-danger-surface text-status-danger" : "bg-surface text-foreground";
  return <span className={`rounded-small px-1 text-sm font-semibold ${className}`}>Priority: {priority}</span>;
}
