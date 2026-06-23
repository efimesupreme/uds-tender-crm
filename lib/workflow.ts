import { hasAppealNumber, hasWorkingFolder } from "./folder-structure";
import type { Request, RequestStatus, RequestTask, TaskStatus } from "./types";

export const requestStatuses = [
  "new",
  "participation_decision",
  "not_participating",
  "participation_approved",
  "appeal_and_folder",
  "materials_preparation",
  "materials_received",
  "internal_approval",
  "costs_approved",
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

export const statusLabels: Record<RequestStatus, string> = {
  new: "Новая заявка",
  participation_decision: "На решении об участии",
  not_participating: "Не участвуем",
  participation_approved: "Участие согласовано",
  appeal_and_folder: "Заведение обращения и папки",
  materials_preparation: "Подготовка материалов",
  materials_received: "Материалы получены",
  internal_approval: "Внутреннее согласование",
  costs_approved: "Затраты утверждены",
  offer_preparation: "КП в подготовке",
  owner_approval: "КП на согласовании у МЛ",
  ready_to_submit: "КП готово к подаче",
  submitted: "КП подано",
  feedback_waiting: "Ожидание обратной связи",
  won: "Договор",
  lost: "Проиграли",
  withdrawn_after_start: "Отказались после запуска",
  missed_deadline: "Не успели податься",
  canceled_or_paused: "Отменено / пауза"
};

export const finalRequestStatuses = [
  "not_participating",
  "won",
  "lost",
  "withdrawn_after_start",
  "missed_deadline",
  "canceled_or_paused"
] as const satisfies readonly RequestStatus[];

export const allowedStatusTransitions: Record<RequestStatus, RequestStatus[]> = {
  new: ["participation_decision", "not_participating", "canceled_or_paused"],
  participation_decision: ["participation_approved", "not_participating", "canceled_or_paused"],
  not_participating: [],
  participation_approved: ["appeal_and_folder", "materials_preparation", "withdrawn_after_start", "missed_deadline", "canceled_or_paused"],
  appeal_and_folder: ["materials_preparation", "withdrawn_after_start", "missed_deadline", "canceled_or_paused"],
  materials_preparation: ["materials_received", "internal_approval", "withdrawn_after_start", "missed_deadline", "canceled_or_paused"],
  materials_received: ["internal_approval", "withdrawn_after_start", "missed_deadline", "canceled_or_paused"],
  internal_approval: ["costs_approved", "offer_preparation", "withdrawn_after_start", "missed_deadline", "canceled_or_paused"],
  costs_approved: ["offer_preparation", "withdrawn_after_start", "missed_deadline", "canceled_or_paused"],
  offer_preparation: ["owner_approval", "ready_to_submit", "withdrawn_after_start", "missed_deadline", "canceled_or_paused"],
  owner_approval: ["ready_to_submit", "offer_preparation", "withdrawn_after_start", "missed_deadline", "canceled_or_paused"],
  ready_to_submit: ["submitted", "withdrawn_after_start", "missed_deadline", "canceled_or_paused"],
  submitted: ["feedback_waiting", "won", "lost", "canceled_or_paused"],
  feedback_waiting: ["won", "lost", "canceled_or_paused"],
  won: [],
  lost: [],
  withdrawn_after_start: [],
  missed_deadline: [],
  canceled_or_paused: []
};

export const taskStatuses = ["new", "in_progress", "completed"] as const satisfies readonly TaskStatus[];


export const workTypeOptions = ["ППТ", "ППТЛО", "ПД", "ПД (въезд)", "АН", "Прочее"] as const;
export const sourceTypeOptions = ["МЛ", "Тендер", "Повторное обращение", "Сайт", "Рекомендация"] as const;
export const CUSTOM_SOURCE_TYPE = "Другое / свободный ввод";

export const taskTypes = [
  "participation_decision",
  "create_appeal",
  "approve_costs",
  "contract_review",
  "prepare_protocol",
  "collect_documents",
  "prepare_offer",
  "owner_approval",
  "submit_offer",
  "other"
] as const;

export type TaskType = (typeof taskTypes)[number];

export const taskTypeLabels: Record<TaskType, string> = {
  participation_decision: "Согласовать участие с ГД",
  create_appeal: "Завести обращение",
  approve_costs: "Утвердить затраты",
  contract_review: "Проанализировать договор",
  prepare_protocol: "Подготовить протокол разногласий",
  collect_documents: "Собрать комплект документов",
  prepare_offer: "Подготовить КП",
  owner_approval: "Согласовать КП с МЛ",
  submit_offer: "Подать КП",
  other: "Прочее"
};

const denisDefaultTaskTypes = new Set<TaskType>(["participation_decision", "create_appeal", "approve_costs", "contract_review", "prepare_protocol"]);
const katyaDefaultTaskTypes = new Set<TaskType>(["collect_documents", "prepare_offer", "owner_approval", "submit_offer"]);
export const taskResponsibleOptions = ["u-denis", "u-katya"] as const;
export function getDefaultTaskAssigneeUserId(taskType: TaskType, fallbackUserId = "u-denis"): string {
  if (denisDefaultTaskTypes.has(taskType)) return "u-denis";
  if (katyaDefaultTaskTypes.has(taskType)) return "u-katya";
  if (fallbackUserId === "u-admin") return "u-denis";
  return fallbackUserId || "u-denis";
}
export function getAllowedTaskAssigneeUserIds(_taskType: TaskType): string[] {
  return [...taskResponsibleOptions];
}

export const approvedRequestTaskTemplates: Array<Pick<RequestTask, "title" | "taskType" | "assigneeUserId" | "assigneeExternalId" | "comment">> = [
  { taskType: "create_appeal", title: taskTypeLabels.create_appeal, assigneeUserId: "u-denis" },
  { taskType: "approve_costs", title: taskTypeLabels.approve_costs, assigneeUserId: "u-denis" },
  { taskType: "contract_review", title: taskTypeLabels.contract_review, assigneeUserId: "u-denis" },
  { taskType: "collect_documents", title: taskTypeLabels.collect_documents, assigneeUserId: "u-katya" }
];

export const nonParticipationReasons = [
  { code: "not_our_scope", name: "Не наш предмет" },
  { code: "no_resources", name: "Нет ресурсов" },
  { code: "short_deadline", name: "Короткий срок" },
  { code: "other_region", name: "Другой регион" },
  { code: "bad_contract", name: "Невыгодный договор" },
  { code: "no_contract_draft", name: "Нет проекта договора" },
  { code: "no_inputs", name: "Нет исходных данных" },
  { code: "non_competitive_price", name: "Неконкурентная цена" },
  { code: "construction_required", name: "Требуется СМР" },
  { code: "in_person_required", name: "Требуется личное присутствие" },
  { code: "no_customer_contact", name: "Нет контакта с заказчиком" },
  { code: "not_strategic", name: "Стратегически неинтересно" },
  { code: "other", name: "Прочее" }
] as const;

export const lossReasons = [
  { code: "higher_price", name: "Цена выше конкурентов" },
  { code: "experience", name: "Проиграли по опыту" },
  { code: "deadline", name: "Проиграли по срокам" },
  { code: "contract_terms", name: "Не подошли условия договора" },
  { code: "incumbent", name: "Заказчик выбрал действующего подрядчика" },
  { code: "weak_offer", name: "Недостаточно проработанное КП" },
  { code: "unknown", name: "Причина неизвестна" },
  { code: "other", name: "Прочее" }
] as const;

export const withdrawnAfterStartReasons = [
  { code: "contract_risks", name: "Риски договора" },
  { code: "inputs_not_confirmed", name: "Не подтвердились исходные данные" },
  { code: "no_resources", name: "Не хватает ресурсов" },
  { code: "quality_deadline_risk", name: "Не успеваем подготовить качественное КП" },
  { code: "bad_economics", name: "Экономика стала невыгодной" },
  { code: "management_decision", name: "Решение руководства" },
  { code: "other", name: "Прочее" }
] as const;

export const missedDeadlineReasons = [
  { code: "found_late", name: "Поздно обнаружили тендер" },
  { code: "slow_participation_decision", name: "Долгое решение об участии" },
  { code: "costs_delay", name: "Задержка затрат" },
  { code: "lawyers_delay", name: "Задержка юристов" },
  { code: "offer_delay", name: "Задержка КП" },
  { code: "submission_technical_issue", name: "Техническая проблема подачи" },
  { code: "other", name: "Прочее" }
] as const;

export const canceledOrPausedReasons = [
  { code: "customer_canceled", name: "Заказчик отменил тендер" },
  { code: "customer_rescheduled", name: "Заказчик перенёс срок" },
  { code: "customer_paused", name: "Заказчик заморозил проект" },
  { code: "scope_changed", name: "Изменился состав работ" },
  { code: "no_feedback", name: "Нет обратной связи" },
  { code: "other", name: "Прочее" }
] as const;

export const closureReasonOptionsByStatus = {
  not_participating: nonParticipationReasons,
  lost: lossReasons,
  withdrawn_after_start: withdrawnAfterStartReasons,
  missed_deadline: missedDeadlineReasons,
  canceled_or_paused: canceledOrPausedReasons,
  won: []
} as const;

export function canTransitionRequest(fromStatus: RequestStatus, toStatus: RequestStatus): boolean {
  return allowedStatusTransitions[fromStatus].includes(toStatus);
}

export function getNextAllowedStatuses(status: RequestStatus): RequestStatus[] {
  return allowedStatusTransitions[status];
}

export function createDefaultTasksForApprovedRequest(requestId: string, createdBy: string): RequestTask[] {
  return approvedRequestTaskTemplates.map((template, index) => ({
    id: `${requestId}-approved-task-${index + 1}`,
    requestId,
    title: template.title,
    taskType: template.taskType,
    status: "new",
    createdBy,
    assigneeUserId: template.assigneeUserId ?? getDefaultTaskAssigneeUserId(template.taskType, createdBy),
    assigneeExternalId: template.assigneeExternalId,
    returnedCount: 0,
    comment: template.comment
  }));
}

export function isFinalRequestStatus(status: RequestStatus): boolean {
  return (finalRequestStatuses as readonly RequestStatus[]).includes(status);
}

export function isActiveRequest(status: RequestStatus): boolean {
  return !isFinalRequestStatus(status);
}

export function isTaskOverdue(task: RequestTask, now: Date = new Date()): boolean {
  return Boolean(task.plannedDueAt && !["completed", "accepted", "canceled"].includes(task.status) && new Date(task.plannedDueAt).getTime() < now.getTime());
}

export function isAfterParticipationApproval(status: RequestStatus): boolean {
  return requestStatuses.indexOf(status) >= requestStatuses.indexOf("participation_approved");
}

export function isMissingAppealOrFolderProblem(request: Request): boolean {
  return isActiveRequest(request.currentStatus) && isAfterParticipationApproval(request.currentStatus) && (!hasAppealNumber(request) || !hasWorkingFolder(request));
}

export function isRequestProblem(request: Request, tasks: RequestTask[], now: Date = new Date()): boolean {
  if (isFinalRequestStatus(request.currentStatus)) return false;

  const requestTasks = tasks.filter((task) => task.requestId === request.id);
  const hasNoNextAction = !request.nextActionText;
  const nextActionOverdue = Boolean(request.nextActionDueAt && new Date(request.nextActionDueAt).getTime() < now.getTime());
  const hasOverdueTasks = requestTasks.some((task) => isTaskOverdue(task, now));
  const hasNoTasksAfterApproval = request.currentStatus === "participation_approved" && requestTasks.length === 0;
  const missingAppealOrFolder = isMissingAppealOrFolderProblem(request);

  return hasNoNextAction || nextActionOverdue || hasOverdueTasks || hasNoTasksAfterApproval || missingAppealOrFolder;
}

export const participationDecisionOptions = [
  { code: "pending", name: "Ожидаем" },
  { code: "approved", name: "Участвуем" },
  { code: "rejected", name: "Не участвуем" },
  { code: "needs_clarification", name: "Требуется уточнение" }
] as const;
export const costsStatusOptions = [
  { code: "not_started", name: "Не начато" }, { code: "in_progress", name: "В работе" }, { code: "received", name: "Получено" }, { code: "checking", name: "На проверке" }, { code: "returned", name: "Возвращено" }, { code: "approved", name: "Утверждено" }
] as const;
export const contractAnalysisStatusOptions = [
  { code: "not_required", name: "Не требуется" }, { code: "not_started", name: "Не начато" }, { code: "with_lawyers", name: "У юристов" }, { code: "received", name: "Получено" }, { code: "risks_found", name: "Есть риски" }, { code: "approved", name: "Согласовано" }
] as const;
export const protocolStatusOptions = [
  { code: "not_required", name: "Не требуется" }, { code: "not_started", name: "Не начат" }, { code: "preparing", name: "Готовится" }, { code: "with_lawyers", name: "У юристов" }, { code: "with_gd", name: "У ГД" }, { code: "approved", name: "Согласован" }, { code: "sent", name: "Отправлен" }
] as const;
export const documentsStatusOptions = [
  { code: "not_started", name: "Не начато" }, { code: "in_progress", name: "В работе" }, { code: "missing_documents", name: "Не хватает документов" }, { code: "ready", name: "Готово" }
] as const;
export const offerStatusOptions = [
  { code: "not_started", name: "Не начато" }, { code: "in_progress", name: "В работе" }, { code: "ready", name: "Готово" }, { code: "with_ml", name: "На согласовании у МЛ" }, { code: "returned", name: "Возвращено" }, { code: "approved", name: "Согласовано" }
] as const;
export const feedbackStatusOptions = [
  { code: "waiting", name: "Ожидаем" }, { code: "received", name: "Получена" }, { code: "no_response", name: "Нет ответа" }, { code: "needs_clarification", name: "Требуется уточнение" }, { code: "final_result_received", name: "Финальный результат получен" }
] as const;
