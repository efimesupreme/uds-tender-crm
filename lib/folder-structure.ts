import type { Request } from "./types";

const MAX_FOLDER_NAME_LENGTH = 120;
const FALLBACK_VALUE = "Без_названия";

export const requestFolderTemplate = [
  "01_Исходные данные",
  "02_Тендерная документация",
  "03_Проект договора",
  "04_Затраты",
  "05_Протокол разногласий",
  "06_КП",
  "07_Подача",
  "08_Обратная связь и результат"
] as const;

export type RequestFolderTemplateItem = (typeof requestFolderTemplate)[number];

export type RequestFolderLink = {
  key: "working_folder" | "source_data" | "tender_docs" | "contract_draft" | "costs" | "disagreement_protocol" | "commercial_offer" | "submission" | "feedback_result";
  title: string;
  url?: string;
};

const subfolderLinkKeys: Array<Pick<RequestFolderLink, "key" | "title">> = [
  { key: "source_data", title: "Исходные данные" },
  { key: "tender_docs", title: "Тендерная документация" },
  { key: "contract_draft", title: "Проект договора" },
  { key: "costs", title: "Затраты" },
  { key: "disagreement_protocol", title: "Протокол разногласий" },
  { key: "commercial_offer", title: "КП" },
  { key: "submission", title: "Подача" },
  { key: "feedback_result", title: "Обратная связь и результат" }
];

function sanitizeFolderPart(value: string | undefined, fallback = FALLBACK_VALUE): string {
  const cleaned = (value ?? "")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
    .replace(/[\s.]+$/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 48);

  return cleaned || fallback;
}

export function buildFolderName(request: Request): string {
  const year = new Date(request.createdAt).getFullYear();
  const safeYear = Number.isNaN(year) ? new Date().getFullYear() : year;
  const parts = [
    sanitizeFolderPart(request.appealNumber || request.internalNumber || request.id, request.id),
    sanitizeFolderPart(request.customerName),
    sanitizeFolderPart(request.title),
    String(safeYear)
  ];

  return parts.join("_").slice(0, MAX_FOLDER_NAME_LENGTH).replace(/[\s.]+$/g, "");
}

export function getFolderTemplate(): string[] {
  return [...requestFolderTemplate];
}

export function buildSubfolderUrl(rootFolderUrl: string | undefined, subfolderName: string): string | undefined {
  const trimmedRoot = rootFolderUrl?.trim();
  if (!trimmedRoot) return undefined;

  const separator = trimmedRoot.endsWith("/") ? "" : "/";
  return `${trimmedRoot}${separator}${encodeURIComponent(subfolderName)}`;
}

export function getRequestFolderLinks(request: Request): RequestFolderLink[] {
  const rootUrl = request.workingFolderUrl?.trim();
  return [
    { key: "working_folder", title: "Рабочая папка", url: rootUrl || undefined },
    ...getFolderTemplate().map((subfolderName, index) => ({
      ...subfolderLinkKeys[index],
      url: buildSubfolderUrl(rootUrl, subfolderName)
    }))
  ];
}

export function hasWorkingFolder(request: Request): boolean {
  return Boolean(request.workingFolderUrl?.trim());
}

export function hasAppealNumber(request: Request): boolean {
  return Boolean(request.appealNumber?.trim());
}
