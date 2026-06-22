import type { TaskType } from "./workflow";

export type UserRole = "admin" | "user";

export type User = {
  id: string;
  fullName: string;
  role: UserRole;
};

export type ExternalParticipant = {
  id: string;
  name: string;
  type: "general_director" | "owner" | "lawyer" | "project_manager" | "gip" | "customer" | "other";
};

export type RequestStatus =
  | "new"
  | "participation_decision"
  | "not_participating"
  | "participation_approved"
  | "appeal_and_folder"
  | "materials_preparation"
  | "materials_received"
  | "internal_approval"
  | "costs_approved"
  | "offer_preparation"
  | "owner_approval"
  | "ready_to_submit"
  | "submitted"
  | "feedback_waiting"
  | "won"
  | "lost"
  | "withdrawn_after_start"
  | "missed_deadline"
  | "canceled_or_paused";

export type ParticipationDecision = "pending" | "approved" | "rejected";

export type RequestResult = "none" | "won" | "lost" | "paused" | "canceled" | "no_feedback";

export type Request = {
  id: string;
  internalNumber: string;
  title: string;
  customerName: string;
  region: string;
  sourceType: string;
  sourceUrl?: string;
  requestType: string;
  workType: string;
  submissionDeadlineAt?: string;
  currentStatus: RequestStatus;
  participationDecision: ParticipationDecision;
  nonParticipationReason?: string;
  ownerUserId: string;
  nextActionText?: string;
  nextActionDueAt?: string;
  nextActionOwnerId?: string;
  appealNumber?: string;
  workingFolderUrl?: string;
  folderCreatedAt?: string;
  costAmount?: number;
  offerAmount?: number;
  plannedMarginPercent?: number;
  resultStatus: RequestResult;
  resultComment?: string;
  createdAt: string;
};

export type TaskStatus = "new" | "in_progress" | "waiting" | "completed" | "returned" | "accepted" | "canceled";

export type RequestTask = {
  id: string;
  requestId: string;
  title: string;
  taskType: TaskType;
  status: TaskStatus;
  createdBy: string;
  assigneeUserId?: string;
  assigneeExternalId?: string;
  plannedDueAt?: string;
  completedAt?: string;
  createdAt?: string;
  returnedCount: number;
  resultText?: string;
  comment?: string;
};

export type StatusHistoryItem = {
  id: string;
  requestId: string;
  fromStatus?: RequestStatus;
  toStatus: RequestStatus;
  changedBy: string;
  changedAt: string;
  comment?: string;
};

export type RequestEvent = {
  id: string;
  requestId: string;
  taskId?: string;
  eventType: string;
  actorUserId?: string;
  actorExternalId?: string;
  oldValue?: string;
  newValue?: string;
  comment?: string;
  createdAt: string;
};

export type FileLink = {
  id: string;
  requestId: string;
  linkType: string;
  title: string;
  url: string;
  comment?: string;
};

export type DirectoryItem = {
  directoryType: string;
  code: string;
  name: string;
  sortOrder: number;
};
