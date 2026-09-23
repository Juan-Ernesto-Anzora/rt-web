export type BadgeTone = "primary" | "neutral" | "info" | "success" | "warning" | "danger";
const tones: Record<BadgeTone, string> = {
  primary: "bg-surface-active text-foreground",
  neutral: "bg-surface-hover text-foreground",
  info: "bg-status-info-surface text-status-info",
  success: "bg-status-success-surface text-status-success",
  warning: "bg-status-warning-surface text-status-warning",
  danger: "bg-status-danger-surface text-status-danger",
};
export function Badge({ label, tone = "neutral" }: { label: string; tone?: BadgeTone }) {
  return <span className={`inline-flex max-w-full break-words rounded-small px-2 py-1 text-xs font-semibold ${tones[tone]}`}>{label}</span>;
}
