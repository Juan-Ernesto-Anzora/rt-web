import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { focusStyle } from "./styles";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
};
const variants = {
  primary: "border-transparent bg-action-primary text-action-primary-foreground enabled:hover:bg-action-primary-hover",
  secondary: "border-border-strong bg-surface text-foreground enabled:hover:bg-surface-hover",
  ghost: "border-transparent bg-transparent text-foreground enabled:hover:bg-surface-hover",
  danger: "border-status-danger bg-status-danger-surface text-status-danger enabled:hover:underline",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  variant = "primary", size = "md", loading = false, disabled, type = "button", className = "", children, ...props
}, ref) {
  return <button {...props} ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined}
    className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-small border text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${size === "sm" ? "min-h-8 px-3 py-1" : "min-h-10 px-4 py-2"} ${variants[variant]} ${focusStyle} ${className}`}>
    {children}{loading ? <span aria-hidden="true">...</span> : null}
  </button>;
});

export type IconButtonProps = Omit<ButtonProps, "children" | "aria-label" | "aria-labelledby"> & { label: string; children: ReactNode };
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton({ label, children, size = "md", className = "", ...props }, ref) {
  if (!label.trim()) throw new Error("IconButton requires a non-empty label");
  return <Button {...props} ref={ref} size={size} aria-labelledby={undefined} aria-label={label} title={label} className={`${size === "sm" ? "h-8 w-8" : "h-10 w-10"} !p-0 ${className}`}><span aria-hidden="true" className="inline-flex">{children}</span></Button>;
});
