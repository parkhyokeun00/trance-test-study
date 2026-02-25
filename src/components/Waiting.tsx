import { useEffect, useState } from "react";
import cn from "../utils/classnames.ts";
import { ExternalLink } from "lucide-react";

const ALL_TITLES = [
  "Why TranslateGemma?",
  "为什么选择 TranslateGemma？",
  "Pourquoi TranslateGemma ?",
  "Warum TranslateGemma?",
  "¿Por qué TranslateGemma?",
  "TranslateGemma はなぜ？",
  "왜 TranslateGemma인가요?",
  "لماذا TranslateGemma؟",
  "Почему TranslateGemma?",
  "TranslateGemma কেন?",
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Waiting({ className = "" }: { className?: string }) {
  const [titles, setTitles] = useState(ALL_TITLES);
  const [titleIndex, setTitleIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const [first, ...rest] = ALL_TITLES;
    setTitles([first, ...shuffle(rest)]);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setTitleIndex((i) => (i + 1) % titles.length);
        setVisible(true);
      }, 400);
    }, 1700);
    return () => clearInterval(interval);
  }, [titles]);

  return (
    <div className={cn("space-y-4 text-left w-full", className)}>
      <div
        className="animate-fade-in-up"
        style={{ animationDelay: "0.1s", opacity: 0 }}
      >
        <h3
          className="font-semibold text-base mb-1 transition-opacity duration-400"
          style={{ opacity: visible ? 1 : 0 }}
        >
          {titles[titleIndex]}
        </h3>
        <p className="text-sm text-secondary-foreground">
          TranslateGemma is built on Gemma 3 from Google, and outperforms
          classic translation models thanks to its strong understanding of
          language semantics and context, not just statistical mappings between
          word pairs. This improves quality on nuanced and low-resource
          translation without needing massive amounts of parallel training data
          for every language pair.
        </p>
      </div>

      <div
        className="animate-fade-in-up"
        style={{ animationDelay: "0.2s", opacity: 0 }}
      >
        <p className="text-sm text-secondary-foreground">
          While you're waiting,{" "}
          <a
            href="https://blog.google/innovation-and-ai/technology/developers-tools/translategemma/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline underline-offset-2 gap-1 inline-flex items-center transition-all hover:underline-offset-4"
          >
            learn more about TranslateGemma <ExternalLink size={14} />
          </a>
          .
        </p>
      </div>
    </div>
  );
}
