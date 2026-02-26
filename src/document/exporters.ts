import { DocumentSegment, ParsedDocument } from "../types/document";

type SegmentTranslations = Record<string, string>;

const restoreInlineCodes = (
  text: string,
  segment: DocumentSegment
): string => {
  if (!segment.inlineCodes || segment.inlineCodes.length === 0) {
    return text;
  }

  let restored = text;
  for (const inlineCode of segment.inlineCodes) {
    restored = restored.split(inlineCode.token).join(inlineCode.value);
  }
  return restored;
};

export const toMarkdownOutput = (
  parsedDocument: ParsedDocument,
  segmentTranslations: SegmentTranslations
): string => {
  const orderedSegments = [...parsedDocument.segments].sort(
    (a, b) => a.order - b.order
  );

  return orderedSegments
    .map((segment) => {
      if (segment.preserveType !== "text") {
        return segment.sourceText;
      }

      const translated =
        segmentTranslations[segment.id] ??
        restoreInlineCodes(`[TRANSLATION_FAILED] ${segment.sourceText}`, segment);
      const restored = restoreInlineCodes(translated, segment);
      return `${segment.prefix ?? ""}${restored}${segment.suffix ?? ""}`;
    })
    .join("");
};

export const createDownloadFileName = (
  originalName: string,
  targetLanguage: string
): string => {
  const dotIndex = originalName.lastIndexOf(".");
  const baseName = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
  return `${baseName}.${targetLanguage}.translated.md`;
};

export const downloadText = (fileName: string, text: string) => {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
