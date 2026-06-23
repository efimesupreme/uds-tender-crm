"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { events, fileLinks, requests, statusHistory, tasks } from "./mock-data";
import type { ContractAnalysisStatus, CostsStatus, DocumentsStatus, FeedbackStatus, FileLink, OfferStatus, ParticipationDecision, ProtocolStatus, Request, RequestEvent, RequestResult, RequestStatus, RequestTask, SourceType, StatusHistoryItem, TaskStatus, WorkType } from "./types";
import { getEmptyPlans, type KpOfferPlans } from "./dashboard-metrics";
import { hasActiveTask, type AutomationAction } from "./process-automation";
import { validateRequestTransition, type TransitionValidationResult } from "./transition-guards";
import { canTransitionRequest, createDefaultTasksForApprovedRequest, getDefaultTaskAssigneeUserId, isFinalRequestStatus, taskTypeLabels, type TaskType } from "./workflow";

export const STORAGE_KEY = "uds-tender-crm-demo-store-v1";
const LEGACY_STORAGE_KEYS = ["uds-tender-crm-demo-store", "uds-tender-crm-store", "uds-tender-crm-demo-store-v0"];
export const DEFAULT_USER_ID = "u-denis";
const DEFAULT_ACTOR_ID = DEFAULT_USER_ID;

export type CrmState = {
  requests: Request[];
  tasks: RequestTask[];
  statusHistory: StatusHistoryItem[];
  events: RequestEvent[];
  fileLinks: FileLink[];
  currentUserId: string;
  kpOfferPlans: KpOfferPlans;
  isHydrated: boolean;
};

type CreateRequestInput = {
  title: string;
  customerName: string;
  region: string;
  workType: WorkType;
  submissionDeadlineAt?: string;
  ownerUserId: string;
  sourceType: SourceType;
  sourceCustomValue?: string;
};

type UpdateAppealAndFolderInput = {
  appealNumber?: string;
  workingFolderUrl?: string;
  folderCreatedAt?: string;
};

export type CloseRequestInput = {
  status: RequestStatus;
  closureReason?: string;
  closureComment?: string;
  resultReceivedAt?: string;
  closedAt?: string;
  ourPrice?: number;
  winnerPrice?: number;
  lossReason?: string;
};

type UpdateParticipationBlockInput = Pick<Request, "participationSentToGdAt" | "participationDecisionReceivedAt" | "participationDecision" | "participationDecisionComment" | "participationDecisionRecordedBy">;
type UpdateCostsBlockInput = Pick<Request, "costsResponsibleId" | "costsTaskSetAt" | "costsPlannedDueAt" | "costsReceivedAt" | "costsStatus" | "costAmount" | "offerAmount" | "plannedMarginPercent" | "costsReturnCount" | "costsRiskComment" | "costsApprovedAt">;
type UpdateContractBlockInput = Pick<Request, "contractHasDraft" | "contractAnalysisStatus" | "contractSentToLawyersAt" | "contractAnalysisReceivedAt" | "contractKeyRisks" | "protocolNeeded" | "protocolStatus" | "protocolPreparedAt" | "protocolLawyersApprovedAt" | "protocolGdApprovedAt" | "contractComment">;
type UpdateDocumentsBlockInput = Pick<Request, "documentsStatus" | "documentsResponsibleId" | "documentsMissingText" | "documentsReadyAt" | "documentsComment">;
type UpdateOfferBlockInput = Pick<Request, "offerCostsTransferredToKatyaAt" | "offerStatus" | "offerAmount" | "offerPreparedAt" | "offerSentToMlAt" | "offerMlApprovedAt" | "offerReturnCount" | "submissionMethod" | "submissionSubmittedBy" | "submissionSubmittedAt" | "offerComment">;
type UpdateFeedbackBlockInput = Pick<Request, "nextActionDueAt" | "feedbackStatus" | "feedbackReceivedAt" | "feedbackCustomerComment" | "nextActionText">;

export type TransitionRequestResult = TransitionValidationResult & { warnings: string[] };

type CreateTaskInput = {
  title: string;
  taskType?: TaskType;
  assigneeUserId?: string;
  assigneeExternalId?: string;
  plannedDueAt?: string;
  comment?: string;
  createdBy?: string;
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function normalizeDemoUserLabels<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)
    .replaceAll("Денис", "Тагиев")
    .replaceAll("Катя", "Безрукова")
    .replaceAll("Победили", "Договор")
  ) as T;
}

function normalizePlans(plans?: Partial<KpOfferPlans>): KpOfferPlans {
  const next = getEmptyPlans();
  Object.entries(plans ?? {}).forEach(([year, quarters]) => {
    next[year] = { ...next[year], Q1: 0, Q2: 0, Q3: 0, Q4: 0, ...quarters };
  });
  return next;
}

function normalizeStoredState(value: CrmState): CrmState {
  const normalized = normalizeDemoUserLabels(value);
  return { ...normalized, kpOfferPlans: normalizePlans(normalized.kpOfferPlans) };
}

function initialState(): CrmState {
  return clone({ requests, tasks, statusHistory, events, fileLinks, currentUserId: DEFAULT_USER_ID, kpOfferPlans: getEmptyPlans(), isHydrated: false });
}

let state: CrmState = initialState();
const listeners = new Set<() => void>();

function isBrowser() {
  return typeof window !== "undefined";
}

function nowIso() {
  return new Date().toISOString();
}

function generateId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function readStoredState(): CrmState {
  if (!isBrowser()) return state;

  const userId = window.localStorage.getItem(`${STORAGE_KEY}:current-user`) || DEFAULT_USER_ID;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = initialState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return { ...seeded, currentUserId: userId, isHydrated: true };
  }

  try {
    return normalizeStoredState({ ...initialState(), ...JSON.parse(raw), currentUserId: userId, isHydrated: true } as CrmState);
  } catch {
    const seeded = initialState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return { ...seeded, currentUserId: userId, isHydrated: true };
  }
}

function writeState(nextState: CrmState) {
  state = nextState;
  if (isBrowser()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    window.localStorage.setItem(`${STORAGE_KEY}:current-user`, nextState.currentUserId);
  }
  listeners.forEach((listener) => listener());
}

function updateState(updater: (current: CrmState) => CrmState) {
  writeState(normalizeDemoUserLabels(updater(state)));
}


function normalizeDate(value?: string) {
  return value ? new Date(value).toISOString() : undefined;
}

function normalizeText(value?: string) {
  return value?.trim() || undefined;
}
function generateRequestId() {
  return generateId("r");
}

function generateTaskId() {
  return generateId("t");
}

function createEvent(input: Omit<RequestEvent, "id" | "createdAt">, createdAt = nowIso()): RequestEvent {
  return { id: generateId("ev"), createdAt, ...input };
}

function createStatusHistoryItem(input: Omit<StatusHistoryItem, "id" | "changedAt">, changedAt = nowIso()): StatusHistoryItem {
  return { id: generateId("h"), changedAt, ...input };
}

function updateRequestById(requests: Request[], requestId: string, updater: (request: Request) => Request): Request[] {
  return requests.map((request) => request.id === requestId ? updater(request) : request);
}

function updateTaskById(tasks: RequestTask[], taskId: string, updater: (task: RequestTask) => RequestTask): RequestTask[] {
  return tasks.map((task) => task.id === taskId ? updater(task) : task);
}

function getCurrentUserOrFallback(userId?: string): string {
  return userId?.trim() || DEFAULT_USER_ID;
}

function useStoreState() {
  useEffect(() => {
    state = readStoredState();
    listeners.forEach((listener) => listener());
  }, []);

  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state
  );
}

export function useCrmStore() {
  const snapshot = useStoreState();

  const resetDemoData = useCallback(() => {
    if (isBrowser()) {
      window.localStorage.removeItem(STORAGE_KEY);
      LEGACY_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    }
    writeState({ ...initialState(), currentUserId: DEFAULT_USER_ID, isHydrated: true });
  }, []);

  const setCurrentUser = useCallback((userId: string) => {
    writeState({ ...state, currentUserId: getCurrentUserOrFallback(userId) });
  }, []);

  const updateKpOfferPlan = useCallback((year: number, quarter: keyof KpOfferPlans[string], value: number) => {
    updateState((current) => ({
      ...current,
      kpOfferPlans: normalizePlans({
        ...current.kpOfferPlans,
        [String(year)]: {
          ...(current.kpOfferPlans[String(year)] ?? { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }),
          [quarter]: Number.isFinite(value) ? Math.max(0, value) : 0
        }
      })
    }));
  }, []);

  const createRequest = useCallback((input: CreateRequestInput, actorUserId = getCurrentUserOrFallback(state.currentUserId)) => {
    const createdAt = nowIso();
    const requestId = generateRequestId();
    const nextNumber = `T-${new Date().getFullYear()}-${String(state.requests.length + 1).padStart(3, "0")}`;
    const newRequest: Request = {
      id: requestId,
      internalNumber: nextNumber,
      title: input.title,
      customerName: input.customerName,
      region: input.region,
      sourceType: input.sourceType,
      sourceCustomValue: normalizeText(input.sourceCustomValue),
      requestType: "Запрос КП",
      workType: input.workType,
      submissionDeadlineAt: input.submissionDeadlineAt ? new Date(input.submissionDeadlineAt).toISOString() : undefined,
      currentStatus: "new",
      participationDecision: "pending",
      ownerUserId: input.ownerUserId,
      resultStatus: "none",
      createdAt
    };

    updateState((current) => {
      const initialTaskExists = current.tasks.some(
        (task) => task.requestId === requestId && task.taskType === "participation_decision",
      );
      const initialTask: RequestTask | undefined = initialTaskExists
        ? undefined
        : {
          id: generateTaskId(),
          requestId,
          title: taskTypeLabels.participation_decision,
          taskType: "participation_decision",
          status: "new",
          createdBy: actorUserId,
          assigneeUserId: "u-denis",
          createdAt,
          returnedCount: 0,
          comment: "Первый шаг workflow после создания заявки",
        };

      return {
        ...current,
        requests: [newRequest, ...current.requests],
        tasks: initialTask ? [initialTask, ...current.tasks] : current.tasks,
        statusHistory: [createStatusHistoryItem({ requestId, toStatus: "new", changedBy: actorUserId }, createdAt), ...current.statusHistory],
        events: [
          ...(initialTask ? [
            createEvent({ requestId, taskId: initialTask.id, eventType: "task_created", actorUserId, comment: `Создана задача «${initialTask.title}»` }, createdAt),
            createEvent({ requestId, taskId: initialTask.id, eventType: "workflow_started", actorUserId, comment: "Workflow запущен" }, createdAt),
          ] : []),
          createEvent({ requestId, eventType: "request_created", actorUserId, comment: "Заявка создана" }, createdAt),
          ...current.events
        ]
      };
    });
    return newRequest;
  }, []);

  const transitionRequest = useCallback((requestId: string, toStatus: RequestStatus, actorUserId: string, comment?: string): TransitionRequestResult => {
    let result: TransitionRequestResult = { allowed: false, errors: ["Заявка не найдена"], warnings: [] };
    updateState((current) => {
      const request = current.requests.find((item) => item.id === requestId);
      if (!request) return current;
      if (!canTransitionRequest(request.currentStatus, toStatus)) {
        result = { allowed: false, errors: ["Переход не разрешён процессом"], warnings: [] };
        return current;
      }
      result = validateRequestTransition(request, current.tasks, request.currentStatus, toStatus);
      if (!result.allowed) return current;
      const changedAt = nowIso();
      const defaultTasks = toStatus === "participation_approved" && !current.tasks.some((task) => task.requestId === requestId)
        ? createDefaultTasksForApprovedRequest(requestId, actorUserId).map((task) => ({ ...task, id: generateTaskId() }))
        : [];

      return {
        ...current,
        requests: updateRequestById(current.requests, requestId, (item) => ({ ...item, currentStatus: toStatus, participationDecision: toStatus === "participation_approved" ? "approved" : item.participationDecision })),
        tasks: [...defaultTasks, ...current.tasks],
        statusHistory: [createStatusHistoryItem({ requestId, fromStatus: request.currentStatus, toStatus, changedBy: actorUserId, comment }, changedAt), ...current.statusHistory],
        events: [
          createEvent({ requestId, eventType: "status_changed", actorUserId, oldValue: request.currentStatus, newValue: toStatus, comment }, changedAt),
          ...defaultTasks.map((task) => createEvent({ requestId, taskId: task.id, eventType: "task_created", actorUserId, comment: task.title }, changedAt)),
          ...current.events
        ]
      };
    });
    return result;
  }, []);


  const closeRequest = useCallback((requestId: string, input: CloseRequestInput, actorUserId: string) => {
    const comment = input.closureComment?.trim();
    const reason = input.closureReason?.trim();
    const lossReason = input.lossReason?.trim() || reason;

    if (!isFinalRequestStatus(input.status)) {
      throw new Error("Выбранный статус не является финальным");
    }
    if (input.status === "won" && (!input.resultReceivedAt || !comment)) {
      throw new Error("Для договоры обязательны дата результата и комментарий");
    }
    if (input.status === "lost" && (!lossReason || !comment)) {
      throw new Error("Для проигрыша обязательны причина проигрыша и комментарий");
    }
    if (["not_participating", "withdrawn_after_start", "missed_deadline", "canceled_or_paused"].includes(input.status) && (!reason || !comment)) {
      throw new Error("Для закрытия обязательны причина и комментарий");
    }

    updateState((current) => {
      const request = current.requests.find((item) => item.id === requestId);
      if (!request || isFinalRequestStatus(request.currentStatus)) return current;
      if (input.status === "lost" && request.offerAmount && input.ourPrice === undefined) {
        throw new Error("Для проигрыша заполните нашу цену или очистите сумму КП в заявке");
      }

      const at = input.closedAt ? new Date(input.closedAt).toISOString() : nowIso();
      const resultReceivedAt = input.resultReceivedAt ? new Date(input.resultReceivedAt).toISOString() : at;
      const resultStatus: RequestResult = (input.status === "canceled_or_paused" ? "paused" : input.status) as RequestResult;
      const requestClosedEvent = createEvent({ requestId, eventType: "request_closed", actorUserId, oldValue: request.currentStatus, newValue: input.status, comment }, at);
      const specificEventType = input.status === "won"
        ? "request_won"
        : input.status === "lost"
          ? "request_lost"
          : input.status === "withdrawn_after_start"
            ? "request_withdrawn"
            : input.status === "not_participating"
              ? "not_participating_recorded"
              : undefined;

      return {
        ...current,
        requests: updateRequestById(current.requests, requestId, (item) => ({
          ...item,
          currentStatus: input.status,
          participationDecision: input.status === "not_participating" ? "rejected" : item.participationDecision,
          nonParticipationReason: input.status === "not_participating" ? reason : item.nonParticipationReason,
          resultStatus,
          resultReceivedAt,
          closedAt: at,
          closedBy: actorUserId,
          closureReason: reason,
          closureComment: comment,
          resultComment: comment,
          lossReason: input.status === "lost" ? lossReason : item.lossReason,
          ourPrice: input.ourPrice ?? item.ourPrice,
          winnerPrice: input.winnerPrice ?? item.winnerPrice
        })),
        statusHistory: [createStatusHistoryItem({ requestId, fromStatus: request.currentStatus, toStatus: input.status, changedBy: actorUserId, comment }, at), ...current.statusHistory],
        events: [
          requestClosedEvent,
          ...(specificEventType ? [createEvent({ requestId, eventType: specificEventType, actorUserId, newValue: input.status, comment: reason ? `${reason}: ${comment}` : comment }, at)] : []),
          ...current.events
        ]
      };
    });
  }, []);

  const createTask = useCallback((requestId: string, input: CreateTaskInput) => {
    const createdAt = nowIso();
    const taskType = input.taskType ?? "prepare_offer";
    const task: RequestTask = { id: generateTaskId(), requestId, title: input.title, taskType, status: "new", createdBy: input.createdBy ?? DEFAULT_ACTOR_ID, assigneeUserId: input.assigneeUserId ?? getDefaultTaskAssigneeUserId(taskType, input.createdBy), assigneeExternalId: input.assigneeExternalId, plannedDueAt: input.plannedDueAt, createdAt, returnedCount: 0, comment: input.comment };
    updateState((current) => ({ ...current, tasks: [task, ...current.tasks], events: [createEvent({ requestId, taskId: task.id, eventType: "task_created", actorUserId: task.createdBy, comment: task.title }, createdAt), ...current.events] }));
    return task;
  }, []);


  const createAutomationTask = useCallback((requestId: string, taskType: TaskType, title: string, assigneeUserId: string, actorUserId: string, comment: string) => {
    const createdAt = nowIso();
    let createdTask: RequestTask | undefined;
    updateState((current) => {
      const request = current.requests.find((item) => item.id === requestId);
      if (!request || hasActiveTask(current.tasks, requestId, taskType)) return current;
      createdTask = { id: generateTaskId(), requestId, title, taskType, status: "new", createdBy: actorUserId, assigneeUserId: assigneeUserId || getDefaultTaskAssigneeUserId(taskType, actorUserId), createdAt, returnedCount: 0, comment };
      return {
        ...current,
        tasks: [createdTask, ...current.tasks],
        events: [
          createEvent({ requestId, taskId: createdTask.id, eventType: "automation_task_created", actorUserId, comment }, createdAt),
          createEvent({ requestId, taskId: createdTask.id, eventType: "task_created", actorUserId, comment: title }, createdAt),
          ...current.events
        ]
      };
    });
    return createdTask;
  }, []);

  const createOfferPreparationTask = useCallback((requestId: string, actorUserId = getCurrentUserOrFallback(state.currentUserId)) => createAutomationTask(requestId, "prepare_offer", taskTypeLabels.prepare_offer, "u-katya", actorUserId, "Автоматический сценарий: создана задача на подготовку КП"), [createAutomationTask]);
  const createOwnerApprovalTask = useCallback((requestId: string, actorUserId = getCurrentUserOrFallback(state.currentUserId)) => createAutomationTask(requestId, "owner_approval", taskTypeLabels.owner_approval, "u-katya", actorUserId, "Автоматический сценарий: создана задача на согласование КП с МЛ"), [createAutomationTask]);
  const createSubmissionTask = useCallback((requestId: string, actorUserId = getCurrentUserOrFallback(state.currentUserId)) => createAutomationTask(requestId, "submit_offer", taskTypeLabels.submit_offer, "u-katya", actorUserId, "Автоматический сценарий: создана задача на подачу КП"), [createAutomationTask]);
  const createFeedbackTask = useCallback((requestId: string, actorUserId = getCurrentUserOrFallback(state.currentUserId)) => createAutomationTask(requestId, "other", taskTypeLabels.other, getDefaultTaskAssigneeUserId("other", actorUserId), actorUserId, "Автоматический сценарий: запланируйте обратную связь"), [createAutomationTask]);

  const applyAutomationSuggestion = useCallback((suggestionId: string, actorUserId = getCurrentUserOrFallback(state.currentUserId)) => {
    const [requestId, actionKey] = suggestionId.split(":");
    const actionByKey: Partial<Record<string, AutomationAction>> = {
      "prepare-offer": "create_offer_preparation_task",
      "owner-approval": "create_owner_approval_task",
      "submit-offer": "create_submission_task",
      "plan-feedback": "create_feedback_task",
      "overdue-feedback": "create_feedback_task"
    };
    const action = actionByKey[actionKey];
    if (action === "create_offer_preparation_task") return createOfferPreparationTask(requestId, actorUserId);
    if (action === "create_owner_approval_task") return createOwnerApprovalTask(requestId, actorUserId);
    if (action === "create_submission_task") return createSubmissionTask(requestId, actorUserId);
    if (action === "create_feedback_task") return createFeedbackTask(requestId, actorUserId);
    return undefined;
  }, [createFeedbackTask, createOfferPreparationTask, createOwnerApprovalTask, createSubmissionTask]);

  const setTaskStatus = useCallback((taskId: string, status: TaskStatus, actorUserId: string, comment?: string, resultText?: string) => {
    updateState((current) => {
      const task = current.tasks.find((item) => item.id === taskId);
      if (!task) return current;
      const at = nowIso();
      const start = task.startedAt ?? task.createdAt;
      const actualDurationMinutes = status === "completed" && start ? Math.max(0, Math.round((new Date(at).getTime() - new Date(start).getTime()) / 60000)) : task.actualDurationMinutes;
      return {
        ...current,
        tasks: updateTaskById(current.tasks, taskId, (item) => ({ ...item, status, startedAt: status === "in_progress" ? (item.startedAt ?? at) : item.startedAt, comment: comment ?? item.comment, resultText: resultText ?? item.resultText, completedAt: status === "completed" ? at : item.completedAt, actualDurationMinutes })),
        events: [createEvent({ requestId: task.requestId, taskId, eventType: `task_${status}`, actorUserId, comment: resultText ?? comment }, at), ...current.events]
      };
    });
  }, []);


  const updateTaskAssignee = useCallback((taskId: string, assigneeUserId: string, actorUserId: string) => {
    updateState((current) => {
      const task = current.tasks.find((item) => item.id === taskId);
      if (!task || task.assigneeUserId === assigneeUserId) return current;
      const at = nowIso();
      return {
        ...current,
        tasks: updateTaskById(current.tasks, taskId, (item) => ({ ...item, assigneeUserId, assigneeExternalId: undefined })),
        events: [createEvent({ requestId: task.requestId, taskId, eventType: "task_assignee_changed", actorUserId, oldValue: task.assigneeUserId, newValue: assigneeUserId, comment: "Ответственный по задаче изменён" }, at), ...current.events]
      };
    });
  }, []);

  const updateTaskExecutor = useCallback((taskId: string, executorName: string, actorUserId: string) => {
    updateState((current) => {
      const task = current.tasks.find((item) => item.id === taskId);
      const normalized = executorName.trim();
      if (!task || (task.executorName ?? "") === normalized) return current;
      const at = nowIso();
      return {
        ...current,
        tasks: updateTaskById(current.tasks, taskId, (item) => ({ ...item, executorName: normalized || undefined })),
        events: [createEvent({ requestId: task.requestId, taskId, eventType: "task_executor_changed", actorUserId, oldValue: task.executorName, newValue: normalized, comment: "Исполнитель задачи изменён" }, at), ...current.events]
      };
    });
  }, []);

  const completeTaskWithEffects = useCallback((taskId: string, actorUserId: string) => {
    let messages: string[] = ["Задача выполнена"];
    updateState((current) => {
      const task = current.tasks.find((item) => item.id === taskId);
      const request = task ? current.requests.find((item) => item.id === task.requestId) : undefined;
      if (!task || !request) return current;
      const at = nowIso();
      const start = task.startedAt ?? task.createdAt;
      const duration = start ? Math.max(0, Math.round((new Date(at).getTime() - new Date(start).getTime()) / 60000)) : null;
      const nextTasks: RequestTask[] = [];
      const eventsToAdd: RequestEvent[] = [createEvent({ requestId: task.requestId, taskId, eventType: "task_completed", actorUserId, comment: "Задача выполнена" }, at)];
      const taskExists = (taskType: TaskType) => current.tasks.some((item) => item.requestId === task.requestId && item.taskType === taskType) || nextTasks.some((item) => item.taskType === taskType);
      const addTask = (taskType: TaskType, comment: string, assigneeUserId = getDefaultTaskAssigneeUserId(taskType, actorUserId)) => {
        if (taskExists(taskType)) return false;
        const created: RequestTask = { id: generateTaskId(), requestId: task.requestId, title: taskTypeLabels[taskType], taskType, status: "new", createdBy: actorUserId, assigneeUserId, createdAt: at, returnedCount: 0, comment };
        nextTasks.push(created);
        eventsToAdd.push(createEvent({ requestId: task.requestId, taskId: created.id, eventType: "task_created", actorUserId, comment }, at));
        return true;
      };
      const addWorkflowEvent = (eventType: string, comment: string) => eventsToAdd.push(createEvent({ requestId: task.requestId, taskId, eventType, actorUserId, comment }, at));
      const allExist = (types: TaskType[]) => types.every(taskExists);
      const patch: Partial<Request> = {};
      const warn = (text: string) => messages.push(text);
      const createdMessage = (text: string) => { messages = [text]; };

      if (task.taskType === "participation_decision") {
        if (addTask("create_appeal", "После согласования участия создана задача “Завести обращение”", "u-denis")) {
          addWorkflowEvent("workflow_next_task_created", "После согласования участия создана задача “Завести обращение”");
          createdMessage("Задача выполнена. Создана следующая задача: Завести обращение");
        } else createdMessage("Задача выполнена. Следующая задача уже была создана ранее");
      }
      if (task.taskType === "create_appeal") {
        const created = [
          addTask("approve_costs", "Запущена подготовка материалов: затраты", "u-denis"),
          addTask("contract_review", "Запущена подготовка материалов: договор", "u-denis"),
          addTask("collect_documents", "Запущена подготовка материалов: документы", "u-katya"),
        ].some(Boolean);
        addWorkflowEvent("materials_preparation_started", "Запущена подготовка материалов: затраты, договор, документы");
        createdMessage(created ? "Задача выполнена. Запущена подготовка материалов: затраты, договор, документы" : "Задача выполнена. Следующие задачи уже были созданы ранее");
      }
      if (task.taskType === "approve_costs") {
        if (addTask("prepare_offer", "Затраты утверждены, подготовьте КП", "u-katya")) createdMessage("Задача выполнена. Создана задача: Подготовить КП");
        else createdMessage("Задача выполнена. Следующая задача уже была создана ранее");
        if (request.costsStatus !== "approved" || !request.costAmount) {
          const warning = "Предупреждение: данных по затратам недостаточно для полноценного перехода статуса";
          warn(warning);
          addWorkflowEvent("workflow_warning", warning);
        }
      }
      if (task.taskType === "contract_review") {
        if (addTask("prepare_protocol", "После анализа договора подготовьте протокол разногласий", "u-denis")) createdMessage("Задача выполнена. Создана задача: Подготовить протокол разногласий");
        else createdMessage("Задача выполнена. Следующая задача уже была создана ранее");
      }
      if (task.taskType === "prepare_protocol") {
        addWorkflowEvent("contract_part_prepared", "Договорная часть подготовлена");
        createdMessage(allExist(["approve_costs", "collect_documents", "prepare_offer"]) ? "Задача выполнена. Договорная часть подготовлена, материалы готовы к КП" : "Задача выполнена. Договорная часть подготовлена");
      }
      if (task.taskType === "collect_documents") {
        addWorkflowEvent("documents_prepared", "Комплект документов подготовлен");
        createdMessage(allExist(["approve_costs", "prepare_protocol", "prepare_offer"]) ? "Задача выполнена. Комплект документов подготовлен, материалы готовы к КП" : "Задача выполнена. Комплект документов подготовлен");
      }
      if (task.taskType === "prepare_offer") {
        if (addTask("owner_approval", "КП подготовлено, согласуйте КП с МЛ", "u-katya")) createdMessage("Задача выполнена. Создана задача: Согласовать КП с МЛ");
        else createdMessage("Задача выполнена. Следующая задача уже была создана ранее");
      }
      if (task.taskType === "owner_approval") {
        if (addTask("submit_offer", "КП согласовано, подайте КП", "u-katya")) createdMessage("Задача выполнена. Создана задача: Подать КП");
        else createdMessage("Задача выполнена. Следующая задача уже была создана ранее");
      }
      if (task.taskType === "submit_offer") {
        if (canTransitionRequest(request.currentStatus, "submitted")) {
          const guard = validateRequestTransition(request, current.tasks, request.currentStatus, "submitted");
          if (guard.allowed) {
            patch.currentStatus = "submitted";
            createdMessage("Задача выполнена. КП подано, статус заявки обновлён");
          } else {
            warn(`Предупреждение: переход в статус «КП подано» невозможен: ${guard.errors.join(", ")}`);
            addWorkflowEvent("offer_submitted", "КП подано, но статус заявки не изменён из-за ограничений данных");
          }
        } else {
          addWorkflowEvent("offer_submitted", "КП подано");
          createdMessage("Задача выполнена. Зафиксирована подача КП");
        }
      }
      return {
        ...current,
        requests: Object.keys(patch).length ? updateRequestById(current.requests, task.requestId, (item) => ({ ...item, ...patch })) : current.requests,
        statusHistory: patch.currentStatus ? [createStatusHistoryItem({ requestId: task.requestId, fromStatus: request.currentStatus, toStatus: patch.currentStatus, changedBy: actorUserId, comment: "КП подано по workflow" }, at), ...current.statusHistory] : current.statusHistory,
        tasks: [...nextTasks, ...updateTaskById(current.tasks, taskId, (item) => ({ ...item, status: "completed", completedAt: at, actualDurationMinutes: duration, resultText: "Выполнено" }))],
        events: [...eventsToAdd, ...current.events]
      };
    });
    return messages;
  }, []);

  const updateAppealAndFolder = useCallback((requestId: string, input: UpdateAppealAndFolderInput, actorUserId: string) => {
    updateState((current) => {
      const request = current.requests.find((item) => item.id === requestId);
      if (!request) return current;

      const at = nowIso();
      const appealNumber = input.appealNumber?.trim() || undefined;
      const workingFolderUrl = input.workingFolderUrl?.trim() || undefined;
      const folderCreatedAt = input.folderCreatedAt
        ? new Date(input.folderCreatedAt).toISOString()
        : workingFolderUrl && !request.folderCreatedAt
          ? at
          : request.folderCreatedAt;
      const ready = Boolean(appealNumber && workingFolderUrl);

      return {
        ...current,
        requests: updateRequestById(current.requests, requestId, (item) => ({ ...item, appealNumber, workingFolderUrl, folderCreatedAt })),
        events: [
          ...(ready ? [createEvent({ requestId, eventType: "working_folder_ready", actorUserId, comment: "Заполнены номер обращения и рабочая папка" }, at)] : []),
          createEvent({ requestId, eventType: "appeal_and_folder_updated", actorUserId, oldValue: `${request.appealNumber ?? "—"} | ${request.workingFolderUrl ?? "—"}`, newValue: `${appealNumber ?? "—"} | ${workingFolderUrl ?? "—"}`, comment: "Обновлены обращение и рабочая папка" }, at),
          ...current.events
        ]
      };
    });
  }, []);

  const updateRequestBlock = useCallback((requestId: string, patch: Partial<Request>, eventType: string, actorUserId: string, comment: string) => {
    const at = nowIso();
    updateState((current) => {
      if (!current.requests.some((item) => item.id === requestId)) return current;
      return {
        ...current,
        requests: updateRequestById(current.requests, requestId, (item) => ({ ...item, ...patch })),
        events: [createEvent({ requestId, eventType, actorUserId, comment }, at), ...current.events]
      };
    });
  }, []);

  const updateParticipationBlock = useCallback((requestId: string, input: UpdateParticipationBlockInput, actorUserId: string) => updateRequestBlock(requestId, {
    participationSentToGdAt: normalizeDate(input.participationSentToGdAt),
    participationDecisionReceivedAt: normalizeDate(input.participationDecisionReceivedAt),
    participationDecision: input.participationDecision as ParticipationDecision,
    participationDecisionComment: normalizeText(input.participationDecisionComment),
    participationDecisionRecordedBy: normalizeText(input.participationDecisionRecordedBy)
  }, "participation_block_updated", actorUserId, "Обновлён блок решения об участии"), [updateRequestBlock]);

  const updateCostsBlock = useCallback((requestId: string, input: UpdateCostsBlockInput, actorUserId: string) => updateRequestBlock(requestId, {
    costsResponsibleId: normalizeText(input.costsResponsibleId), costsTaskSetAt: normalizeDate(input.costsTaskSetAt), costsPlannedDueAt: normalizeDate(input.costsPlannedDueAt), costsReceivedAt: normalizeDate(input.costsReceivedAt), costsStatus: input.costsStatus as CostsStatus, costAmount: input.costAmount, offerAmount: input.offerAmount, plannedMarginPercent: input.plannedMarginPercent, costsReturnCount: input.costsReturnCount ?? 0, costsRiskComment: normalizeText(input.costsRiskComment), costsApprovedAt: normalizeDate(input.costsApprovedAt)
  }, "costs_block_updated", actorUserId, "Обновлён блок затрат"), [updateRequestBlock]);

  const updateContractBlock = useCallback((requestId: string, input: UpdateContractBlockInput, actorUserId: string) => updateRequestBlock(requestId, {
    contractHasDraft: Boolean(input.contractHasDraft), contractAnalysisStatus: input.contractAnalysisStatus as ContractAnalysisStatus, contractSentToLawyersAt: normalizeDate(input.contractSentToLawyersAt), contractAnalysisReceivedAt: normalizeDate(input.contractAnalysisReceivedAt), contractKeyRisks: normalizeText(input.contractKeyRisks), protocolNeeded: Boolean(input.protocolNeeded), protocolStatus: input.protocolStatus as ProtocolStatus, protocolPreparedAt: normalizeDate(input.protocolPreparedAt), protocolLawyersApprovedAt: normalizeDate(input.protocolLawyersApprovedAt), protocolGdApprovedAt: normalizeDate(input.protocolGdApprovedAt), contractComment: normalizeText(input.contractComment)
  }, "contract_block_updated", actorUserId, "Обновлён блок договора и протокола"), [updateRequestBlock]);

  const updateDocumentsBlock = useCallback((requestId: string, input: UpdateDocumentsBlockInput, actorUserId: string) => updateRequestBlock(requestId, {
    documentsStatus: input.documentsStatus as DocumentsStatus, documentsResponsibleId: normalizeText(input.documentsResponsibleId), documentsMissingText: normalizeText(input.documentsMissingText), documentsReadyAt: normalizeDate(input.documentsReadyAt), documentsComment: normalizeText(input.documentsComment)
  }, "documents_block_updated", actorUserId, "Обновлён блок документов для подачи"), [updateRequestBlock]);

  const updateOfferBlock = useCallback((requestId: string, input: UpdateOfferBlockInput, actorUserId: string) => updateRequestBlock(requestId, {
    offerCostsTransferredToKatyaAt: normalizeDate(input.offerCostsTransferredToKatyaAt), offerStatus: input.offerStatus as OfferStatus, offerAmount: input.offerAmount, offerPreparedAt: normalizeDate(input.offerPreparedAt), offerSentToMlAt: normalizeDate(input.offerSentToMlAt), offerMlApprovedAt: normalizeDate(input.offerMlApprovedAt), offerReturnCount: input.offerReturnCount ?? 0, submissionMethod: normalizeText(input.submissionMethod), submissionSubmittedBy: normalizeText(input.submissionSubmittedBy), submissionSubmittedAt: normalizeDate(input.submissionSubmittedAt), offerComment: normalizeText(input.offerComment)
  }, "offer_block_updated", actorUserId, "Обновлён блок КП и подачи"), [updateRequestBlock]);

  const updateFeedbackBlock = useCallback((requestId: string, input: UpdateFeedbackBlockInput, actorUserId: string) => updateRequestBlock(requestId, {
    nextActionDueAt: normalizeDate(input.nextActionDueAt), feedbackStatus: input.feedbackStatus as FeedbackStatus, feedbackReceivedAt: normalizeDate(input.feedbackReceivedAt), feedbackCustomerComment: normalizeText(input.feedbackCustomerComment), nextActionText: normalizeText(input.nextActionText)
  }, "feedback_block_updated", actorUserId, "Обновлён блок обратной связи"), [updateRequestBlock]);

  const updateNextAction = useCallback((requestId: string, text: string, dueAt: string, ownerId: string, actorUserId = getCurrentUserOrFallback(state.currentUserId)) => {
    const at = nowIso();
    updateState((current) => ({
      ...current,
      requests: updateRequestById(current.requests, requestId, (item) => ({ ...item, nextActionText: text, nextActionDueAt: dueAt ? new Date(dueAt).toISOString() : undefined, nextActionOwnerId: ownerId })),
      events: [createEvent({ requestId, eventType: "next_action_updated", actorUserId, comment: text }, at), ...current.events]
    }));
  }, []);

  return useMemo(() => ({
    ...snapshot,
    setCurrentUser,
    resetDemoData,
    updateKpOfferPlan,
    createRequest,
    transitionRequest,
    closeRequest,
    createTask,
    createOfferPreparationTask,
    createOwnerApprovalTask,
    createSubmissionTask,
    createFeedbackTask,
    applyAutomationSuggestion,
    startTask: (taskId: string, actorUserId: string) => setTaskStatus(taskId, "in_progress", actorUserId),
    completeTask: (taskId: string, actorUserId: string, resultText?: string) => setTaskStatus(taskId, "completed", actorUserId, undefined, resultText),
    completeTaskWithEffects,
    updateTaskAssignee,
    updateTaskExecutor,
    returnTaskToWork: (taskId: string, actorUserId: string) => setTaskStatus(taskId, "in_progress", actorUserId, "Задача возвращена в работу"),
    updateAppealAndFolder,
    updateNextAction,
    updateParticipationBlock,
    updateCostsBlock,
    updateContractBlock,
    updateDocumentsBlock,
    updateOfferBlock,
    updateFeedbackBlock
  }), [snapshot, resetDemoData, updateKpOfferPlan, createRequest, transitionRequest, closeRequest, createTask, createOfferPreparationTask, createOwnerApprovalTask, createSubmissionTask, createFeedbackTask, applyAutomationSuggestion, setTaskStatus, completeTaskWithEffects, updateTaskAssignee, updateTaskExecutor, updateAppealAndFolder, updateNextAction, updateParticipationBlock, updateCostsBlock, updateContractBlock, updateDocumentsBlock, updateOfferBlock, updateFeedbackBlock]);
}
