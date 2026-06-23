import type { Request, RequestEvent, RequestTask } from "./types";
import type { TaskType } from "./workflow";
import { validateRequestTransition } from "./transition-guards";
import { isFinalRequestStatus } from "./workflow";

export type AutomationAction =
  | "create_offer_preparation_task"
  | "create_owner_approval_task"
  | "create_submission_task"
  | "create_feedback_task";

export type AutomationAudience = "u-denis" | "u-katya" | "system";
export type AutomationPriority = "high" | "medium" | "low";

export type AutomationSuggestion = {
  id: string;
  requestId: string;
  title: string;
  reason: string;
  action?: AutomationAction;
  actionLabel?: string;
  audience: AutomationAudience;
  priority: AutomationPriority;
};

const activeTaskStatuses = new Set(["new", "in_progress"]);

export function hasActiveTask(tasks: RequestTask[], requestId: string, taskType: TaskType): boolean {
  return tasks.some((task) => task.requestId === requestId && task.taskType === taskType && activeTaskStatuses.has(task.status));
}

function daysUntil(dateIso: string, now: Date) {
  return Math.ceil((new Date(dateIso).getTime() - now.getTime()) / 86_400_000);
}

export function getAutomationSuggestions(request: Request, tasks: RequestTask[], _events: RequestEvent[], now = new Date()): AutomationSuggestion[] {
  if (isFinalRequestStatus(request.currentStatus)) return [];

  const suggestions: AutomationSuggestion[] = [];
  const missingAppealOrFolder = request.participationDecision === "approved" && (!request.appealNumber || !request.workingFolderUrl);

  if (missingAppealOrFolder) {
    suggestions.push({
      id: `${request.id}:appeal-folder`,
      requestId: request.id,
      title: "Завести обращение и рабочую папку",
      reason: "Участие согласовано, но в карточке нет номера обращения или ссылки на корневую рабочую папку.",
      audience: "u-denis",
      priority: "high"
    });
  }

  const offerPreparationGuard = validateRequestTransition(request, tasks, request.currentStatus, "offer_preparation");
  if (request.costsStatus === "approved" && request.offerStatus !== "in_progress" && request.offerStatus !== "ready" && request.offerStatus !== "with_ml" && request.offerStatus !== "approved" && !hasActiveTask(tasks, request.id, "prepare_offer")) {
    suggestions.push({
      id: `${request.id}:prepare-offer`,
      requestId: request.id,
      title: "Создать задачу Безруковой на подготовку КП",
      reason: offerPreparationGuard.allowed ? "Затраты утверждены, а подготовка КП ещё не начата и активной задачи на КП нет." : `Сначала заполните данные для перехода к КП: ${offerPreparationGuard.errors.join(", ")}.`,
      action: offerPreparationGuard.allowed ? "create_offer_preparation_task" : undefined,
      actionLabel: offerPreparationGuard.allowed ? "Создать задачу на КП" : undefined,
      audience: "u-katya",
      priority: "high"
    });
  }

  const ownerApprovalGuard = validateRequestTransition(request, tasks, request.currentStatus, "owner_approval");
  if (request.offerStatus === "ready" && !request.offerSentToMlAt && !hasActiveTask(tasks, request.id, "owner_approval")) {
    suggestions.push({
      id: `${request.id}:owner-approval`,
      requestId: request.id,
      title: "Передать КП на согласование МЛ",
      reason: ownerApprovalGuard.allowed ? "КП готово, но дата передачи на согласование МЛ не заполнена и активной задачи на согласование нет." : `Сначала заполните данные для передачи КП на согласование: ${ownerApprovalGuard.errors.join(", ")}.`,
      action: ownerApprovalGuard.allowed ? "create_owner_approval_task" : undefined,
      actionLabel: ownerApprovalGuard.allowed ? "Создать задачу на согласование МЛ" : undefined,
      audience: "u-katya",
      priority: "medium"
    });
  }

  const submitGuard = validateRequestTransition(request, tasks, request.currentStatus, "submitted");
  if (request.offerStatus === "approved" && !request.submissionSubmittedAt && !hasActiveTask(tasks, request.id, "submit_offer")) {
    suggestions.push({
      id: `${request.id}:submit-offer`,
      requestId: request.id,
      title: "Создать задачу Безруковой на подачу КП",
      reason: submitGuard.allowed ? "КП согласовано МЛ, но дата подачи ещё не заполнена и активной задачи на подачу нет." : `Сначала заполните данные для подачи КП: ${submitGuard.errors.join(", ")}.`,
      action: submitGuard.allowed ? "create_submission_task" : undefined,
      actionLabel: submitGuard.allowed ? "Создать задачу на подачу" : undefined,
      audience: "u-katya",
      priority: "high"
    });
  }

  if (request.submissionSubmittedAt && !request.nextActionDueAt && !hasActiveTask(tasks, request.id, "other")) {
    suggestions.push({
      id: `${request.id}:plan-feedback`,
      requestId: request.id,
      title: "Запланировать обратную связь с заказчиком",
      reason: "КП подано, но следующее касание с заказчиком не запланировано.",
      action: "create_feedback_task",
      actionLabel: "Создать задачу на обратную связь",
      audience: "u-katya",
      priority: "medium"
    });
  }

  if (request.submissionSubmittedAt && request.nextActionDueAt && new Date(request.nextActionDueAt).getTime() < now.getTime() && !hasActiveTask(tasks, request.id, "other")) {
    suggestions.push({
      id: `${request.id}:overdue-feedback`,
      requestId: request.id,
      title: "Запросить обратную связь",
      reason: "Дата следующего касания прошла, а активной задачи на обратную связь нет.",
      action: "create_feedback_task",
      actionLabel: "Создать задачу на обратную связь",
      audience: "u-katya",
      priority: "high"
    });
  }

  if (request.documentsStatus !== "ready" && request.submissionDeadlineAt && daysUntil(request.submissionDeadlineAt, now) <= 3 && !hasActiveTask(tasks, request.id, "collect_documents")) {
    suggestions.push({
      id: `${request.id}:documents-deadline`,
      requestId: request.id,
      title: "Ускорить комплект документов",
      reason: "Документы не готовы, а срок подачи наступает в ближайшие 3 дня.",
      audience: "u-katya",
      priority: "high"
    });
  }

  return suggestions;
}

export function getSuggestionsForUser(suggestions: AutomationSuggestion[], userId: string): AutomationSuggestion[] {
  return suggestions.filter((suggestion) => suggestion.audience === userId || suggestion.audience === "system");
}
