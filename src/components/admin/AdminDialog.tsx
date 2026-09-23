import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";

// Compatibility export: existing admin consumers keep their imports and props.
export { Dialog as AdminDialog } from "../ui/Dialog";

type ConfirmDialogProps = {
  open: boolean; title: string; body: string; confirmLabel: string;
  busy?: boolean; danger?: boolean; onConfirm(): void; onClose(): void;
};

export function ConfirmDialog({ open, title, body, confirmLabel, busy = false, danger = true, onConfirm, onClose }: ConfirmDialogProps) {
  return <Dialog open={open} title={title} description={body} busy={busy} onClose={onClose}>
    <div className="flex justify-end gap-2">
      <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
      <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={busy}>{busy ? "Saving..." : confirmLabel}</Button>
    </div>
  </Dialog>;
}
