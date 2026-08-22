type BadgeTone = "primary" | "neutral" | "warning" | "danger" | "success";

const CLASSES: Record<BadgeTone, string> = {
  primary: "bg-primary-50 text-primary-700",
  neutral: "bg-neutral-200 text-neutral-700",
  warning: "bg-warning-500/15 text-neutral-900",
  danger: "bg-danger-500/10 text-danger-500",
  success: "bg-accent-500/10 text-neutral-900",
};

export function StateBadge({ label, tone = "neutral" }: { label: string; tone?: BadgeTone }) {
  return <span className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${CLASSES[tone]}`}>{label}</span>;
}
