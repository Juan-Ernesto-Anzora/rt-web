import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminStatus,
  AdminTransition,
  AdminWorkflow,
  AdminWorkflowDetail,
  createAdminStatus,
  createAdminTransition,
  getAdminWorkflow,
  listAdminWorkflows,
  readableApiError,
  updateAdminStatus,
  updateAdminTransition,
} from "../../api/adminWorkflows";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { LoadingRows } from "../../components/common/LoadingRows";

const STATUS_CATEGORIES = ["open", "in_progress", "waiting", "closed"];

type StatusDraft = {
  statusId?: string;
  name: string;
  category: string;
  isTerminal: boolean;
};

type TransitionDraft = {
  transitionId?: string;
  fromStatusId: string;
  toStatusId: string;
  guardRolesJson: string;
  guardPermsJson: string;
  autoRules: string;
};

type Notice = {
  tone: "success" | "error";
  message: string;
};

function statusToDraft(status?: AdminStatus): StatusDraft {
  return {
    statusId: status?.statusId,
    name: status?.name ?? "",
    category: status?.category ?? "open",
    isTerminal: Boolean(status?.isTerminal),
  };
}

function transitionToDraft(transition?: AdminTransition): TransitionDraft {
  return {
    transitionId: transition?.transitionId,
    fromStatusId: transition?.fromStatusId ?? "",
    toStatusId: transition?.toStatusId ?? "",
    guardRolesJson: transition?.guardRolesJson ?? "",
    guardPermsJson: transition?.guardPermsJson ?? "",
    autoRules: transition?.autoRules ?? "",
  };
}

function cleanOptionalJson(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function validationForStatuses(statuses: StatusDraft[]) {
  const messages: string[] = [];
  const names = statuses.map((status) => status.name.trim().toLowerCase()).filter(Boolean);
  const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
  const uniqueDuplicates = [...new Set(duplicates)];

  if (uniqueDuplicates.length) {
    messages.push(`Duplicate status names: ${uniqueDuplicates.join(", ")}.`);
  }
  if (!statuses.some((status) => status.category === "open")) {
    messages.push("At least one Open status is required.");
  }
  if (!statuses.some((status) => status.category === "closed" || status.isTerminal)) {
    messages.push("At least one Closed or terminal status is required.");
  }

  return messages;
}

function validationForTransition(transition: TransitionDraft, transitions: AdminTransition[]) {
  const messages: string[] = [];
  if (!transition.fromStatusId) messages.push("From status is required.");
  if (!transition.toStatusId) messages.push("To status is required.");
  if (transition.fromStatusId && transition.fromStatusId === transition.toStatusId) {
    messages.push("From and To statuses must be different.");
  }

  const duplicate = transitions.some(
    (existing) =>
      existing.transitionId !== transition.transitionId &&
      existing.fromStatusId === transition.fromStatusId &&
      existing.toStatusId === transition.toStatusId,
  );
  if (duplicate) messages.push("This transition already exists.");
  return messages;
}

function statusLabel(statuses: AdminStatus[], statusId: string) {
  const status = statuses.find((item) => item.statusId === statusId);
  return status ? `${status.name} (${status.category})` : "Unknown status";
}

function SectionNotice({ notice }: { notice: Notice | null }) {
  if (!notice) return null;
  const classes =
    notice.tone === "success"
      ? "border-accent-500 text-accent-600"
      : "border-danger-500 text-danger-500";
  return <div className={`rounded-lg border bg-white px-3 py-2 text-sm font-semibold ${classes}`}>{notice.message}</div>;
}

function WorkflowList({
  workflows,
  selectedFlowId,
  onSelect,
}: {
  workflows: AdminWorkflow[];
  selectedFlowId?: string;
  onSelect: (workflow: AdminWorkflow) => void;
}) {
  if (!workflows.length) {
    return <EmptyState title="No workflows found." body="Create workflows through the admin API before editing statuses." />;
  }

  return (
    <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
      {workflows.map((workflow) => {
        const active = workflow.flowId === selectedFlowId;
        return (
          <button
            key={workflow.flowId}
            type="button"
            onClick={() => onSelect(workflow)}
            className={`block w-full px-4 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600 ${
              active ? "bg-primary-50" : "hover:bg-neutral-50"
            }`}
          >
            <span className="block text-sm font-semibold text-neutral-900">{workflow.name}</span>
            <span className="mt-1 block truncate text-xs text-neutral-600">{workflow.description || "No description"}</span>
          </button>
        );
      })}
    </div>
  );
}

function StatusEditor({
  flowId,
  detail,
  onSaved,
}: {
  flowId: string;
  detail: AdminWorkflowDetail;
  onSaved: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<StatusDraft>(statusToDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const statusDrafts = useMemo(
    () => detail.statuses.map((status) => (status.statusId === editingId ? draft : statusToDraft(status))),
    [detail.statuses, draft, editingId],
  );
  const validationMessages = validationForStatuses(statusDrafts);

  function editStatus(status: AdminStatus) {
    setEditingId(status.statusId);
    setDraft(statusToDraft(status));
    setNotice(null);
  }

  function resetDraft() {
    setEditingId(null);
    setDraft(statusToDraft());
  }

  async function saveStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const messages = validationForStatuses(statusDrafts);
    if (!draft.name.trim()) {
      setNotice({ tone: "error", message: "Status name is required." });
      return;
    }
    if (messages.length) {
      setNotice({ tone: "error", message: messages.join(" ") });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: draft.name.trim(),
        category: draft.category,
        is_terminal: draft.isTerminal,
      };
      if (editingId) {
        await updateAdminStatus(flowId, editingId, payload);
      } else {
        await createAdminStatus(flowId, payload);
      }
      await onSaved();
      setNotice({ tone: "success", message: editingId ? "Status updated." : "Status created." });
      resetDraft();
    } catch (error) {
      setNotice({ tone: "error", message: readableApiError(error, "Could not save status.") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-neutral-900">Status editor</h3>
        <p className="mt-1 text-sm text-neutral-600">Keep one Open status and one Closed or terminal status for the workflow.</p>
      </div>

      {validationMessages.length > 0 && (
        <div className="rounded-lg border border-danger-500 bg-white px-3 py-2 text-sm font-semibold text-danger-500">
          {validationMessages.join(" ")}
        </div>
      )}
      <SectionNotice notice={notice} />

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Terminal</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {detail.statuses.map((status) => (
              <tr key={status.statusId} className="h-12 hover:bg-neutral-50">
                <td className="px-3 py-2 font-semibold text-neutral-900">{status.name}</td>
                <td className="px-3 py-2 text-neutral-700">{status.category}</td>
                <td className="px-3 py-2 text-neutral-700">{status.isTerminal ? "Yes" : "No"}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => editStatus(status)}
                    className="rounded-lg border border-neutral-300 px-3 py-2 font-semibold text-neutral-700 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={saveStatus} className="grid gap-3 rounded-lg border border-neutral-200 bg-white p-4 lg:grid-cols-[1fr_180px_130px_auto]">
        <label className="text-sm font-semibold text-neutral-700">
          Name <span className="text-danger-500">*</span>
          <input
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            className="mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
            placeholder="Waiting for customer"
          />
        </label>
        <label className="text-sm font-semibold text-neutral-700">
          Category <span className="text-danger-500">*</span>
          <select
            value={draft.category}
            onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
            className="mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
          >
            {STATUS_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 pt-6 text-sm font-semibold text-neutral-700">
          <input
            type="checkbox"
            checked={draft.isTerminal}
            onChange={(event) => setDraft((current) => ({ ...current, isTerminal: event.target.checked }))}
            className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
          />
          Terminal
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" disabled={saving} className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? "Saving" : editingId ? "Save" : "Add"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetDraft}
              className="h-10 rounded-lg border border-neutral-300 px-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

function TransitionEditor({
  flowId,
  detail,
  onSaved,
}: {
  flowId: string;
  detail: AdminWorkflowDetail;
  onSaved: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<TransitionDraft>(transitionToDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  function editTransition(transition: AdminTransition) {
    setEditingId(transition.transitionId);
    setDraft(transitionToDraft(transition));
    setNotice(null);
  }

  function resetDraft() {
    setEditingId(null);
    setDraft(transitionToDraft());
  }

  async function saveTransition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const messages = validationForTransition(draft, detail.transitions);
    if (messages.length) {
      setNotice({ tone: "error", message: messages.join(" ") });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        from_status_id: draft.fromStatusId,
        to_status_id: draft.toStatusId,
        guard_roles_json: cleanOptionalJson(draft.guardRolesJson),
        guard_perms_json: cleanOptionalJson(draft.guardPermsJson),
        auto_rules: cleanOptionalJson(draft.autoRules),
      };
      if (editingId) {
        await updateAdminTransition(flowId, editingId, payload);
      } else {
        await createAdminTransition(flowId, payload);
      }
      await onSaved();
      setNotice({ tone: "success", message: editingId ? "Transition updated." : "Transition created." });
      resetDraft();
    } catch (error) {
      setNotice({ tone: "error", message: readableApiError(error, "Could not save transition.") });
    } finally {
      setSaving(false);
    }
  }

  const canEditTransitions = detail.statuses.length >= 2;

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-neutral-900">Transition editor</h3>
        <p className="mt-1 text-sm text-neutral-600">Connect valid status moves, including close and reopen paths.</p>
      </div>
      <SectionNotice notice={notice} />

      {detail.transitions.length === 0 ? (
        <EmptyState title="No transitions configured." body="Add a transition once the workflow has at least two statuses." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-3 py-2">From</th>
                <th className="px-3 py-2">To</th>
                <th className="px-3 py-2">Guards</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {detail.transitions.map((transition) => (
                <tr key={transition.transitionId} className="h-12 hover:bg-neutral-50">
                  <td className="px-3 py-2 font-semibold text-neutral-900">
                    {statusLabel(detail.statuses, transition.fromStatusId)}
                  </td>
                  <td className="px-3 py-2 text-neutral-700">{statusLabel(detail.statuses, transition.toStatusId)}</td>
                  <td className="px-3 py-2 text-neutral-700">
                    {transition.guardRolesJson || transition.guardPermsJson ? "Configured" : "None"}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => editTransition(transition)}
                      className="rounded-lg border border-neutral-300 px-3 py-2 font-semibold text-neutral-700 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={saveTransition} className="grid gap-3 rounded-lg border border-neutral-200 bg-white p-4 lg:grid-cols-2">
        <label className="text-sm font-semibold text-neutral-700">
          From status <span className="text-danger-500">*</span>
          <select
            value={draft.fromStatusId}
            onChange={(event) => setDraft((current) => ({ ...current, fromStatusId: event.target.value }))}
            disabled={!canEditTransitions}
            className="mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600 disabled:bg-neutral-100"
          >
            <option value="">Select status</option>
            {detail.statuses.map((status) => (
              <option key={status.statusId} value={status.statusId}>
                {status.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-neutral-700">
          To status <span className="text-danger-500">*</span>
          <select
            value={draft.toStatusId}
            onChange={(event) => setDraft((current) => ({ ...current, toStatusId: event.target.value }))}
            disabled={!canEditTransitions}
            className="mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600 disabled:bg-neutral-100"
          >
            <option value="">Select status</option>
            {detail.statuses.map((status) => (
              <option key={status.statusId} value={status.statusId}>
                {status.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-neutral-700">
          Guard roles JSON
          <input
            value={draft.guardRolesJson}
            onChange={(event) => setDraft((current) => ({ ...current, guardRolesJson: event.target.value }))}
            className="mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
            placeholder="[]"
          />
        </label>
        <label className="text-sm font-semibold text-neutral-700">
          Guard permissions JSON
          <input
            value={draft.guardPermsJson}
            onChange={(event) => setDraft((current) => ({ ...current, guardPermsJson: event.target.value }))}
            className="mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
            placeholder="[]"
          />
        </label>
        <label className="text-sm font-semibold text-neutral-700 lg:col-span-2">
          Auto rules JSON
          <input
            value={draft.autoRules}
            onChange={(event) => setDraft((current) => ({ ...current, autoRules: event.target.value }))}
            className="mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
            placeholder="{}"
          />
        </label>
        <div className="flex gap-2 lg:col-span-2">
          <button
            type="submit"
            disabled={saving || !canEditTransitions}
            className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving" : editingId ? "Save transition" : "Add transition"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetDraft}
              className="h-10 rounded-lg border border-neutral-300 px-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

export default function WorkflowAdminPage() {
  const [workflows, setWorkflows] = useState<AdminWorkflow[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string>("");
  const [detail, setDetail] = useState<AdminWorkflowDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [listError, setListError] = useState("");
  const [detailError, setDetailError] = useState("");

  const loadWorkflows = useCallback(async () => {
    setLoadingList(true);
    setListError("");
    try {
      const nextWorkflows = await listAdminWorkflows();
      setWorkflows(nextWorkflows);
      setSelectedFlowId((current) => current || nextWorkflows[0]?.flowId || "");
    } catch (error) {
      setListError(readableApiError(error, "Could not load workflows."));
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadDetail = useCallback(async (flowId = selectedFlowId) => {
    if (!flowId) {
      setDetail(null);
      return;
    }
    setLoadingDetail(true);
    setDetailError("");
    try {
      setDetail(await getAdminWorkflow(flowId));
    } catch (error) {
      setDetailError(readableApiError(error, "Could not load workflow detail."));
    } finally {
      setLoadingDetail(false);
    }
  }, [selectedFlowId]);

  useEffect(() => {
    void loadWorkflows();
  }, [loadWorkflows]);

  useEffect(() => {
    void loadDetail(selectedFlowId);
  }, [loadDetail, selectedFlowId]);

  const selectedWorkflow = workflows.find((workflow) => workflow.flowId === selectedFlowId);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Workflow configuration</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Review tenant workflows, edit statuses, and manage allowed transitions for the request lifecycle.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-neutral-900">Workflows</h3>
            <button
              type="button"
              onClick={() => void loadWorkflows()}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
            >
              Refresh
            </button>
          </div>
          {loadingList && <LoadingRows rows={3} />}
          {!loadingList && listError && <ErrorState message={listError} onRetry={() => void loadWorkflows()} />}
          {!loadingList && !listError && (
            <WorkflowList
              workflows={workflows}
              selectedFlowId={selectedFlowId}
              onSelect={(workflow) => setSelectedFlowId(workflow.flowId)}
            />
          )}
        </section>

        <section className="space-y-6">
          {!selectedWorkflow && !loadingList && (
            <EmptyState title="Select a workflow." body="Choose a workflow from the list to edit statuses and transitions." />
          )}
          {selectedWorkflow && (
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="text-sm font-semibold text-neutral-500">Workflow detail</div>
              <h3 className="mt-1 text-xl font-semibold text-neutral-900">{selectedWorkflow.name}</h3>
              <p className="mt-1 text-sm text-neutral-600">{selectedWorkflow.description || "No description"}</p>
            </div>
          )}
          {loadingDetail && <LoadingRows rows={4} />}
          {!loadingDetail && detailError && <ErrorState message={detailError} onRetry={() => void loadDetail()} />}
          {!loadingDetail && detail && !detailError && (
            <>
              <StatusEditor flowId={detail.flowId} detail={detail} onSaved={() => loadDetail(detail.flowId)} />
              <TransitionEditor flowId={detail.flowId} detail={detail} onSaved={() => loadDetail(detail.flowId)} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
