export type NoticeTone = "success" | "info" | "warning" | "danger" | "error";
const tones: Record<NoticeTone, string> = {
  success: "border-status-success bg-status-success-surface text-status-success",
  info: "border-status-info bg-status-info-surface text-status-info",
  warning: "border-status-warning bg-status-warning-surface text-status-warning",
  danger: "border-status-danger bg-status-danger-surface text-status-danger",
  error: "border-status-danger bg-status-danger-surface text-status-danger",
};
export function InlineNotice({ message, tone = "info" }: { message: string; tone?: NoticeTone }) {
  const urgent = tone === "danger" || tone === "error";
  return <div role={urgent ? "alert" : "status"} aria-live={urgent ? "assertive" : "polite"} className={`rounded-medium border px-4 py-3 text-sm font-semibold ${tones[tone]}`}>{message}</div>;
}
