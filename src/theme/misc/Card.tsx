import { ReactNode, CSSProperties } from "react";
import cn from "../../utils/classnames.ts";

interface CardProps {
  className?: string;
  children?: ReactNode;
  style?: CSSProperties;
}

export default function Card({ className = "", children, style }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-lg shadow-md p-8 border border-border",
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}
