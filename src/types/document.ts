export type DocumentKind = "markdown" | "epub";

export type DocumentPreserveType = "text" | "code" | "raw";

export type InlineCodeToken = {
  token: string;
  value: string;
};

export type DocumentSegment = {
  id: string;
  chapterIndex: number;
  order: number;
  preserveType: DocumentPreserveType;
  sourceText: string;
  prefix?: string;
  suffix?: string;
  inlineCodes?: InlineCodeToken[];
  metadata?: {
    markdownKind?: "heading" | "list" | "blockquote" | "paragraph";
    listMarker?: string;
  };
};

export type ParsedDocument = {
  kind: DocumentKind;
  fileName: string;
  segments: DocumentSegment[];
};

export type DocumentTranslationProgress = {
  totalSegments: number;
  completedSegments: number;
  percent: number;
  currentLabel: string;
};

export type DocumentTranslationResult = {
  outputText: string;
  failedSegments: string[];
};
