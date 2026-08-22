import { StateBadge } from "../common/StateBadge";

export function StatusBadge({ status, category }: { status: string; category?: string }) {
  const normalized = (category ?? status).toLowerCase();
  const tone = normalized.includes("waiting") ? "warning" : normalized.includes("closed") || normalized.includes("terminal") ? "neutral" : "primary";
  return <StateBadge label={status} tone={tone} />;
}
