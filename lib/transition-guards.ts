import type { Request, RequestStatus, RequestTask } from "./types";
import { canTransitionRequest, isFinalRequestStatus, taskTypeLabels, type TaskType } from "./workflow";

export type TransitionRequirement = { id: string; label: string; required: boolean; met: boolean };
export type TransitionValidationResult = { allowed: boolean; errors: string[]; warnings: string[] };

const hasText = (value?: string) => Boolean(value?.trim());
const hasPositiveNumber = (value?: number) => typeof value === "number" && Number.isFinite(value) && value > 0;
const taskTypesForMaterials: TaskType[] = ["prepare_costs", "contract_review", "collect_documents"];
const activeTaskStatuses = new Set(["new", "in_progress", "waiting", "completed", "accepted"]);

function hasTask(tasks: RequestTask[], requestId: string, type: TaskType) {
  return tasks.some((task) => task.requestId === requestId && task.taskType === type && activeTaskStatuses.has(task.status));
}

function hasMaterialsTasks(request: Request, tasks: RequestTask[]) {
  return taskTypesForMaterials.every((type) => hasTask(tasks, request.id, type));
}

function requirementsFor(request: Request, tasks: RequestTask[], toStatus: RequestStatus): TransitionRequirement[] {
  const base: TransitionRequirement[] = [];
  const add = (id: string, label: string, required: boolean, met: boolean) => base.push({ id, label, required, met });

  if (toStatus === "participation_decision") {
    add("title", "наименование заявки", true, hasText(request.title));
    add("customerName", "заказчик", true, hasText(request.customerName));
    add("workType", "вид работ", true, hasText(request.workType));
    add("sourceType", "источник", true, hasText(request.sourceType));
    add("ownerUserId", "ответственный", true, hasText(request.ownerUserId));
    add("submissionDeadlineAt", "срок подачи", false, hasText(request.submissionDeadlineAt));
  }

  if (toStatus === "participation_approved") {
    add("participationDecision", "зафиксированное решение об участии: участвуем", true, request.participationDecision === "approved");
    add("participationDecisionProof", "комментарий или дата решения ГД", true, hasText(request.participationDecisionComment) || hasText(request.participationDecisionReceivedAt));
    add("submissionDeadlineAt", "срок подачи", false, hasText(request.submissionDeadlineAt));
  }

  if (toStatus === "appeal_and_folder") add("participationApproved", "участие согласовано", true, request.participationDecision === "approved");

  if (["materials_preparation", "materials_received", "internal_approval", "costs_approved", "offer_preparation", "owner_approval", "ready_to_submit", "submitted", "feedback_waiting"].includes(toStatus)) {
    add("appealNumber", "номер обращения", true, hasText(request.appealNumber));
    add("workingFolderUrl", "ссылка на корневую рабочую папку", true, hasText(request.workingFolderUrl));
  }

  if (toStatus === "materials_preparation") {
    add("materialsTasks", `задачи ${taskTypesForMaterials.map((type) => taskTypeLabels[type]).join(" / ")} назначены или созданы`, true, hasMaterialsTasks(request, tasks));
  }

  if (toStatus === "costs_approved") {
    add("costsStatus", "статус затрат: утверждено", true, request.costsStatus === "approved");
    add("costAmountOrComment", "сумма затрат или комментарий, почему сумма не требуется", true, hasPositiveNumber(request.costAmount) || hasText(request.costsRiskComment));
    add("plannedMarginPercent", "плановая маржинальность", false, hasPositiveNumber(request.plannedMarginPercent));
    add("offerAmount", "сумма КП", false, hasPositiveNumber(request.offerAmount));
  }

  if (toStatus === "offer_preparation") {
    add("costsApproved", "затраты утверждены", true, request.costsStatus === "approved");
    add("offerAmountOrPlannedPrice", "сумма КП или плановая цена", true, hasPositiveNumber(request.offerAmount) || hasPositiveNumber(request.costAmount));
  }

  if (toStatus === "owner_approval") {
    add("offerStatusReady", "статус КП: готово", true, request.offerStatus === "ready");
    add("offerAmount", "сумма КП", true, hasPositiveNumber(request.offerAmount));
    add("offerPreparedProof", "дата подготовки КП или комментарий", true, hasText(request.offerPreparedAt) || hasText(request.offerComment));
  }

  if (toStatus === "ready_to_submit") {
    add("offerStatusApproved", "статус КП: согласовано", true, request.offerStatus === "approved");
    add("documentsReady", "документы для подачи: готовы", true, request.documentsStatus === "ready");
    add("submissionMethod", "способ подачи", false, hasText(request.submissionMethod));
  }

  if (toStatus === "submitted") {
    add("offerStatusApproved", "КП согласовано", true, request.offerStatus === "approved");
    add("documentsReady", "документы готовы", true, request.documentsStatus === "ready");
    add("offerAmount", "сумма КП", true, hasPositiveNumber(request.offerAmount));
    add("submissionSubmittedAt", "дата подачи", true, hasText(request.submissionSubmittedAt));
    add("submissionSubmittedBy", "кто подал", true, hasText(request.submissionSubmittedBy));
    add("submissionMethod", "способ подачи", false, hasText(request.submissionMethod));
  }

  if (toStatus === "feedback_waiting") {
    add("submissionSubmittedAt", "дата подачи", true, hasText(request.submissionSubmittedAt));
    add("nextAction", "следующий шаг или дата следующего касания", true, hasText(request.nextActionText) || hasText(request.nextActionDueAt));
  }

  return base;
}

export function getTransitionRequirements(fromStatus: RequestStatus, toStatus: RequestStatus): TransitionRequirement[] {
  if (!canTransitionRequest(fromStatus, toStatus) || isFinalRequestStatus(toStatus)) return [];
  return requirementsFor({ id: "", internalNumber: "", title: "", customerName: "", region: "", sourceType: "", requestType: "", workType: "", currentStatus: fromStatus, participationDecision: "pending", ownerUserId: "", resultStatus: "none", createdAt: "" }, [], toStatus);
}

export function getMissingRequiredFields(request: Request, toStatus: RequestStatus, tasks: RequestTask[] = []): string[] {
  return requirementsFor(request, tasks, toStatus).filter((item) => item.required && !item.met).map((item) => item.label);
}

export function validateRequestTransition(request: Request, tasks: RequestTask[], fromStatus: RequestStatus, toStatus: RequestStatus): TransitionValidationResult {
  if (!canTransitionRequest(fromStatus, toStatus)) return { allowed: false, errors: ["Переход не разрешён процессом"], warnings: [] };
  if (isFinalRequestStatus(toStatus)) return { allowed: false, errors: ["Финальные статусы закрываются через форму результата с причиной и комментарием"], warnings: [] };
  const requirements = requirementsFor(request, tasks, toStatus);
  const errors = requirements.filter((item) => item.required && !item.met).map((item) => item.label);
  const warnings = requirements.filter((item) => !item.required && !item.met).map((item) => item.label);
  return { allowed: errors.length === 0, errors, warnings };
}
