import { Button } from "./theme";
import cn from "./utils/classnames.ts";
import { formatBytes } from "./utils/format.ts";
import Translator from "./ai/Translator.ts";
import Card from "./theme/misc/Card.tsx";
import Introduction from "./components/Introduction.tsx";
import ModelLoader from "./components/ModelLoader.tsx";
import { flushSync } from "react-dom";
import Waiting from "./components/Waiting.tsx";

interface InitializeProps {
  progress: number;
  onInitialize: () => Promise<void>;
  isInitializing?: boolean;
  className?: string;
}

export default function Initialize({
  progress,
  onInitialize,
  isInitializing = false,
  className = "",
}: InitializeProps) {
  const handleInitialize = async () => {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        flushSync(() => {
          onInitialize();
        });
      });
    } else {
      await onInitialize();
    }
  };

  return (
    <div className={cn("max-w-4xl w-full mx-auto px-4 md:px-8", className)}>
      <Card className="flex flex-col items-center gap-6">
        {isInitializing ? (
          <div className="w-full space-y-8">
            <Waiting />
            <ModelLoader className="w-full" progress={progress} />
          </div>
        ) : (
          <div className="w-full space-y-8">
            <Introduction />
            <Button
              variant="primary"
              onClick={handleInitialize}
              disabled={isInitializing}
              className="text-lg! w-full"
            >
              Download TranslateGemma 4B ({formatBytes(Translator.size)})
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
