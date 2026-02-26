import Translate from "./Translate";
import { useEffect, useState } from "react";
import Translator from "./ai/Translator.ts";

const MODEL_READY_KEY = "translategemma:model-ready";

function App() {
  const [translator, setTranslator] = useState<Translator | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);

  const initInternal = async (options?: {
    localFilesOnly?: boolean;
    silent?: boolean;
  }) => {
    if (isInitializing) return;
    setIsInitializing(true);
    try {
      const t = Translator.getInstance();
      await t.init({
        onProgress: options?.silent ? undefined : setProgress,
        localFilesOnly: options?.localFilesOnly ?? false,
      });
      setTranslator(t);
      localStorage.setItem(MODEL_READY_KEY, "1");
    } catch (error) {
      if (!options?.silent) {
        console.error("Failed to initialize model:", error);
      }
      if (options?.localFilesOnly) {
        localStorage.removeItem(MODEL_READY_KEY);
      }
    } finally {
      setIsInitializing(false);
    }
  };

  const init = async () => {
    await initInternal();
  };

  useEffect(() => {
    if (localStorage.getItem(MODEL_READY_KEY) === "1") {
      void initInternal({ localFilesOnly: true, silent: true });
    }
  }, []);

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col justify-between gap-2">
      <header className="bg-white border-b border-border shadow-sm p-4">
        <h1 className="text-md md:text-3xl font-sans text-center flex justify-center items-center gap-2 md:gap-6">
          <span className="font-bold flex items-center justify-center gap-1">
            <img
              src="gemma.svg"
              alt="Gemma Logo"
              className="block"
              style={{
                width: "1.2em",
                height: "1.2em",
              }}
            />
            <span>
              Translate<span className="text-primary">Gemma</span>
            </span>
          </span>
          <span>//</span>
          <span className="font-bold flex items-center justify-center gap-1">
            <img
              src="hf-logo.svg"
              alt="Transformers.js Logo"
              className="block"
              style={{
                width: "1.2em",
                height: "1.2em",
              }}
            />
            Transformers.js
          </span>
        </h1>
      </header>
      <Translate
        className="w-full"
        translator={translator}
        onInitialize={init}
        isInitializing={isInitializing}
        progress={progress}
      />
      <footer
        className="p-8 pt-0 text-center text-muted-foreground text-xs md:text-sm animate-fade-in"
        style={{ animationDelay: "0.5s", opacity: 0 }}
      >
        <p>
          High-quality translations across 56 languages powered by{" "}
          <a
            href="https://blog.google/technology/developers/gemma-open-models/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline underline-offset-2 transition-all hover:underline-offset-4"
          >
            Google's TranslateGemma
          </a>{" "}
          model, running entirely in your browser with{" "}
          <a
            href="https://huggingface.co/docs/transformers.js"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline underline-offset-2 transition-all hover:underline-offset-4"
          >
            Transformers.js
          </a>{" "}
          and complete privacy.
        </p>
      </footer>
    </div>
  );
}

export default App;
