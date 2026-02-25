import { DetailedHTMLProps, TextareaHTMLAttributes, useMemo } from "react";
import cn from "../../utils/classnames";

interface TextareaProps extends DetailedHTMLProps<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  HTMLTextAreaElement
> {
  variant?: "default" | "minimal";
  error?: boolean;
}

export default function Textarea({
  variant = "default",
  error = false,
  className = "",
  value,
  ...props
}: TextareaProps) {
  const baseClasses =
    "w-full font-sans transition-all duration-200 resize-none focus:outline-none";

  const variantClasses = {
    default:
      "px-4 py-3 border border-border rounded-md bg-white hover:border-primary-300 focus:border-primary focus:ring-2 focus:ring-primary/20",
    minimal:
      "px-4 py-3 border-0 bg-transparent hover:bg-muted/30 focus:bg-white focus:shadow-sm rounded-md",
  };

  const errorClasses = error
    ? "border-destructive focus:border-destructive focus:ring-destructive/20"
    : "";

  const disabledClasses = "disabled:cursor-default";

  const fontSizeClass = useMemo(() => {
    const length = typeof value === "string" ? value.length : 0;
    console.log(length);

    if (length === 0) return "text-2xl";
    if (length < 50) return "text-2xl";
    if (length < 200) return "text-xl";
    if (length < 300) return "text-lg";
    return "text-base";
  }, [value]);

  return (
    <textarea
      className={cn(
        baseClasses,
        variantClasses[variant],
        errorClasses,
        disabledClasses,
        fontSizeClass,
        className
      )}
      value={value}
      {...props}
    />
  );
}
