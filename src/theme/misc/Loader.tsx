import { Loader2 } from "lucide-react";

interface LoaderProps {
  size?: number;
  className?: string;
}

export default function Loader({ size = 20, className = "" }: LoaderProps) {
  return (
    <Loader2
      className={`animate-spin text-primary ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
