import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "link" | "muted";

const base =
  "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const variants: Record<Variant, string> = {
  primary:
    "rounded-md bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent-deep active:translate-y-px disabled:opacity-40 disabled:active:translate-y-0",
  secondary:
    "rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium hover:border-ink-faint active:translate-y-px disabled:opacity-50 disabled:active:translate-y-0",
  link: "text-sm font-medium text-accent hover:text-accent-deep disabled:opacity-40",
  muted: "text-sm font-medium text-ink-muted hover:text-ink disabled:opacity-50",
};

export default function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
