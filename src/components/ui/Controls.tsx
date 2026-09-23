import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { useFieldControl } from "./Field";
import { controlStyle, focusStyle } from "./styles";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className = "", ...props }, ref) {
  const field = useFieldControl(props);
  return <input {...props} {...field} ref={ref} className={`min-h-10 ${controlStyle} ${className}`} />;
});
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className = "", rows = 3, ...props }, ref) {
  const field = useFieldControl(props);
  return <textarea {...props} {...field} rows={rows} ref={ref} className={`min-h-24 resize-y ${controlStyle} ${className}`} />;
});
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className = "", children, ...props }, ref) {
  const field = useFieldControl(props);
  return <select {...props} {...field} ref={ref} className={`min-h-10 ${controlStyle} ${className}`}>{children}</select>;
});
export const Checkbox = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, "type">>(function Checkbox({ className = "", ...props }, ref) {
  const field = useFieldControl(props);
  return <input {...props} {...field} type="checkbox" ref={ref} className={`h-6 w-6 shrink-0 accent-action-primary disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-status-danger ${focusStyle} ${className}`} />;
});
