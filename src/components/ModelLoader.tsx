import { CSSProperties } from "react";
import cn from "../utils/classnames.ts";

export default function ModelLoader({
  progress,
  className = "",
  style,
}: {
  progress: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={cn("space-y-4", className)} style={style}>
      <div className="space-y-2 mt-8">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-muted-foreground">
            Loading model...
          </span>
          <span className="text-sm text-primary animate-pulse-soft font-mono font-bold">
            {progress.toFixed(2)}%
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-300 ease-out relative overflow-hidden"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          This may take a few moments. Please don't close the page.
        </p>
      </div>
    </div>
  );
}
