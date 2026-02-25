import { ButtonHTMLAttributes, DetailedHTMLProps, ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import cn from "../../utils/classnames.ts";

interface ButtonProps extends DetailedHTMLProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> {
  variant?:
    | "primary"
    | "outlined"
    | "pill"
    | "pill-selected"
    | "text"
    | "ghost";
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  children?: ReactNode;
}

export default function Button({
  variant = "primary",
  icon: Icon,
  iconPosition = "left",
  children,
  className = "",
  ...props
}: ButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variantClasses = {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary-600 active:bg-primary-700 rounded-md shadow-sm hover:shadow focus:ring-primary/50",
    outlined:
      "bg-transparent text-primary hover:bg-muted active:bg-primary-50 border border-border rounded-[48px] focus:ring-primary/30",
    pill: "bg-transparent text-primary hover:bg-primary-50 active:bg-muted border border-border rounded-[48px] focus:ring-primary/30",
    "pill-selected":
      "bg-primary-100 text-primary-800 hover:bg-primary-200 active:bg-primary-200 border border-primary-100 rounded-[48px] shadow-sm focus:ring-primary-800/30",
    text: "bg-transparent text-primary hover:bg-muted active:bg-primary-50 rounded-md focus:ring-primary/30",
    ghost:
      "bg-transparent text-muted-foreground hover:bg-muted hover:text-primary active:bg-primary-50 rounded-md focus:ring-primary/30",
  };

  const sizeClasses = {
    primary: "[padding:0.625em_1.5em] [gap:0.5em]",
    outlined: "[padding:0.5em_0.75em] [gap:0.5em]",
    pill: "[padding:0.5em_0.75em] [gap:0.5em]",
    "pill-selected": "[padding:0.5em_0.75em] [gap:0.5em]",
    text: "[padding:0.375em_0.5em] [gap:0.5em]",
    ghost: "[padding:0.5em_0.75em] [gap:0.5em]",
  };

  const disabledClasses =
    "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-current disabled:hover:shadow-none";

  return (
    <button
      className={cn(
        "cursor-pointer",
        baseClasses,
        variantClasses[variant],
        sizeClasses[variant],
        disabledClasses,
        className
      )}
      {...props}
    >
      {Icon && iconPosition === "left" && (
        <Icon className="[width:1.25em] [height:1.25em]" />
      )}
      {children}
      {Icon && iconPosition === "right" && (
        <Icon className="[width:1.25em] [height:1.25em]" />
      )}
    </button>
  );
}
