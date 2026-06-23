import type { Request, RequestStatus, StatusHistoryItem, WorkType } from "./types";
import { finalRequestStatuses, statusLabels, workTypeOptions } from "./workflow";
import { formatDuration } from "./metrics";

export type Quarter = "all" | "Q1" | "Q2" | "Q3" | "Q4";
export type KpOfferPlans = Record<string, Record<Exclude<Quarter, "all">, number>>;

export const HISTORICAL_CONTRACT_CONVERSION = 12;
export const PLAN_YEARS = [2026, 2027, 2028] as const;
export const QUARTERS: Array<Exclude<Quarter, "all">> = ["Q1", "Q2", "Q3", "Q4"];
export const DEFAULT_KP_OFFER_PLANS: KpOfferPlans = PLAN_YEARS.reduce((acc, year) => {
  acc[String(year)] = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  return acc;
}, {} as KpOfferPlans);

export const kpContourStatuses = [
  "offer_preparation",
  "owner_approval",
  "ready_to_submit",
  "submitted",
  "feedback_waiting",
  "won",
  "lost",
  "withdrawn_after_start",
  "missed_deadline",
  "canceled_or_paused"
] as const satisfies readonly RequestStatus[];

export const kpContourStatusSet = new Set<RequestStatus>(kpContourStatuses);

export const funnelStages = [
  { id: "incoming", title: "Входящие заявки", statuses: ["new", "participation_decision"] },
  { id: "admitted", title: "Допущены в работу", statuses: ["participation_approved", "appeal_and_folder"] },
  { id: "materials", title: "Подготовка материалов", statuses: ["materials_preparation", "materials_received", "internal_approval", "costs_approved"] },
  { id: "offer", title: "КП", statuses: ["offer_preparation", "owner_approval", "ready_to_submit"] },
  { id: "submitted", title: "Подано", statuses: ["submitted", "feedback_waiting"] },
  { id: "contract", title: "Договор", statuses: ["won"] }
] as const satisfies readonly { id: string; title: string; statuses: readonly RequestStatus[] }[];

export function isKpContourRequest(request: Request) {
  return kpContourStatusSet.has(request.currentStatus);
}

export function getQuarterFromDate(value?: string): Exclude<Quarter, "all"> | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return `Q${Math.floor(date.getMonth() / 3) + 1}` as Exclude<Quarter, "all">;
}

export function getOfferDate(request: Request): string {
  return request.offerPreparedAt ?? request.submissionSubmittedAt ?? request.createdAt;
}

export function matchesDashboardFilters(request: Request, filters: { year: number; quarter: Quarter; workType: WorkType | "all"; ownerUserId: string | "all" }) {
  const offerDate = getOfferDate(request);
  const date = new Date(offerDate);
  const byYear = !Number.isNaN(date.getTime()) && date.getFullYear() === filters.year;
  const byQuarter = filters.quarter === "all" || getQuarterFromDate(offerDate) === filters.quarter;
  const byWorkType = filters.workType === "all" || request.workType === filters.workType;
  const byOwner = filters.ownerUserId === "all" || request.ownerUserId === filters.ownerUserId;
  return byYear && byQuarter && byWorkType && byOwner;
}

export function getAverageFunnelStageDuration(stageStatuses: readonly RequestStatus[], requests: Request[], statusHistory: StatusHistoryItem[]) {
  const requestIds = new Set(requests.map((request) => request.id));
  const durations = statusHistory
    .filter((item) => requestIds.has(item.requestId))
    .reduce<number[]>((acc, item, _index, items) => {
      if (!stageStatuses.includes(item.toStatus)) return acc;
      const history = items
        .filter((entry) => entry.requestId === item.requestId)
        .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());
      const currentIndex = history.findIndex((entry) => entry.id === item.id);
      const next = history[currentIndex + 1];
      if (!next) return acc;
      const started = new Date(item.changedAt).getTime();
      const ended = new Date(next.changedAt).getTime();
      if (!Number.isNaN(started) && !Number.isNaN(ended) && ended >= started) acc.push(ended - started);
      return acc;
    }, []);
  if (durations.length === 0) return { count: 0, text: "—" };
  const average = durations.reduce((sum, value) => sum + value, 0) / durations.length;
  return { count: durations.length, text: formatDuration(average) };
}

export function getStatusListText(statuses: readonly RequestStatus[]) {
  return statuses.map((status) => statusLabels[status]).join(", ");
}

export function getEmptyPlans(): KpOfferPlans {
  return JSON.parse(JSON.stringify(DEFAULT_KP_OFFER_PLANS)) as KpOfferPlans;
}

export { finalRequestStatuses, workTypeOptions };
