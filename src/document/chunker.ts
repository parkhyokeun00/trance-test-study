import { DocumentSegment } from "../types/document";

export type DocumentChunk = {
  id: string;
  segmentId: string;
  chapterIndex: number;
  partIndex: number;
  totalParts: number;
  text: string;
};

const DEFAULT_TARGET_CHUNK_SIZE = 1000;
const HARD_MAX_CHUNK_SIZE = 1200;

const splitBySentence = (text: string): string[] => {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const sentences = normalized.match(/[^.!?。！？]+[.!?。！？]?/g);
  return (sentences ?? [normalized]).map((s) => s.trim()).filter(Boolean);
};

const splitHard = (text: string, maxSize: number): string[] => {
  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    chunks.push(text.slice(cursor, cursor + maxSize));
    cursor += maxSize;
  }
  return chunks;
};

const splitText = (
  text: string,
  targetSize = DEFAULT_TARGET_CHUNK_SIZE,
  maxSize = HARD_MAX_CHUNK_SIZE
): string[] => {
  const sentences = splitBySentence(text);
  if (sentences.length === 0) return [];

  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (!current) {
      if (sentence.length > maxSize) {
        chunks.push(...splitHard(sentence, maxSize));
      } else {
        current = sentence;
      }
      continue;
    }

    const candidate = `${current} ${sentence}`;
    if (candidate.length <= targetSize) {
      current = candidate;
      continue;
    }

    chunks.push(current);
    if (sentence.length > maxSize) {
      chunks.push(...splitHard(sentence, maxSize));
      current = "";
    } else {
      current = sentence;
    }
  }

  if (current) chunks.push(current);
  return chunks;
};

export const createChunks = (segments: DocumentSegment[]): DocumentChunk[] => {
  const chunks: DocumentChunk[] = [];

  for (const segment of segments) {
    if (segment.preserveType !== "text") continue;
    const parts = splitText(segment.sourceText);
    if (parts.length === 0) continue;

    for (let partIndex = 0; partIndex < parts.length; partIndex += 1) {
      chunks.push({
        id: `${segment.id}:${partIndex + 1}`,
        segmentId: segment.id,
        chapterIndex: segment.chapterIndex,
        partIndex,
        totalParts: parts.length,
        text: parts[partIndex],
      });
    }
  }

  return chunks;
};

