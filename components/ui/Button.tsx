import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "soft" | "danger";

const variantClass: Record<ButtonVariant, string> = {
  primary: "bg-coral text-white shadow-lift hover:bg-[#f25f41]",
  secondary: "border border-line bg-white text-ink hover:border-coral/50 hover:bg-blush/50",
  ghost: "text-muted hover:bg-white hover:text-ink",
  soft: "bg-blush text-coral hover:bg-coral/15",
  danger: "bg-red-50 text-red-600 hover:bg-red-100"
};

const baseClass =
  "inline-flex min-h-11 min-w-0 max-w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-center text-sm font-bold leading-snug whitespace-normal break-keep transition focus:outline-none focus:ring-2 focus:ring-coral/20 disabled:cursor-not-allowed disabled:opacity-50 [&>svg]:shrink-0";

type CommonProps = {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
};

type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>;

type LinkButtonProps = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  };

export function Button({ children, className, type = "button", variant = "primary", ...props }: ButtonProps) {
  return (
    <button className={clsx(baseClass, variantClass[variant], className)} type={type} {...props}>
      {children}
    </button>
  );
}

export function LinkButton({ children, className, variant = "primary", href, ...props }: LinkButtonProps) {
  return (
    <Link className={clsx(baseClass, variantClass[variant], className)} href={href} {...props}>
      {children}
    </Link>
  );
}
