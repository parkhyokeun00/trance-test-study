import JSZip from "jszip";
import { DocumentSegment, ParsedDocument } from "../types/document";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

const markdownHeadingPattern = /^(#{1,6}\s+)(.*)$/;
const markdownListPattern = /^(\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?)(.*)$/;
const markdownBlockquotePattern = /^(\s*(?:>\s*)+)(.*)$/;
const markdownTablePattern = /^\|.*\|\s*$/;
const markdownHorizontalRulePattern = /^(\*\s*\*\s*\*|-{3,}|_{3,})\s*$/;

const protectInlineCode = (text: string) => {
  const inlineCodes: { token: string; value: string }[] = [];
  let idx = 0;
  const protectedText = text.replace(/`[^`\n]+`/g, (match) => {
    const token = `__INLINE_CODE_${idx}__`;
    inlineCodes.push({ token, value: match });
    idx += 1;
    return token;
  });

  return { protectedText, inlineCodes };
};

const dirname = (path: string): string => {
  const idx = path.lastIndexOf("/");
  if (idx < 0) return "";
  return path.slice(0, idx);
};

const joinPath = (baseDir: string, relativePath: string): string => {
  const baseParts = baseDir.split("/").filter(Boolean);
  const relParts = relativePath.split("/").filter(Boolean);
  const stack = [...baseParts];

  for (const part of relParts) {
    if (part === ".") continue;
    if (part === "..") {
      stack.pop();
      continue;
    }
    stack.push(part);
  }

  return stack.join("/");
};

const stripFragment = (path: string): string => {
  const hashIndex = path.indexOf("#");
  return hashIndex >= 0 ? path.slice(0, hashIndex) : path;
};

const normalizeZipPath = (path: string): string => {
  const cleaned = decodeURIComponent(path).replace(/\\/g, "/").replace(/^\/+/, "");
  return stripFragment(cleaned);
};

const resolveRelativePath = (basePath: string, href: string): string => {
  const baseDir = dirname(basePath);
  return normalizeZipPath(joinPath(baseDir, href));
};

const readZipText = async (zip: JSZip, path: string): Promise<string> => {
  const normalizedPath = normalizeZipPath(path);
  const entry = zip.file(normalizedPath) ?? zip.file(decodeURIComponent(normalizedPath));
  if (!entry) {
    throw new Error(`Missing epub entry: ${normalizedPath}`);
  }
  return entry.async("text");
};

const getTextContent = (node: Element): string =>
  (node.textContent ?? "").replace(/\s+/g, " ").trim();

const parseMarkdownLineAsText = (
  line: string,
  chapterIndex: number,
  order: number,
  id: string,
  markdownKind: "heading" | "list" | "blockquote"
): DocumentSegment | null => {
  const pattern =
    markdownKind === "heading"
      ? markdownHeadingPattern
      : markdownKind === "list"
        ? markdownListPattern
        : markdownBlockquotePattern;

  const match = line.match(pattern);
  if (!match) return null;

  const prefix = match[1] ?? "";
  const body = (match[2] ?? "").trim();
  if (!body) {
    return {
      id,
      chapterIndex,
      order,
      preserveType: "raw",
      sourceText: `${line}\n`,
    };
  }

  const { protectedText, inlineCodes } = protectInlineCode(body);
  return {
    id,
    chapterIndex,
    order,
    preserveType: "text",
    sourceText: protectedText,
    prefix,
    suffix: "\n",
    inlineCodes,
    metadata: {
      markdownKind,
      ...(markdownKind === "list" ? { listMarker: prefix.trim() } : {}),
    },
  };
};

export const parseMarkdown = (
  fileText: string,
  fileName: string
): ParsedDocument => {
  const normalized = fileText.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const segments: DocumentSegment[] = [];

  let inCodeBlock = false;
  let paragraphLines: string[] = [];
  let order = 0;
  let textId = 0;
  let rawId = 0;

  const pushTextSegment = () => {
    if (paragraphLines.length === 0) return;
    const paragraph = paragraphLines.join("\n").trim();
    paragraphLines = [];
    if (!paragraph) return;

    const { protectedText, inlineCodes } = protectInlineCode(paragraph);
    segments.push({
      id: `md-text-${textId++}`,
      chapterIndex: 0,
      order: order++,
      preserveType: "text",
      sourceText: protectedText,
      suffix: "\n\n",
      inlineCodes,
      metadata: {
        markdownKind: "paragraph",
      },
    });
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    const codeFence = /^```/.test(trimmed);

    if (codeFence) {
      pushTextSegment();
      inCodeBlock = !inCodeBlock;
      segments.push({
        id: `md-raw-${rawId++}`,
        chapterIndex: 0,
        order: order++,
        preserveType: "code",
        sourceText: `${line}\n`,
      });
      continue;
    }

    if (inCodeBlock) {
      segments.push({
        id: `md-raw-${rawId++}`,
        chapterIndex: 0,
        order: order++,
        preserveType: "code",
        sourceText: `${line}\n`,
      });
      continue;
    }

    if (!trimmed) {
      pushTextSegment();
      segments.push({
        id: `md-raw-${rawId++}`,
        chapterIndex: 0,
        order: order++,
        preserveType: "raw",
        sourceText: "\n",
      });
      continue;
    }

    if (markdownTablePattern.test(line) || markdownHorizontalRulePattern.test(line)) {
      pushTextSegment();
      segments.push({
        id: `md-raw-${rawId++}`,
        chapterIndex: 0,
        order: order++,
        preserveType: "raw",
        sourceText: `${line}\n`,
      });
      continue;
    }

    const headingSegment = parseMarkdownLineAsText(
      line,
      0,
      order,
      `md-text-${textId}`,
      "heading"
    );
    if (headingSegment) {
      pushTextSegment();
      segments.push(headingSegment);
      textId += 1;
      order += 1;
      continue;
    }

    const listSegment = parseMarkdownLineAsText(
      line,
      0,
      order,
      `md-text-${textId}`,
      "list"
    );
    if (listSegment) {
      pushTextSegment();
      segments.push(listSegment);
      textId += 1;
      order += 1;
      continue;
    }

    const blockquoteSegment = parseMarkdownLineAsText(
      line,
      0,
      order,
      `md-text-${textId}`,
      "blockquote"
    );
    if (blockquoteSegment) {
      pushTextSegment();
      segments.push(blockquoteSegment);
      textId += 1;
      order += 1;
      continue;
    }

    paragraphLines.push(line);
  }

  pushTextSegment();

  return {
    kind: "markdown",
    fileName,
    segments: segments.sort((a, b) => a.order - b.order),
  };
};

type EpubBlocks = {
  blocks: Array<{ prefix: string; text: string }>;
  titleFromHeading: string | null;
};

const extractEpubBlocks = (xhtml: string): EpubBlocks => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xhtml, "text/html");
  const heading = doc.querySelector("h1, h2");
  const titleFromHeading = heading ? getTextContent(heading) : null;

  const blocks = Array.from(
    doc.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li,blockquote")
  )
    .map((el) => {
      const text = getTextContent(el);
      if (!text) return null;

      if (el.tagName.toLowerCase() === "li") {
        return {
          prefix: "- ",
          text,
        };
      }

      if (/^h[1-6]$/i.test(el.tagName)) {
        return {
          prefix: "## ",
          text,
        };
      }

      if (el.tagName.toLowerCase() === "blockquote") {
        return {
          prefix: "> ",
          text,
        };
      }

      return {
        prefix: "",
        text,
      };
    })
    .filter((item): item is { prefix: string; text: string } => item !== null);

  return {
    blocks,
    titleFromHeading,
  };
};

const parseNavTocTitles = async (
  zip: JSZip,
  navPath: string
): Promise<Map<string, string>> => {
  const tocMap = new Map<string, string>();
  try {
    const navHtml = await readZipText(zip, navPath);
    const parser = new DOMParser();
    const doc = parser.parseFromString(navHtml, "text/html");

    const navRoots = doc.querySelectorAll("nav[epub\\:type='toc'], nav[type='toc'], nav");
    const links =
      navRoots.length > 0
        ? Array.from(navRoots).flatMap((nav) => Array.from(nav.querySelectorAll("a[href]")))
        : Array.from(doc.querySelectorAll("a[href]"));

    for (const link of links) {
      const href = link.getAttribute("href");
      const title = getTextContent(link);
      if (!href || !title) continue;

      const resolved = resolveRelativePath(navPath, href);
      if (!tocMap.has(resolved)) {
        tocMap.set(resolved, title);
      }
    }
  } catch {
    return new Map<string, string>();
  }

  return tocMap;
};

const parseNcxTocTitles = async (
  zip: JSZip,
  ncxPath: string
): Promise<Map<string, string>> => {
  const tocMap = new Map<string, string>();

  try {
    const ncxXml = await readZipText(zip, ncxPath);
    const parser = new DOMParser();
    const doc = parser.parseFromString(ncxXml, "application/xml");
    const navPoints = Array.from(doc.getElementsByTagNameNS("*", "navPoint"));

    for (const navPoint of navPoints) {
      const contentEl = navPoint.getElementsByTagNameNS("*", "content")[0];
      const textEl = navPoint.getElementsByTagNameNS("*", "text")[0];
      const src = contentEl?.getAttribute("src");
      const title = textEl?.textContent?.trim();
      if (!src || !title) continue;

      const resolved = resolveRelativePath(ncxPath, src);
      if (!tocMap.has(resolved)) {
        tocMap.set(resolved, title);
      }
    }
  } catch {
    return new Map<string, string>();
  }

  return tocMap;
};

const parseEpubTocTitles = async (
  zip: JSZip,
  opfDoc: Document,
  manifestMap: Map<string, string>,
  opfPath: string
): Promise<Map<string, string>> => {
  const manifestItems = Array.from(opfDoc.querySelectorAll("manifest > item"));
  const navItem = manifestItems.find((item) =>
    (item.getAttribute("properties") ?? "").split(/\s+/).includes("nav")
  );

  if (navItem) {
    const navHref = navItem.getAttribute("href");
    if (navHref) {
      const navPath = resolveRelativePath(opfPath, navHref);
      const navMap = await parseNavTocTitles(zip, navPath);
      if (navMap.size > 0) return navMap;
    }
  }

  let ncxHref: string | null = null;
  const spineTocId = opfDoc.querySelector("spine")?.getAttribute("toc");
  if (spineTocId) {
    ncxHref = manifestMap.get(spineTocId) ?? null;
  }

  if (!ncxHref) {
    const ncxItem = manifestItems.find(
      (item) => item.getAttribute("media-type") === "application/x-dtbncx+xml"
    );
    ncxHref = ncxItem?.getAttribute("href") ?? null;
  }

  if (ncxHref) {
    const ncxPath = resolveRelativePath(opfPath, ncxHref);
    return parseNcxTocTitles(zip, ncxPath);
  }

  return new Map<string, string>();
};

export const parseEpub = async (file: File): Promise<ParsedDocument> => {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("File is too large. The maximum size is 25MB.");
  }

  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const containerXml = await readZipText(zip, "META-INF/container.xml");
  const xmlParser = new DOMParser();
  const containerDoc = xmlParser.parseFromString(containerXml, "application/xml");
  const rootFile = containerDoc.querySelector("rootfile");
  const opfPathRaw = rootFile?.getAttribute("full-path");
  if (!opfPathRaw) {
    throw new Error("Invalid EPUB: OPF path not found.");
  }

  const opfPath = normalizeZipPath(opfPathRaw);
  const opfXml = await readZipText(zip, opfPath);
  const opfDoc = xmlParser.parseFromString(opfXml, "application/xml");

  const manifestMap = new Map<string, string>();
  opfDoc.querySelectorAll("manifest > item").forEach((item) => {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    if (id && href) {
      manifestMap.set(id, href);
    }
  });

  const tocTitleMap = await parseEpubTocTitles(zip, opfDoc, manifestMap, opfPath);

  const spineIds = Array.from(opfDoc.querySelectorAll("spine > itemref"))
    .map((item) => item.getAttribute("idref"))
    .filter((id): id is string => Boolean(id));

  if (spineIds.length === 0) {
    throw new Error("Invalid EPUB: no readable chapters in spine.");
  }

  const opfDir = dirname(opfPath);
  const segments: DocumentSegment[] = [];
  let chapterIndex = 0;
  let order = 0;
  let textId = 0;
  let rawId = 0;

  for (const spineId of spineIds) {
    const href = manifestMap.get(spineId);
    if (!href) continue;

    const chapterPath = normalizeZipPath(joinPath(opfDir, href));
    let chapterText = "";
    try {
      chapterText = await readZipText(zip, chapterPath);
    } catch {
      continue;
    }

    const { blocks, titleFromHeading } = extractEpubBlocks(chapterText);
    if (blocks.length === 0) continue;

    const chapterTitle =
      tocTitleMap.get(chapterPath) ?? titleFromHeading ?? `Chapter ${chapterIndex + 1}`;

    segments.push({
      id: `epub-raw-${rawId++}`,
      chapterIndex,
      order: order++,
      preserveType: "raw",
      sourceText: `# ${chapterTitle}\n\n`,
    });

    for (const block of blocks) {
      segments.push({
        id: `epub-text-${textId++}`,
        chapterIndex,
        order: order++,
        preserveType: "text",
        sourceText: block.text,
        prefix: block.prefix,
        suffix: "\n\n",
      });
    }

    chapterIndex += 1;
  }

  if (segments.length === 0) {
    throw new Error("EPUB parsing failed: no translatable text blocks found.");
  }

  return {
    kind: "epub",
    fileName: file.name,
    segments,
  };
};

export const validateDocumentFile = (file: File): { kind: "md" | "epub" } => {
  const lower = file.name.toLowerCase();
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("File is too large. The maximum size is 25MB.");
  }

  if (lower.endsWith(".md")) {
    return { kind: "md" };
  }
  if (lower.endsWith(".epub")) {
    return { kind: "epub" };
  }
  throw new Error("Unsupported file type. Please upload .md or .epub.");
};
