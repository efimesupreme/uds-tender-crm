import { externalParticipants, users } from "./mock-data";
import type { RequestStatus, RequestTask } from "./types";
import { isRequestProblem as isWorkflowRequestProblem, isTaskOverdue as isWorkflowTaskOverdue, statusLabels } from "./workflow";

export function formatMoney(value?: number): string {
  if (value === undefined) return "—";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatDateTime(value?: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatDate(value?: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

export function getUserName(userId?: string): string {
  if (!userId) return "—";
  return users.find((user) => user.id === userId)?.fullName ?? "Неизвестный участник";
}

export function getExternalName(externalId?: string): string {
  if (!externalId) return "—";
  return externalParticipants.find((participant) => participant.id === externalId)?.name ?? "Неизвестный участник";
}

export function getAssigneeName(task: RequestTask): string {
  return task.assigneeUserId ? getUserName(task.assigneeUserId) : getExternalName(task.assigneeExternalId);
}

export function isPast(value?: string): boolean {
  if (!value) return false;
  return new Date(value).getTime() < Date.now();
}

export const isTaskOverdue = isWorkflowTaskOverdue;

export const isRequestProblem = isWorkflowRequestProblem;

export function getStatusLabel(status: RequestStatus): string {
  return statusLabels[status];
}

export function getStatusTone(status: RequestStatus): "neutral" | "info" | "warning" | "danger" | "success" {
  if (["won"].includes(status)) return "success";
  if (["lost", "missed_deadline", "withdrawn_after_start"].includes(status)) return "danger";
  if (["owner_approval", "feedback_waiting", "participation_decision"].includes(status)) return "warning";
  if (["submitted", "ready_to_submit", "costs_approved"].includes(status)) return "info";
  if (["not_participating", "canceled_or_paused"].includes(status)) return "neutral";
  return "info";
}
