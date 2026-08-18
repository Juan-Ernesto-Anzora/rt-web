import { useEffect, useId, useRef } from "react";

type AdminDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose(): void;
};

export function AdminDialog({ open, title, description, children, onClose }: AdminDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      className="m-auto w-[min(560px,calc(100%-2rem))] rounded-lg border border-neutral-200 bg-white p-0 shadow-lg backdrop:bg-neutral-900/40"
    >
      <div className="border-b border-neutral-200 px-5 py-4">
        <h2 id={titleId} className="text-lg font-semibold text-neutral-900">{title}</h2>
        {description ? <p id={descriptionId} className="mt-1 text-sm text-neutral-600">{description}</p> : null}
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  busy?: boolean;
  danger?: boolean;
  onConfirm(): void;
  onClose(): void;
};

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  busy = false,
  danger = true,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <AdminDialog open={open} title={title} description={body} onClose={onClose}>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60">
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={`rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 ${danger ? "bg-danger-500" : "bg-primary-600 hover:bg-primary-700"}`}
        >
          {busy ? "Saving..." : confirmLabel}
        </button>
      </div>
    </AdminDialog>
  );
}
