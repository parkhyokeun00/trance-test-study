import Translator from "../ai/Translator";
import { createChunks } from "./chunker";
import {
  DocumentTranslationProgress,
  DocumentTranslationResult,
  ParsedDocument,
} from "../types/document";

type TranslateDocumentArgs = {
  translator: Translator;
  parsedDocument: ParsedDocument;
  sourceLanguage: string;
  targetLanguage: string;
  signal?: AbortSignal;
  onProgress?: (progress: DocumentTranslationProgress) => void;
};

type SegmentTranslations = Record<string, string>;

const toPercent = (done: number, total: number): number => {
  if (total === 0) return 100;
  return Math.round((done / total) * 100);
};

const ensureNotAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw new DOMException("Translation aborted", "AbortError");
  }
};

const translateWithRetry = async (
  translator: Translator,
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  signal?: AbortSignal
): Promise<{ ok: true; text: string } | { ok: false }> => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    ensureNotAborted(signal);
    try {
      const translated = await translator.translate(
        text,
        sourceLanguage,
        targetLanguage
      );
      return { ok: true, text: translated };
    } catch {
      if (attempt === 1) {
        return { ok: false };
      }
    }
  }

  return { ok: false };
};

export const translateDocument = async ({
  translator,
  parsedDocument,
  sourceLanguage,
  targetLanguage,
  signal,
  onProgress,
}: TranslateDocumentArgs): Promise<{
  segmentTranslations: SegmentTranslations;
  result: DocumentTranslationResult;
}> => {
  const chunks = createChunks(parsedDocument.segments);
  const total = chunks.length;
  let completed = 0;
  const failedSegmentsSet = new Set<string>();
  const segmentPieces = new Map<string, string[]>();

  if (total === 0) {
    return {
      segmentTranslations: {},
      result: {
        outputText: "",
        failedSegments: [],
      },
    };
  }

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    ensureNotAborted(signal);

    const label = `Chapter ${chunk.chapterIndex + 1}, chunk ${index + 1}/${total}`;
    onProgress?.({
      totalSegments: total,
      completedSegments: completed,
      percent: toPercent(completed, total),
      currentLabel: label,
    });

    const chunkResult = await translateWithRetry(
      translator,
      chunk.text,
      sourceLanguage,
      targetLanguage,
      signal
    );

    const existing = segmentPieces.get(chunk.segmentId) ?? [];
    if (chunkResult.ok) {
      existing[chunk.partIndex] = chunkResult.text;
    } else {
      existing[chunk.partIndex] = `[TRANSLATION_FAILED] ${chunk.text}`;
      failedSegmentsSet.add(chunk.segmentId);
    }
    segmentPieces.set(chunk.segmentId, existing);

    completed += 1;
    onProgress?.({
      totalSegments: total,
      completedSegments: completed,
      percent: toPercent(completed, total),
      currentLabel: label,
    });
  }

  const segmentTranslations: SegmentTranslations = {};
  for (const [segmentId, pieces] of segmentPieces.entries()) {
    segmentTranslations[segmentId] = pieces.join(" ");
  }

  return {
    segmentTranslations,
    result: {
      outputText: "",
      failedSegments: Array.from(failedSegmentsSet),
    },
  };
};

