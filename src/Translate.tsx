import { useState, useEffect, useRef } from "react";
import { ArrowLeftRight, Copy, Check, Share2, Trash, Upload, Download, X } from "lucide-react";
import { Textarea, Button, Loader } from "./theme";
import cn from "./utils/classnames.ts";
import { type LanguageCode, LANGUAGES } from "./constants";
import LanguageSelector from "./components/LanguageSelector";
import Translator from "./ai/Translator.ts";
import { formatTime, formatNumber, formatBytes } from "./utils/format";
import { countWords } from "./utils/countWords.ts";
import { parseEpub, parseMarkdown, validateDocumentFile } from "./document/parsers";
import { translateDocument } from "./document/translateDocument";
import { createDownloadFileName, downloadText, toMarkdownOutput } from "./document/exporters";
import { DocumentTranslationProgress } from "./types/document";

const MAX_SHARE_TEXT_LENGTH = 1000;

interface TranslateProps {
  className?: string;
  translator: Translator | null;
  onInitialize: () => Promise<void>;
  isInitializing?: boolean;
  progress?: number;
}

type DocumentJobState =
  | "idle"
  | "parsing"
  | "translating"
  | "done"
  | "error"
  | "canceled";

const INITIAL_DOC_PROGRESS: DocumentTranslationProgress = {
  totalSegments: 0,
  completedSegments: 0,
  percent: 0,
  currentLabel: "",
};

export default function Translate({
  className = "",
  translator,
  onInitialize,
  isInitializing = false,
  progress = 0,
}: TranslateProps) {
  // Initialize from URL hash
  const getInitialState = () => {
    const hash = window.location.hash.slice(1); // Remove the # character
    const params = new URLSearchParams(hash);

    const sourceLang = params.get("sl");
    const targetLang = params.get("tl");
    const text = params.get("text");

    // Validate language codes
    const isValidLanguage = (code: string | null): code is LanguageCode => {
      if (!code) return false;
      return LANGUAGES.some((lang) => lang.code === code);
    };

    return {
      sourceLanguage: isValidLanguage(sourceLang)
        ? sourceLang
        : ("en" as LanguageCode),
      targetLanguage: isValidLanguage(targetLang)
        ? targetLang
        : ("de_DE" as LanguageCode),
      sourceText: text ? decodeURIComponent(text) : "",
    };
  };

  const initialState = getInitialState();

  const [sourceText, setSourceText] = useState(initialState.sourceText);
  const [targetText, setTargetText] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState<LanguageCode>(
    initialState.sourceLanguage
  );
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode>(
    initialState.targetLanguage
  );
  const [translating, setTranslating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [shared, setShared] = useState<boolean>(false);
  const textAbortControllerRef = useRef<AbortController | null>(null);
  const [translationTime, setTranslationTime] = useState<number>(0);
  const [translationWords, setTranslationWords] = useState<number>(0);

  const [documentJobState, setDocumentJobState] = useState<DocumentJobState>("idle");
  const [documentProgress, setDocumentProgress] =
    useState<DocumentTranslationProgress>(INITIAL_DOC_PROGRESS);
  const [documentError, setDocumentError] = useState<string>("");
  const [documentOutput, setDocumentOutput] = useState<string>("");
  const [documentFileName, setDocumentFileName] = useState<string>("");
  const [pendingDocumentFile, setPendingDocumentFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const documentAbortControllerRef = useRef<AbortController | null>(null);

  const handleSwapLanguages = () => {
    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);

    setSourceText(targetText);
    setTargetText(sourceText);
  };

  const handleCopy = async () => {
    if (!targetText) return;

    try {
      await navigator.clipboard.writeText(targetText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleShare = async () => {
    try {
      const currentUrl = window.location.href;
      await navigator.clipboard.writeText(currentUrl);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch (error) {
      console.error("Failed to share:", error);
    }
  };

  const runTextTranslation = async (
    text: string,
    sourceLang: LanguageCode,
    targetLang: LanguageCode
  ) => {
    if (!text.trim()) {
      setTargetText("");
      setTranslationTime(0);
      setTranslationWords(0);
      return;
    }

    const started = performance.now();

    if (textAbortControllerRef.current) {
      textAbortControllerRef.current.abort();
    }

    textAbortControllerRef.current = new AbortController();
    const currentController = textAbortControllerRef.current;

    setTranslating(true);

    try {
      const translation = await translator.translate(text, sourceLang, targetLang);

      if (!currentController.signal.aborted) {
        setTargetText(translation);
        setTranslationTime(Math.round(performance.now() - started));
        setTranslationWords(countWords(text));
      }
    } catch (error) {
      if (!currentController.signal.aborted) {
        console.error("Translation error:", error);
      }
    } finally {
      if (!currentController.signal.aborted) {
        setTranslating(false);
      }
    }
  };

  const runDocumentTranslation = async (file: File, activeTranslator: Translator) => {
    setDocumentFileName(file.name);
    setDocumentError("");
    setDocumentOutput("");
    setDocumentProgress(INITIAL_DOC_PROGRESS);

    try {
      const { kind } = validateDocumentFile(file);

      setDocumentJobState("parsing");
      const parsedDocument =
        kind === "md"
          ? parseMarkdown(await file.text(), file.name)
          : await parseEpub(file);

      documentAbortControllerRef.current?.abort();
      const controller = new AbortController();
      documentAbortControllerRef.current = controller;

      setDocumentJobState("translating");
      const { segmentTranslations, result } = await translateDocument({
        translator: activeTranslator,
        parsedDocument,
        sourceLanguage,
        targetLanguage,
        signal: controller.signal,
        onProgress: setDocumentProgress,
      });

      const outputText = toMarkdownOutput(parsedDocument, segmentTranslations);
      result.outputText = outputText;

      if (result.failedSegments.length > 0) {
        setDocumentError(
          `Completed with ${result.failedSegments.length} failed segment(s). Failed segments were marked in output.`
        );
      }

      setDocumentOutput(result.outputText);
      setDocumentJobState("done");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setDocumentJobState("canceled");
        return;
      }

      setDocumentJobState("error");
      const message = error instanceof Error ? error.message : "Unknown document translation error.";
      setDocumentError(message);
    }
  };

  const handleDocumentFile = async (file: File) => {
    setPendingDocumentFile(file);

    if (!translator) {
      setDocumentJobState("idle");
      setDocumentError("Model is not loaded. Attempting to load model automatically...");
      if (!isInitializing) {
        void onInitialize();
      }
      return;
    }

    await runDocumentTranslation(file, translator);
    setPendingDocumentFile(null);
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleDocumentFile(file);
    e.target.value = "";
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await handleDocumentFile(file);
  };

  const handleCancelDocumentTranslation = () => {
    documentAbortControllerRef.current?.abort();
  };

  const handleDownloadDocument = () => {
    if (!documentOutput || !documentFileName) return;
    const outputName = createDownloadFileName(documentFileName, targetLanguage);
    downloadText(outputName, documentOutput);
  };

  // Update URL hash when languages or text change
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("sl", sourceLanguage);
    params.set("tl", targetLanguage);
    if (sourceText && sourceText.length <= MAX_SHARE_TEXT_LENGTH) {
      params.set("text", encodeURIComponent(sourceText));
    }

    window.location.hash = `#${params.toString()}`;
  }, [sourceLanguage, targetLanguage, sourceText]);

  useEffect(() => {
    if (!translator) {
      setTargetText("");
      return;
    }
    if (documentJobState === "parsing" || documentJobState === "translating") {
      return;
    }

    const timer = setTimeout(() => {
      runTextTranslation(sourceText, sourceLanguage, targetLanguage);
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [sourceText, sourceLanguage, targetLanguage, translator, documentJobState]);

  useEffect(() => {
    if (!translator || !pendingDocumentFile) return;
    if (documentJobState === "parsing" || documentJobState === "translating") return;

    void runDocumentTranslation(pendingDocumentFile, translator).finally(() => {
      setPendingDocumentFile(null);
    });
  }, [translator, pendingDocumentFile, documentJobState, sourceLanguage, targetLanguage]);

  return (
    <div
      className={cn(
        "max-w-[min(1800px,98vw)] mx-auto p-2 md:p-6 relative",
        className
      )}
    >
      <div className="flex flex-col md:flex-row w-full gap-4 md:gap-8">
        <div className="flex flex-col gap-3 w-full md:w-1/2 relative">
          {!translator && (
            <div className="rounded-md border border-primary-200 bg-primary-50 p-3 text-sm text-primary-700 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <span>
                Model is not loaded. Click to download when you want to start
                translating.
              </span>
              <button
                onClick={onInitialize}
                disabled={isInitializing}
                className="px-3 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isInitializing
                  ? `Downloading... ${Math.round(progress)}%`
                  : "Load model"}
              </button>
            </div>
          )}

          <LanguageSelector
            value={sourceLanguage}
            onChange={setSourceLanguage}
          />

          <div className="rounded-md border border-border bg-white p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Document Translation (.md, .epub)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.epub"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outlined"
                icon={Upload}
                onClick={() => fileInputRef.current?.click()}
                disabled={documentJobState === "parsing" || documentJobState === "translating"}
              >
                Upload
              </Button>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-md p-4 text-sm text-muted-foreground transition-colors",
                isDragging ? "border-primary bg-primary-50" : "border-border"
              )}
            >
              Drop a `.md` or `.epub` file here to auto-translate.
            </div>

            {documentFileName && (
              <p className="text-xs text-muted-foreground">
                File: <b>{documentFileName}</b>
              </p>
            )}

            {(documentJobState === "parsing" || documentJobState === "translating") && (
              <div className="space-y-2">
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${documentProgress.percent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {documentJobState === "parsing"
                    ? "Parsing document..."
                    : `${documentProgress.completedSegments}/${documentProgress.totalSegments} (${documentProgress.percent}%) ${documentProgress.currentLabel}`}
                </p>
                <Button
                  type="button"
                  variant="text"
                  icon={X}
                  onClick={handleCancelDocumentTranslation}
                >
                  Cancel
                </Button>
              </div>
            )}

            {documentError && (
              <p className="text-xs text-destructive">{documentError}</p>
            )}

            {documentOutput && (
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Output ready ({formatBytes(new Blob([documentOutput]).size)})
                </p>
                <Button
                  type="button"
                  variant="primary"
                  icon={Download}
                  onClick={handleDownloadDocument}
                >
                  Download .md
                </Button>
              </div>
            )}
          </div>

          <Textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="Enter text to translate..."
            className="h-64 md:h-[42rem] pb-10"
            variant="default"
          />
          <div className="p-2 flex justify-between items-center -mt-4">
            <p className="text-xs text-muted-foreground opacity-70">
              {formatNumber(sourceText.length)} chars (no hard limit)
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleShare}
                className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-colors"
                aria-label="Share translation"
              >
                {shared ? (
                  <span className="flex text-xs gap-2">
                    link copied
                    <Check className="w-4 h-4 text-primary" />
                  </span>
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => setSourceText("")}
                className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-colors"
                aria-label="clear text"
              >
                <Trash className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="hidden md:block absolute left-1/2 top-5 -translate-x-1/2">
          <Button
            variant="ghost"
            icon={ArrowLeftRight}
            onClick={handleSwapLanguages}
            aria-label="Swap languages"
          />
        </div>

        <div className="flex md:hidden justify-center -my-2">
          <Button
            variant="ghost"
            icon={ArrowLeftRight}
            onClick={handleSwapLanguages}
            aria-label="Swap languages"
            className="rotate-90"
          />
        </div>

        <div className="flex flex-col gap-3 w-full md:w-1/2">
          <div className="flex items-center justify-between">
            <LanguageSelector
              value={targetLanguage}
              onChange={setTargetLanguage}
            />
            {translating && <Loader size={20} />}
          </div>
          <div>
            <Textarea
              value={targetText}
              disabled
              placeholder={
                translator
                  ? "Translation will appear here..."
                  : "Load model to start translating..."
              }
              className="h-64 md:h-[42rem]"
              variant="default"
            />
            <div className="p-2 flex justify-between items-center -mt-4">
              {translationTime > 0 ? (
                <p className="text-xs text-muted-foreground opacity-70">
                  Translated <b>{formatNumber(translationWords)} words</b> in{" "}
                  <b>{formatTime(translationTime)}</b>
                </p>
              ) : (
                <p />
              )}
              <div>
                <button
                  onClick={handleCopy}
                  className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-colors"
                  aria-label="Copy translation"
                >
                  {copied ? (
                    <span className="flex text-xs gap-2">
                      translation copied
                      <Check className="w-4 h-4 text-primary" />
                    </span>
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
