import { FocusEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { createRequest, CreateRequestPayload, FlowStatus, listFlowStatuses, listRequestFlows, type RequestFlow } from "../api/requestCreate";
import { listTenantUsers, type TenantUser } from "../api/requestDetail";

type FormValues = {
  title: string;
  description: string;
  flow_id: string;
  status_id: string;
  priority: string;
  assignee_id: string;
  requester_id: string;
  tags: string;
  due_at: string;
};

type FieldErrors = Partial<Record<keyof FormValues, string>>;

type ApiErrorDetail = {
  field?: keyof FormValues | string;
  message?: string;
};

type ApiErrorBody = {
  code?: string;
  message?: string;
  details?: ApiErrorDetail[];
};

const INITIAL_VALUES: FormValues = {
  title: "",
  description: "",
  flow_id: "",
  status_id: "",
  priority: "normal",
  assignee_id: "",
  requester_id: "",
  tags: "",
  due_at: "",
};

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  description: "Description",
  flow_id: "Flow",
  status_id: "Open status",
  requester_id: "Requester",
  assignee_id: "Assignee",
  due_at: "Due date",
  priority: "Priority",
  tags: "Tags",
};

function validate(values: FormValues) {
  const errors: FieldErrors = {};
  if (!values.title.trim()) errors.title = "Title is required.";
  if (!values.description.trim()) errors.description = "Description is required.";
  if (!values.flow_id.trim()) errors.flow_id = "Flow is required.";
  if (!values.status_id.trim()) errors.status_id = "Select a flow with an Open status before submitting.";
  if (!values.requester_id.trim()) errors.requester_id = "Requester is required.";
  return errors;
}

function toPayload(values: FormValues): CreateRequestPayload {
  const tags = values.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return {
    title: values.title.trim(),
    description: values.description.trim(),
    flow_id: values.flow_id.trim(),
    status_id: values.status_id.trim(),
    priority: values.priority || undefined,
    requester_id: values.requester_id.trim(),
    assignee_id: values.assignee_id.trim() || null,
    tags,
    due_at: values.due_at || undefined,
  };
}

function detailMessage(detail: ApiErrorDetail) {
  const field = detail.field ? FIELD_LABELS[detail.field] ?? detail.field : null;
  const message = detail.message ?? "Invalid value.";
  return field ? `${field}: ${message}` : message;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="mt-1 text-sm font-semibold text-danger-500">{message}</div>;
}

function TextInput({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  helper,
  required,
  type = "text",
}: {
  id: keyof FormValues;
  label: string;
  value: string;
  onChange(value: string): void;
  onBlur(event: FocusEvent<HTMLInputElement>): void;
  error?: string;
  helper?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-neutral-700" htmlFor={id}>
        {label}
        {required && <span className="text-danger-500"> *</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : helper ? `${id}-helper` : undefined}
        className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm text-neutral-900 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-50"
      />
      {helper && !error && (
        <div id={`${id}-helper`} className="mt-1 text-xs text-neutral-600">
          {helper}
        </div>
      )}
      {error && (
        <div id={`${id}-error`}>
          <FieldError message={error} />
        </div>
      )}
    </div>
  );
}

export default function RequestCreatePage() {
  const navigate = useNavigate();
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [touched, setTouched] = useState<Partial<Record<keyof FormValues, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [formDetails, setFormDetails] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<FlowStatus[]>([]);
  const [statusesLoading, setStatusesLoading] = useState(false);
  const [statusesError, setStatusesError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [flows, setFlows] = useState<RequestFlow[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(true);
  const [lookupsError, setLookupsError] = useState<string | null>(null);

  const validationErrors = useMemo(() => validate(values), [values]);
  const openStatus = statuses.find((status) => status.isOpen);

  useEffect(() => {
    let cancelled = false;
    async function loadLookups() {
      setLookupsLoading(true); setLookupsError(null);
      try {
        const [nextFlows, nextUsers] = await Promise.all([listRequestFlows(), listTenantUsers()]);
        if (!cancelled) { setFlows(nextFlows); setUsers(nextUsers); }
      } catch {
        if (!cancelled) { setFlows([]); setUsers([]); setLookupsError("Could not load flow and user options from the API."); }
      } finally { if (!cancelled) setLookupsLoading(false); }
    }
    void loadLookups();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const flowId = values.flow_id.trim();

    if (!flowId) {
      setStatuses([]);
      setStatusesError(null);
      setValue("status_id", "");
      return;
    }

    async function loadStatuses() {
      setStatusesLoading(true);
      setStatusesError(null);
      try {
        const nextStatuses = await listFlowStatuses(flowId);
        if (cancelled) return;
        setStatuses(nextStatuses);
        const nextOpenStatus = nextStatuses.find((status) => status.isOpen);
        setValue("status_id", nextOpenStatus?.id ?? "");
        if (!nextOpenStatus) {
          setStatusesError("This flow did not return an Open status.");
        }
      } catch {
        if (cancelled) return;
        setStatuses([]);
        setValue("status_id", "");
        setStatusesError("Could not load statuses for this flow.");
      } finally {
        if (!cancelled) setStatusesLoading(false);
      }
    }

    loadStatuses();

    return () => {
      cancelled = true;
    };
  }, [values.flow_id]);

  function shownError(field: keyof FormValues) {
    return fieldErrors[field] ?? ((submitted || touched[field]) ? validationErrors[field] : undefined);
  }

  function setValue(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFormDetails([]);
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function markTouched(event: FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const field = event.currentTarget.id as keyof FormValues;
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function applyApiErrors(error: AxiosError<ApiErrorBody>) {
    const response = error.response?.data;
    const nextFieldErrors: FieldErrors = {};

    response?.details?.forEach((detail) => {
      if (detail.field && detail.field in values && detail.message) {
        nextFieldErrors[detail.field as keyof FormValues] = detail.message;
      }
    });

    setFieldErrors(nextFieldErrors);
    setFormDetails(response?.details?.map(detailMessage) ?? []);
    setFormError(response?.message ?? "Could not create the request. Please review the form and try again.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setFormError(null);
    setFormDetails([]);
    setFieldErrors({});

    if (Object.keys(validationErrors).length > 0) return;

    setPosting(true);
    try {
      const created = await createRequest(toPayload(values));
      if (!created.requestId) {
        setFormError("The request was created, but the API did not return request_id for detail navigation.");
        return;
      }
      navigate(`/requests/${encodeURIComponent(created.requestId)}`);
    } catch (requestError) {
      applyApiErrors(requestError as AxiosError<ApiErrorBody>);
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="legacy-page">
      <header className="border-b border-neutral-200 bg-white px-6 py-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-3 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
        >
          Back
        </button>
        <h1 className="text-2xl font-semibold text-neutral-900">New Request</h1>
        <p className="mt-1 text-sm text-neutral-600">Create a request for intake, assignment, and follow-up.</p>
      </header>

      <div className="mx-auto max-w-5xl p-6">
        <form onSubmit={handleSubmit} className="card space-y-5 p-5">
          {formError && (
            <div className="rounded-lg border border-danger-500 bg-white px-4 py-3 text-sm font-semibold text-danger-500">
              {formError}
              {formDetails.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {formDetails.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <TextInput
            id="title"
            label="Title"
            value={values.title}
            onChange={(value) => setValue("title", value)}
            onBlur={markTouched}
            error={shownError("title")}
            helper="Use a short, searchable request title."
            required
          />

          <div>
            <label className="mb-1 block text-sm font-semibold text-neutral-700" htmlFor="description">
              Description <span className="text-danger-500">*</span>
            </label>
            <textarea
              id="description"
              value={values.description}
              onChange={(event) => setValue("description", event.target.value)}
              onBlur={markTouched}
              aria-invalid={Boolean(shownError("description"))}
              aria-describedby={shownError("description") ? "description-error" : "description-helper"}
              className="min-h-32 w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-50"
            />
            {!shownError("description") && (
              <div id="description-helper" className="mt-1 text-xs text-neutral-600">
                Include context, impact, and what outcome is needed.
              </div>
            )}
            {shownError("description") && (
              <div id="description-error">
                <FieldError message={shownError("description")} />
              </div>
            )}
          </div>

          {lookupsError ? <div role="alert" className="rounded-lg border border-danger-500 bg-white px-4 py-3 text-sm font-semibold text-danger-500">{lookupsError}</div> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-neutral-700" htmlFor="flow_id">Flow <span className="text-danger-500">*</span><select id="flow_id" value={values.flow_id} disabled={lookupsLoading || posting} onChange={(event) => setValue("flow_id", event.target.value)} onBlur={markTouched} aria-invalid={Boolean(shownError("flow_id"))} className="mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3 font-normal focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-50"><option value="">{lookupsLoading ? "Loading flows..." : "Select flow"}</option>{flows.map((flow) => <option key={flow.id} value={flow.id}>{flow.name}</option>)}</select>{shownError("flow_id") ? <FieldError message={shownError("flow_id")} /> : <span className="mt-1 block text-xs font-normal text-neutral-600">The Open status loads from the selected workflow.</span>}</label>

            <div>
              <label className="mb-1 block text-sm font-semibold text-neutral-700" htmlFor="priority">
                Priority
              </label>
              <select
                id="priority"
                value={values.priority}
                onChange={(event) => setValue("priority", event.target.value)}
                onBlur={markTouched}
                className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm text-neutral-900 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-50"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
            <div className="font-semibold text-neutral-800">Open status</div>
            {statusesLoading && <div className="mt-1 text-neutral-600">Loading statuses for selected flow...</div>}
            {!statusesLoading && openStatus && (
              <div className="mt-1">
                {openStatus.name}
              </div>
            )}
            {!statusesLoading && !openStatus && (
              <div className="mt-1 text-danger-500">{statusesError ?? shownError("status_id")}</div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-neutral-700" htmlFor="requester_id">Requester <span className="text-danger-500">*</span><select id="requester_id" value={values.requester_id} disabled={lookupsLoading || posting} onChange={(event) => setValue("requester_id", event.target.value)} onBlur={markTouched} aria-invalid={Boolean(shownError("requester_id"))} className="mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3 font-normal"><option value="">{lookupsLoading ? "Loading users..." : "Select requester"}</option>{users.map((user) => <option key={user.id} value={user.id}>{user.displayName ?? user.email ?? user.label}</option>)}</select>{shownError("requester_id") ? <FieldError message={shownError("requester_id")} /> : null}</label>
            <label className="text-sm font-semibold text-neutral-700" htmlFor="assignee_id">Assignee<select id="assignee_id" value={values.assignee_id} disabled={lookupsLoading || posting} onChange={(event) => setValue("assignee_id", event.target.value)} onBlur={markTouched} className="mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3 font-normal"><option value="">Unassigned</option>{users.map((user) => <option key={user.id} value={user.id}>{user.displayName ?? user.email ?? user.label}</option>)}</select><span className="mt-1 block text-xs font-normal text-neutral-600">Unassigned sends assignee_id as null.</span></label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <TextInput
              id="tags"
              label="Tags"
              value={values.tags}
              onChange={(value) => setValue("tags", value)}
              onBlur={markTouched}
              helper="Separate tags with commas."
            />
            <TextInput
              id="due_at"
              label="Due date"
              type="date"
              value={values.due_at}
              onChange={(value) => setValue("due_at", value)}
              onBlur={markTouched}
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-neutral-200 pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
              disabled={posting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={posting || lookupsLoading || Boolean(lookupsError)}>
              {posting ? "Creating" : "Create Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
