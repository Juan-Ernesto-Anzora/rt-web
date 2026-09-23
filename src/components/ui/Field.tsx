import { createContext, useContext, useId, type AriaAttributes, type ReactNode } from "react";

type FieldContextValue = { id: string; required: boolean; invalid: boolean; describedBy?: string };
const FieldContext = createContext<FieldContextValue | null>(null);

export function Field({ id: providedId, label, description, error, required = false, children }: {
  id?: string; label: string; description?: string; error?: string; required?: boolean; children: ReactNode;
}) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const describedBy = [description ? `${id}-help` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
  return <FieldContext.Provider value={{ id, required, invalid: Boolean(error), describedBy }}>
    <div className="space-y-1 text-sm text-foreground">
      <label htmlFor={id} className="block font-semibold">{label}{required ? <span aria-hidden="true"> *</span> : null}</label>
      {children}
      {description ? <p id={`${id}-help`} className="text-sm text-text-muted">{description}</p> : null}
      {error ? <p id={`${id}-error`} className="text-sm text-status-danger">{error}</p> : null}
    </div>
  </FieldContext.Provider>;
}

type ControlProps = Pick<AriaAttributes, "aria-describedby" | "aria-invalid"> & { id?: string; required?: boolean };
export function useFieldControl(props: ControlProps) {
  const field = useContext(FieldContext);
  return {
    id: field?.id ?? props.id,
    required: Boolean(field?.required || props.required),
    "aria-invalid": field?.invalid || props["aria-invalid"] || undefined,
    "aria-describedby": [field?.describedBy, props["aria-describedby"]].filter(Boolean).join(" ") || undefined,
  };
}
