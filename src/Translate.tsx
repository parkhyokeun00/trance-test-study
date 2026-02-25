import { useState, useEffect, useRef } from "react";
import { ArrowLeftRight, Copy, Check, Share2, Trash } from "lucide-react";
import { Textarea, Button, Loader } from "./theme";
import cn from "./utils/classnames.ts";
import { type LanguageCode, LANGUAGES } from "./constants";
import LanguageSelector from "./components/LanguageSelector";
import Translator from "./ai/Translator.ts";
import { formatTime, formatNumber } from "./utils/format";
import { countWords } from "./utils/countWords.ts";

const MAX_SHARE_TEXT_LENGTH = 1000;

interface TranslateProps {
  className?: string;
  translator: Translator | null;
  onInitialize: () => Promise<void>;
  isInitializing?: boolean;
  progress?: number;
}

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
  const abortControllerRef = useRef<AbortController | null>(null);
  const [translationTime, setTranslationTime] = useState<number>(0);
  const [translationWords, setTranslationWords] = useState<number>(0);

  const handleSwapLanguages = () => {
    // Swap languages
    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);

    // Swap text content
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

  const translate = async (
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

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const currentController = abortControllerRef.current;

    setTranslating(true);

    try {
      const translation = await translator.translate(
        text,
        sourceLang,
        targetLang
      );

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
    const timer = setTimeout(() => {
      translate(sourceText, sourceLanguage, targetLanguage);
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [sourceText, sourceLanguage, targetLanguage, translator]);

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
