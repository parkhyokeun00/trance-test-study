import { pipeline, DataType } from "@huggingface/transformers";

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

  public async init(onProgress?: (progress: number) => void) {
    if (this.pipeline) return;

    const loaded = new Map<string, number>();
    let newProgress = 0;

    this.pipeline = await pipeline("text-generation", Translator.modelId, {
      progress_callback: (e) => {
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
