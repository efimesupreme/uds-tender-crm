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
  won: "Победили",
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

export const taskStatuses = ["new", "in_progress", "waiting", "completed", "returned", "accepted", "canceled"] as const satisfies readonly TaskStatus[];

export const taskTypes = [
  "participation_decision",
  "create_appeal",
  "create_folder",
  "prepare_costs",
  "check_costs",
  "contract_review",
  "prepare_protocol",
  "approve_protocol_lawyers",
  "approve_protocol_gd",
  "collect_documents",
  "prepare_offer",
  "owner_approval",
  "submit_offer",
  "request_feedback",
  "record_result"
] as const;

export type TaskType = (typeof taskTypes)[number];

export const taskTypeLabels: Record<TaskType, string> = {
  participation_decision: "Согласовать участие с ГД",
  create_appeal: "Завести обращение",
  create_folder: "Создать рабочую папку",
  prepare_costs: "Подготовить затраты",
  check_costs: "Проверить и принять затраты",
  contract_review: "Проанализировать договор",
  prepare_protocol: "Подготовить протокол разногласий",
  approve_protocol_lawyers: "Согласовать протокол с юристами",
  approve_protocol_gd: "Согласовать протокол с ГД",
  collect_documents: "Собрать комплект документов",
  prepare_offer: "Подготовить КП",
  owner_approval: "Согласовать КП с МЛ",
  submit_offer: "Подать КП",
  request_feedback: "Запросить обратную связь",
  record_result: "Зафиксировать результат"
};

export const approvedRequestTaskTemplates: Array<Pick<RequestTask, "title" | "taskType" | "assigneeUserId" | "assigneeExternalId" | "comment">> = [
  { taskType: "create_appeal", title: taskTypeLabels.create_appeal, assigneeUserId: "u-denis" },
  { taskType: "create_folder", title: taskTypeLabels.create_folder, assigneeUserId: "u-denis" },
  { taskType: "prepare_costs", title: taskTypeLabels.prepare_costs, assigneeExternalId: "e-gip" },
  { taskType: "contract_review", title: taskTypeLabels.contract_review, assigneeExternalId: "e-lawyers" },
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
  { code: "price", name: "Цена" },
  { code: "terms", name: "Сроки" },
  { code: "experience", name: "Опыт / квалификация" },
  { code: "competitor", name: "Выбран конкурент" },
  { code: "no_feedback", name: "Нет обратной связи" },
  { code: "other", name: "Прочее" }
] as const;

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
    assigneeUserId: template.assigneeUserId,
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
