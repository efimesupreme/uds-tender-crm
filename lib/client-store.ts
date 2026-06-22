"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { events, fileLinks, requests, statusHistory, tasks } from "./mock-data";
import type { FileLink, Request, RequestEvent, RequestStatus, RequestTask, StatusHistoryItem, TaskStatus } from "./types";
import { canTransitionRequest, createDefaultTasksForApprovedRequest, type TaskType } from "./workflow";

const STORAGE_KEY = "uds-tender-crm-demo-store-v1";
const DEFAULT_ACTOR_ID = "u-denis";

export type CrmState = {
  requests: Request[];
  tasks: RequestTask[];
  statusHistory: StatusHistoryItem[];
  events: RequestEvent[];
  fileLinks: FileLink[];
};

type CreateRequestInput = {
  title: string;
  customerName: string;
  region: string;
  workType: string;
  submissionDeadlineAt?: string;
  ownerUserId: string;
  sourceType: string;
};

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

function initialState(): CrmState {
  return clone({ requests, tasks, statusHistory, events, fileLinks });
}

let state: CrmState = initialState();
const listeners = new Set<() => void>();

function isBrowser() {
  return typeof window !== "undefined";
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function readStoredState(): CrmState {
  if (!isBrowser()) return state;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = initialState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    return { ...initialState(), ...JSON.parse(raw) } as CrmState;
  } catch {
    const seeded = initialState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function writeState(nextState: CrmState) {
  state = nextState;
  if (isBrowser()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  }
  listeners.forEach((listener) => listener());
}

function updateState(updater: (current: CrmState) => CrmState) {
  writeState(updater(state));
}

function addEvent(input: Omit<RequestEvent, "id" | "createdAt">, createdAt = nowIso()): RequestEvent {
  return { id: makeId("ev"), createdAt, ...input };
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
    writeState(initialState());
  }, []);

  const createRequest = useCallback((input: CreateRequestInput) => {
    const createdAt = nowIso();
    const requestId = makeId("r");
    const nextNumber = `T-${new Date().getFullYear()}-${String(state.requests.length + 1).padStart(3, "0")}`;
    const newRequest: Request = {
      id: requestId,
      internalNumber: nextNumber,
      title: input.title,
      customerName: input.customerName,
      region: input.region,
      sourceType: input.sourceType,
      requestType: "Запрос КП",
      workType: input.workType,
      submissionDeadlineAt: input.submissionDeadlineAt ? new Date(input.submissionDeadlineAt).toISOString() : undefined,
      currentStatus: "new",
      participationDecision: "pending",
      ownerUserId: input.ownerUserId,
      resultStatus: "none",
      createdAt
    };

    updateState((current) => ({
      ...current,
      requests: [newRequest, ...current.requests],
      statusHistory: [{ id: makeId("h"), requestId, toStatus: "new", changedBy: input.ownerUserId, changedAt: createdAt }, ...current.statusHistory],
      events: [addEvent({ requestId, eventType: "request_created", actorUserId: input.ownerUserId, comment: "Заявка создана" }, createdAt), ...current.events]
    }));
    return newRequest;
  }, []);

  const transitionRequest = useCallback((requestId: string, toStatus: RequestStatus, actorUserId: string, comment?: string) => {
    updateState((current) => {
      const request = current.requests.find((item) => item.id === requestId);
      if (!request || !canTransitionRequest(request.currentStatus, toStatus)) return current;
      const changedAt = nowIso();
      const defaultTasks = toStatus === "participation_approved" && !current.tasks.some((task) => task.requestId === requestId)
        ? createDefaultTasksForApprovedRequest(requestId, actorUserId).map((task) => ({ ...task, id: makeId("t") }))
        : [];

      return {
        ...current,
        requests: current.requests.map((item) => item.id === requestId ? { ...item, currentStatus: toStatus, participationDecision: toStatus === "participation_approved" ? "approved" : item.participationDecision } : item),
        tasks: [...defaultTasks, ...current.tasks],
        statusHistory: [{ id: makeId("h"), requestId, fromStatus: request.currentStatus, toStatus, changedBy: actorUserId, changedAt, comment }, ...current.statusHistory],
        events: [
          addEvent({ requestId, eventType: "status_changed", actorUserId, oldValue: request.currentStatus, newValue: toStatus, comment }, changedAt),
          ...defaultTasks.map((task) => addEvent({ requestId, taskId: task.id, eventType: "task_created", actorUserId, comment: task.title }, changedAt)),
          ...current.events
        ]
      };
    });
  }, []);

  const createTask = useCallback((requestId: string, input: CreateTaskInput) => {
    const createdAt = nowIso();
    const task: RequestTask = { id: makeId("t"), requestId, title: input.title, taskType: input.taskType ?? "prepare_offer", status: "new", createdBy: input.createdBy ?? DEFAULT_ACTOR_ID, assigneeUserId: input.assigneeUserId, assigneeExternalId: input.assigneeExternalId, plannedDueAt: input.plannedDueAt, createdAt, returnedCount: 0, comment: input.comment };
    updateState((current) => ({ ...current, tasks: [task, ...current.tasks], events: [addEvent({ requestId, taskId: task.id, eventType: "task_created", actorUserId: task.createdBy, comment: task.title }, createdAt), ...current.events] }));
    return task;
  }, []);

  const setTaskStatus = useCallback((taskId: string, status: TaskStatus, actorUserId: string, comment?: string, resultText?: string) => {
    updateState((current) => {
      const task = current.tasks.find((item) => item.id === taskId);
      if (!task) return current;
      const at = nowIso();
      return {
        ...current,
        tasks: current.tasks.map((item) => item.id === taskId ? { ...item, status, comment: comment ?? item.comment, resultText: resultText ?? item.resultText, completedAt: status === "completed" ? at : item.completedAt, returnedCount: status === "returned" ? item.returnedCount + 1 : item.returnedCount } : item),
        events: [addEvent({ requestId: task.requestId, taskId, eventType: `task_${status}`, actorUserId, comment: resultText ?? comment }, at), ...current.events]
      };
    });
  }, []);

  const updateNextAction = useCallback((requestId: string, text: string, dueAt: string, ownerId: string) => {
    const at = nowIso();
    updateState((current) => ({
      ...current,
      requests: current.requests.map((item) => item.id === requestId ? { ...item, nextActionText: text, nextActionDueAt: dueAt ? new Date(dueAt).toISOString() : undefined, nextActionOwnerId: ownerId } : item),
      events: [addEvent({ requestId, eventType: "next_action_updated", actorUserId: ownerId, comment: text }, at), ...current.events]
    }));
  }, []);

  return useMemo(() => ({
    ...snapshot,
    resetDemoData,
    createRequest,
    transitionRequest,
    createTask,
    startTask: (taskId: string, actorUserId: string) => setTaskStatus(taskId, "in_progress", actorUserId),
    completeTask: (taskId: string, actorUserId: string, resultText?: string) => setTaskStatus(taskId, "completed", actorUserId, undefined, resultText),
    returnTask: (taskId: string, actorUserId: string, comment?: string) => setTaskStatus(taskId, "returned", actorUserId, comment),
    acceptTask: (taskId: string, actorUserId: string) => setTaskStatus(taskId, "accepted", actorUserId),
    updateNextAction
  }), [snapshot, resetDemoData, createRequest, transitionRequest, createTask, setTaskStatus, updateNextAction]);
}
