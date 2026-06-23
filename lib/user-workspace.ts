import type { Request, RequestTask } from "./types";
import { isRequestProblem, isTaskOverdue } from "./workflow";

export const DENIS_USER_ID = "u-denis";
export const KATYA_USER_ID = "u-katya";
export const ADMIN_USER_ID = "u-admin";

const katyaStatuses = new Set(["offer_preparation", "owner_approval", "ready_to_submit", "submitted", "feedback_waiting"]);

export function isAdminUser(userId: string): boolean {
  return userId === ADMIN_USER_ID;
}

export function isMyTask(task: RequestTask, userId: string): boolean {
  if (isAdminUser(userId)) return true;
  return task.assigneeUserId === userId;
}

export function isDenisZoneRequest(request: Request, tasks: RequestTask[]): boolean {
  return request.ownerUserId === DENIS_USER_ID || isRequestProblem(request, tasks);
}

export function isKatyaZoneRequest(request: Request): boolean {
  return request.ownerUserId === KATYA_USER_ID
    || katyaStatuses.has(request.currentStatus)
    || request.documentsResponsibleId === KATYA_USER_ID
    || ["in_progress", "missing_documents"].includes(request.documentsStatus ?? "")
    || ["in_progress", "ready", "with_ml", "returned", "approved"].includes(request.offerStatus ?? "")
    || Boolean(request.offerSentToMlAt && !request.offerMlApprovedAt)
    || Boolean(request.submissionSubmittedAt || request.feedbackStatus === "waiting");
}

export function isMyZoneRequest(request: Request, tasks: RequestTask[], userId: string): boolean {
  if (isAdminUser(userId)) return true;
  if (userId === DENIS_USER_ID) return isDenisZoneRequest(request, tasks);
  if (userId === KATYA_USER_ID) return isKatyaZoneRequest(request);
  return request.ownerUserId === userId;
}

export function getDenisFocus(requests: Request[], tasks: RequestTask[]) {
  return {
    participationPending: requests.filter((request) => request.participationDecision === "pending" && !["not_participating", "canceled_or_paused"].includes(request.currentStatus)),
    missingAppealOrFolder: requests.filter((request) => ["participation_approved", "appeal_and_folder"].includes(request.currentStatus) && (!request.appealNumber || !request.workingFolderUrl)),
    overdueTasks: tasks.filter((task) => isTaskOverdue(task)),
    bottleneckRequests: requests.filter((request) => isRequestProblem(request, tasks)),
    deadlineSoon: requests.filter((request) => request.submissionDeadlineAt && new Date(request.submissionDeadlineAt).getTime() - Date.now() <= 3 * 24 * 60 * 60 * 1000 && new Date(request.submissionDeadlineAt).getTime() >= Date.now()),
    noNextAction: requests.filter((request) => !request.nextActionText)
  };
}

export function getKatyaFocus(requests: Request[]) {
  return {
    offersInProgress: requests.filter((request) => request.currentStatus === "offer_preparation" || request.offerStatus === "in_progress"),
    offersWithMl: requests.filter((request) => request.currentStatus === "owner_approval" || request.offerStatus === "with_ml"),
    documentsForSubmission: requests.filter((request) => ["in_progress", "missing_documents"].includes(request.documentsStatus ?? "")),
    readyToSubmit: requests.filter((request) => request.currentStatus === "ready_to_submit"),
    submittedFeedback: requests.filter((request) => ["submitted", "feedback_waiting"].includes(request.currentStatus) || request.feedbackStatus === "waiting")
  };
}
