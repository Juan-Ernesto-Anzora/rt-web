import type { ReactNode } from "react";

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <div className="rounded-medium border border-dashed border-border bg-surface p-6 text-sm text-foreground">
    <div className="font-semibold">{title}</div>
    <div className="mt-1 text-text-muted">{body}</div>
    {action ? <div className="mt-3">{action}</div> : null}
  </div>;
}
