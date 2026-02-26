type DataType = "q4" | "q8" | "fp16" | "fp32";

type TransformersModule = {
  pipeline: (
    task: string,
    model: string,
    options: Record<string, unknown>
  ) => Promise<any>;
};

let transformersModulePromise: Promise<TransformersModule> | null = null;

const runtimeImport = new Function(
  "specifier",
  "return import(specifier);"
) as (specifier: string) => Promise<TransformersModule>;

const loadTransformersModule = async (): Promise<TransformersModule> => {
  if (!transformersModulePromise) {
    transformersModulePromise = runtimeImport(
      "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.0.0-next.3"
    );
  }
  return transformersModulePromise;
};

class Translator {
  private static instance: Translator | null = null;
  private pipeline: any = null;
  private static modelId: string =
    "onnx-community/translategemma-text-4b-it-ONNX";
  private static dtype: DataType = "q4";
  public static size: number = 3111894696;

  private constructor() {}

  public static getInstance(): Translator {
    if (!Translator.instance) {
      Translator.instance = new Translator();
    }
    return Translator.instance;
  }

  public async init(options?: {
    onProgress?: (progress: number) => void;
    localFilesOnly?: boolean;
  }) {
    if (this.pipeline) return;

    const onProgress = options?.onProgress;
    const localFilesOnly = options?.localFilesOnly ?? false;
    const loaded = new Map<string, number>();
    let newProgress = 0;
    const { pipeline } = await loadTransformersModule();

    this.pipeline = await pipeline("text-generation", Translator.modelId, {
      progress_callback: (e: any) => {
        if (e.status === "progress") {
          loaded.set(e.file, e.loaded);
          const allLoaded = Array.from(loaded.values()).reduce(
            (acc: number, curr: number) => acc + curr,
            0
          );
          const percentLoaded =
            Math.round((100 / Translator.size) * allLoaded * 100) / 100;
          if (newProgress !== percentLoaded) {
            newProgress = percentLoaded;
            onProgress(newProgress);
          }
        }
      },
      device: "webgpu",
      dtype: Translator.dtype,
      local_files_only: localFilesOnly,
    });
  }

  public async translate(
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<string> {
    if (!this.pipeline) {
      throw new Error("Translator not initialized. Call init() first.");
    }

    const messages = [
      {
        role: "user",
        content: [
          {
            type: "text",
            source_lang_code: sourceLang,
            target_lang_code: targetLang,
            text,
          },
        ],
      },
    ];

    const output = await this.pipeline(messages, {
      max_new_tokens: 1024,
    });

    return output[0].generated_text.pop().content;
  }
}

export default Translator;
