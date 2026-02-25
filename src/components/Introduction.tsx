import cn from "../utils/classnames.ts";

export default function Introduction({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={cn("space-y-4 text-left w-full", className)}>
      <div
        className="animate-fade-in-up"
        style={{ animationDelay: "0.1s", opacity: 0 }}
      >
        <h3 className="font-semibold text-base mb-1">
          About TranslateGemma 4B
        </h3>
        <p className="text-sm text-secondary-foreground">
          TranslateGemma is a family of translation models from Google, built on
          top of Gemma 3. This 4B parameter model supports translations across
          100+ languages with state-of-the-art quality.{" "}
          <a
            href="https://blog.google/innovation-and-ai/technology/developers-tools/translategemma/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline underline-offset-2 transition-all hover:underline-offset-4"
          >
            Learn more
          </a>
        </p>
      </div>

      <div
        className="animate-fade-in-up"
        style={{ animationDelay: "0.2s", opacity: 0 }}
      >
        <h3 className="font-semibold text-base mb-1">
          Completely private & offline-capable
        </h3>
        <p className="text-sm text-secondary-foreground">
          Everything runs entirely in your browser with 🤗 Transformers.js and
          ONNX Runtime Web — no data is ever sent to a server. Once loaded, it
          works offline.
        </p>
      </div>

      <div
        className="animate-fade-in-up"
        style={{ animationDelay: "0.3s", opacity: 0 }}
      >
        <h3 className="font-semibold text-base mb-1">
          Experimental — WebGPU required
        </h3>
        <p className="text-sm text-secondary-foreground">
          This is experimental and requires a browser with WebGPU support and
          enough VRAM to run the model.
        </p>
      </div>
    </div>
  );
}
