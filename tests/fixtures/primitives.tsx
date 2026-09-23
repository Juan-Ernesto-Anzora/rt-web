import React, { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "../../src/index.css";
import { ThemeProvider } from "../../src/theme/ThemeProvider";
import { Button, IconButton } from "../../src/components/ui/Button";
import { Field } from "../../src/components/ui/Field";
import { Input, Textarea, Select, Checkbox } from "../../src/components/ui/Controls";
import { Dialog } from "../../src/components/ui/Dialog";
import { Badge } from "../../src/components/ui/Badge";
import { Skeleton } from "../../src/components/ui/Skeleton";
import { PageHeader } from "../../src/components/ui/PageHeader";
import { Separator } from "../../src/components/ui/Separator";
import { StatusBadge } from "../../src/components/requests/StatusBadge";
import { PriorityIndicator } from "../../src/components/requests/PriorityIndicator";
import { InlineNotice } from "../../src/components/common/InlineNotice";
import { EmptyState } from "../../src/components/common/EmptyState";
import { ErrorState } from "../../src/components/common/ErrorState";
import { LoadingRows } from "../../src/components/common/LoadingRows";
import { ConfirmDialog } from "../../src/components/admin/AdminDialog";

// Compile-time contract check; never mounted.
// @ts-expect-error Icon-only actions must supply their accessible label.
const unnamedIcon = <IconButton>+</IconButton>;
void unnamedIcon;

function Fixture() {
  const [activations, setActivations] = useState(0);
  const [submissions, setSubmissions] = useState(0);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(() => new URLSearchParams(window.location.search).has("initial-dialog"));
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const initialFocus = useRef<HTMLInputElement>(null);
  const activate = () => setActivations(n => n + 1);
  return <main id="fixture" style={{ background: "rgb(var(--rt-color-background))", color: "rgb(var(--rt-color-foreground))", minHeight: "100vh", padding: "24px" }}>
    <PageHeader title="Primitive verification" description="Permanent component behavior fixture" actions={<Button variant="ghost" onClick={activate}>Header action</Button>} />
    <Separator />
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button onClick={activate}>Activate</Button>
        <Button variant="secondary" size="sm" onClick={activate}>Secondary</Button>
        <Button variant="danger" onClick={activate}>Delete</Button>
        <Button disabled onClick={activate}>Disabled action</Button>
        <Button loading onClick={activate}>Save changes</Button>
        <IconButton label="Add item" variant="secondary" onClick={activate}>+</IconButton>
      </div>
      <output aria-label="Activations">{activations}</output>
      <form onSubmit={event => { event.preventDefault(); setSubmissions(n => n + 1); }} className="space-y-3">
        <Field label="Title" description="A short summary" required error={error}><Input name="title" /></Field>
        <Field id="description" label="Description" description="Optional context"><Textarea /></Field>
        <Field label="Workflow" required><Select defaultValue=""><option value="">Choose workflow</option><option value="it">IT support</option></Select></Field>
        <Field label="Accept terms" required><Checkbox /></Field>
        <Field label="Disabled field"><Input disabled value="Unavailable" readOnly /></Field>
        <Field label="Read-only field"><Input readOnly value="Reference" /></Field>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={activate}>Form action</Button>
          <Button type="submit">Submit form</Button>
          <Button variant="ghost" onClick={() => setError("Title needs more detail")}>Show field error</Button>
        </div>
      </form>
      <output aria-label="Submissions">{submissions}</output>
      <div className="flex flex-wrap gap-3">
        <Badge label="Information" tone="info" />
        <StatusBadge status="Waiting for approval" category="waiting" />
        <StatusBadge status="Resolved by team" category="closed" />
        {(["low", "normal", "high", "urgent"]).map(priority => <PriorityIndicator key={priority} priority={priority} />)}
      </div>
      <InlineNotice message="Changes saved" tone="success" />
      <InlineNotice message="Review required" tone="warning" />
      <InlineNotice message="Informational note" />
      <InlineNotice message="Action failed" tone="danger" />
      <EmptyState title="No records" body="Records will appear here." action={<Button variant="secondary" onClick={activate}>Create record</Button>} />
      <ErrorState message="Could not load records" onRetry={activate} />
      <LoadingRows rows={2} />
      <Skeleton className="w-32" />
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => setOpen(true)}>Open dialog</Button>
        <Button variant="secondary" onClick={() => { setConfirmBusy(false); setConfirm(true); }}>Open confirmation</Button>
      </div>
      <Dialog open={open} title="Edit record" description="Update the record fields." busy={busy} initialFocusRef={initialFocus} onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <Button variant="ghost" onClick={activate}>Dialog helper action</Button>
          <Field label="Record name"><Input ref={initialFocus} /></Field>
          <Field label="Busy operation"><Checkbox checked={busy} onChange={event => setBusy(event.target.checked)} /></Field>
          <Button variant="secondary" disabled={busy} onClick={() => setOpen(false)}>Close dialog</Button>
        </div>
      </Dialog>
      <ConfirmDialog open={confirm} title="Remove record" body="This removes the selected record." confirmLabel="Remove" busy={confirmBusy} onConfirm={() => setConfirmBusy(true)} onClose={() => setConfirm(false)} />
    </div>
  </main>;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><ThemeProvider><Fixture /></ThemeProvider></React.StrictMode>);
