import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { focusStyle } from "./styles";

export type DialogProps = {
  open: boolean; title: string; description?: string; children: ReactNode;
  onClose(): void; busy?: boolean; initialFocusRef?: RefObject<HTMLElement>;
};

export function Dialog({ open, title, description, children, onClose, busy = false, initialFocusRef }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    let frame = 0;
    if (open) {
      if (!dialog.open) {
        opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        dialog.showModal();
      }
      frame = requestAnimationFrame(() => {
        if (!dialog.open) return;
        const target = initialFocusRef?.current;
        if (target && dialog.contains(target)) target.focus();
        else if (!dialog.contains(document.activeElement)) dialog.focus();
      });
    }
    if (!open && dialog.open) dialog.close();
    return () => cancelAnimationFrame(frame);
  }, [open, initialFocusRef]);

  useEffect(() => () => { if (opener.current?.isConnected) opener.current.focus(); }, []);

  return <dialog ref={ref} tabIndex={-1} aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} aria-busy={busy || undefined}
    onCancel={event => { event.preventDefault(); if (!busy) ref.current?.close(); }}
    onClose={() => {
      if (ref.current?.open) return;
      if (opener.current?.isConnected) opener.current.focus();
      opener.current = null;
      onClose();
    }}
    className={`m-auto max-h-[calc(100vh-2rem)] w-[min(560px,calc(100%-2rem))] overflow-y-auto rounded-medium border border-border bg-surface p-0 text-foreground shadow-lg backdrop:bg-foreground/40 ${focusStyle}`}>
    <div className="border-b border-border px-5 py-4">
      <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
      {description ? <p id={descriptionId} className="mt-1 text-sm text-text-muted">{description}</p> : null}
    </div>
    <div className="p-5">{children}</div>
  </dialog>;
}
