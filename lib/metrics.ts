import type { Request, RequestStatus, RequestTask, StatusHistoryItem } from "./types";
import { isActiveRequest, statusLabels } from "./workflow";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const LONG_STAGE_THRESHOLD_MS = 2 * DAY;
const OWNER_APPROVAL_THRESHOLD_MS = DAY;
const CLOSE_DEADLINE_THRESHOLD_MS = 2 * DAY;

export type StageDuration = {
  status: RequestStatus;
  statusLabel: string;
  startedAt: string;
  endedAt?: string;
  durationMs: number;
  durationText: string;
  isCurrent: boolean;
};

export type TaskDuration = {
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  durationText: string;
  isCompleted: boolean;
};

export type TaskDelay = {
  dueAt?: string;
  delayedByMs: number;
  delayedByText: string;
  isDelayed: boolean;
};

export type AverageStageDuration = {
  status: RequestStatus;
  statusLabel: string;
  count: number;
  averageMs?: number;
  averageText: string;
};

export type ProcessBottleneckType =
  | "no_next_action"
  | "overdue_task"
  | "long_current_stage"
  | "close_submission_deadline"
  | "owner_approval_stuck"
  | "missing_appeal_or_folder";

export type ProcessBottleneck = {
  id: string;
  type: ProcessBottleneckType;
  requestId: string;
  requestTitle: string;
  requestNumber: string;
  title: string;
  description: string;
  durationMs?: number;
  durationText?: string;
  dueAt?: string;
  taskId?: string;
};

function toTime(value?: string): number | undefined {
  if (!value) return undefined;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? undefined : time;
}

function getTaskCreatedAt(task: RequestTask): string | undefined {
  return task.createdAt ?? task.completedAt ?? task.plannedDueAt;
}

export function formatDuration(ms?: number): string {
  if (ms === undefined || !Number.isFinite(ms)) return "—";
  const value = Math.max(0, Math.round(ms));
  if (value < MINUTE) return "меньше минуты";

  const days = Math.floor(value / DAY);
  const hours = Math.floor((value % DAY) / HOUR);
  const minutes = Math.floor((value % HOUR) / MINUTE);
  const dayLabel = days === 1 ? "день" : "дней";

  if (days > 0 && hours > 0) return `${days} ${dayLabel} ${hours} ч`;
  if (days > 0) return `${days} ${dayLabel}`;
  if (hours > 0 && minutes > 0) return `${hours} ч ${minutes} мин`;
  if (hours > 0) return `${hours} ч`;
  return `${minutes} мин`;
}

export function getRequestStageDurations(requestId: string, statusHistory: StatusHistoryItem[], now: Date = new Date()): StageDuration[] {
  const history = statusHistory
    .filter((item) => item.requestId === requestId)
    .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());

  return history.map((item, index) => {
    const next = history[index + 1];
    const startedAt = item.changedAt;
    const endedAt = next?.changedAt;
    const started = toTime(startedAt) ?? now.getTime();
    const ended = endedAt ? (toTime(endedAt) ?? now.getTime()) : now.getTime();
    const durationMs = Math.max(0, ended - started);

    return {
      status: item.toStatus,
      statusLabel: statusLabels[item.toStatus],
      startedAt,
      endedAt,
      durationMs,
      durationText: formatDuration(durationMs),
      isCurrent: !endedAt
    };
  });
}

export function getCurrentStageDuration(request: Request, statusHistory: StatusHistoryItem[], now: Date = new Date()): StageDuration {
  const stages = getRequestStageDurations(request.id, statusHistory, now);
  const currentStage = [...stages].reverse().find((stage) => stage.status === request.currentStatus && stage.isCurrent) ?? stages.at(-1);
  const startedAt = currentStage?.startedAt ?? request.createdAt;
  const started = toTime(startedAt) ?? now.getTime();
  const durationMs = Math.max(0, now.getTime() - started);

  return {
    status: request.currentStatus,
    statusLabel: statusLabels[request.currentStatus],
    startedAt,
    durationMs,
    durationText: formatDuration(durationMs),
    isCurrent: true
  };
}

export function getTaskDuration(task: RequestTask, now: Date = new Date()): TaskDuration {
  const startedAt = getTaskCreatedAt(task);
  const endedAt = task.completedAt;
  const started = toTime(startedAt);
  const ended = toTime(endedAt) ?? now.getTime();
  const durationMs = started === undefined ? undefined : Math.max(0, ended - started);

  return { startedAt, endedAt, durationMs, durationText: formatDuration(durationMs), isCompleted: Boolean(task.completedAt) };
}

export function getTaskDelay(task: RequestTask, now: Date = new Date()): TaskDelay {
  const due = toTime(task.plannedDueAt);
  if (due === undefined) return { dueAt: task.plannedDueAt, delayedByMs: 0, delayedByText: "—", isDelayed: false };

  const finish = toTime(task.completedAt) ?? now.getTime();
  const delayedByMs = Math.max(0, finish - due);
  return { dueAt: task.plannedDueAt, delayedByMs, delayedByText: delayedByMs > 0 ? formatDuration(delayedByMs) : "—", isDelayed: delayedByMs > 0 };
}

export function getAverageStageDurations(requests: Request[], statusHistory: StatusHistoryItem[]): AverageStageDuration[] {
  return Object.keys(statusLabels).map((status) => {
    const durations = requests.flatMap((request) => getRequestStageDurations(request.id, statusHistory))
      .filter((stage) => stage.status === status && !stage.isCurrent)
      .map((stage) => stage.durationMs);
    const averageMs = durations.length > 0 ? durations.reduce((sum, value) => sum + value, 0) / durations.length : undefined;
    return { status: status as RequestStatus, statusLabel: statusLabels[status as RequestStatus], count: durations.length, averageMs, averageText: durations.length > 0 ? formatDuration(averageMs) : "Недостаточно данных" };
  });
}

export function getProcessBottlenecks(requests: Request[], tasks: RequestTask[], statusHistory: StatusHistoryItem[], now: Date = new Date()): ProcessBottleneck[] {
  const result: ProcessBottleneck[] = [];

  requests.filter((request) => isActiveRequest(request.currentStatus)).forEach((request) => {
    const currentStage = getCurrentStageDuration(request, statusHistory, now);
    const requestTasks = tasks.filter((task) => task.requestId === request.id);

    if (!request.nextActionText) result.push({ id: `${request.id}-no-next-action`, type: "no_next_action", requestId: request.id, requestTitle: request.title, requestNumber: request.internalNumber, title: "Нет следующего действия", description: "У активной заявки не задан следующий шаг." });
    if (currentStage.durationMs >= LONG_STAGE_THRESHOLD_MS) result.push({ id: `${request.id}-long-current-stage`, type: "long_current_stage", requestId: request.id, requestTitle: request.title, requestNumber: request.internalNumber, title: "Долго в текущем статусе", description: `${currentStage.statusLabel}: ${currentStage.durationText}.`, durationMs: currentStage.durationMs, durationText: currentStage.durationText });
    if (request.submissionDeadlineAt && request.currentStatus !== "submitted") {
      const deadlineDelta = (toTime(request.submissionDeadlineAt) ?? now.getTime()) - now.getTime();
      if (deadlineDelta >= 0 && deadlineDelta <= CLOSE_DEADLINE_THRESHOLD_MS) result.push({ id: `${request.id}-close-deadline`, type: "close_submission_deadline", requestId: request.id, requestTitle: request.title, requestNumber: request.internalNumber, title: "Близкий срок подачи", description: `До срока подачи осталось ${formatDuration(deadlineDelta)}.`, durationMs: deadlineDelta, durationText: formatDuration(deadlineDelta), dueAt: request.submissionDeadlineAt });
    }
    if (request.currentStatus === "owner_approval" && currentStage.durationMs >= OWNER_APPROVAL_THRESHOLD_MS) result.push({ id: `${request.id}-owner-approval`, type: "owner_approval_stuck", requestId: request.id, requestTitle: request.title, requestNumber: request.internalNumber, title: "КП зависло на согласовании у МЛ", description: `Этап длится ${currentStage.durationText}.`, durationMs: currentStage.durationMs, durationText: currentStage.durationText });
    if (request.currentStatus === "participation_approved" && (!request.appealNumber || !request.workingFolderUrl)) result.push({ id: `${request.id}-missing-appeal-folder`, type: "missing_appeal_or_folder", requestId: request.id, requestTitle: request.title, requestNumber: request.internalNumber, title: "Нет обращения или рабочей папки", description: "Участие согласовано, но не заполнены номер обращения или рабочая папка." });

    requestTasks.forEach((task) => {
      const delay = getTaskDelay(task, now);
      if (delay.isDelayed && !["canceled"].includes(task.status)) result.push({ id: `${task.id}-overdue`, type: "overdue_task", requestId: request.id, requestTitle: request.title, requestNumber: request.internalNumber, taskId: task.id, title: "Просроченная задача", description: `${task.title}: просрочка ${delay.delayedByText}.`, durationMs: delay.delayedByMs, durationText: delay.delayedByText, dueAt: task.plannedDueAt });
    });
  });

  return result;
}
