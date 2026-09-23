import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return <header className="flex flex-wrap items-start justify-between gap-4 text-foreground">
    <div className="min-w-0"><h1 className="break-words text-2xl font-semibold">{title}</h1>{description ? <p className="mt-1 text-sm text-text-muted">{description}</p> : null}</div>
    {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
  </header>;
}
