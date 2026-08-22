type NoticeTone = "success" | "info" | "warning" | "error";

const TONE_CLASSES: Record<NoticeTone, string> = {
  success: "border-accent-500 text-neutral-800",
  info: "border-info-500 text-neutral-800",
  warning: "border-warning-500 text-neutral-800",
  error: "border-danger-500 text-danger-500",
};

export function InlineNotice({ message, tone = "info" }: { message: string; tone?: NoticeTone }) {
  return <div role={tone === "error" ? "alert" : "status"} aria-live={tone === "error" ? "assertive" : "polite"} className={`rounded-lg border bg-white px-4 py-3 text-sm font-semibold ${TONE_CLASSES[tone]}`}>{message}</div>;
}
