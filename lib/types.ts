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

export type ParticipationDecision = "pending" | "approved" | "rejected" | "needs_clarification";
export type CostsStatus = "not_started" | "in_progress" | "received" | "checking" | "returned" | "approved";
export type ContractAnalysisStatus = "not_required" | "not_started" | "with_lawyers" | "received" | "risks_found" | "approved";
export type ProtocolStatus = "not_required" | "not_started" | "preparing" | "with_lawyers" | "with_gd" | "approved" | "sent";
export type DocumentsStatus = "not_started" | "in_progress" | "missing_documents" | "ready";
export type OfferStatus = "not_started" | "in_progress" | "ready" | "with_ml" | "returned" | "approved";
export type FeedbackStatus = "waiting" | "received" | "no_response" | "needs_clarification" | "final_result_received";

export type RequestResult = "none" | "won" | "lost" | "not_participating" | "withdrawn_after_start" | "missed_deadline" | "paused" | "canceled" | "no_feedback";

export type Request = {
  id: string;
  internalNumber: string;
  title: string;
  customerName: string;
  region: string;
  sourceType: string;
  sourceCustomValue?: string;
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

  participationSentToGdAt?: string;
  participationDecisionReceivedAt?: string;
  participationDecisionComment?: string;
  participationDecisionRecordedBy?: string;
  costsResponsibleId?: string;
  costsTaskSetAt?: string;
  costsPlannedDueAt?: string;
  costsReceivedAt?: string;
  costsStatus?: CostsStatus;
  costsReturnCount?: number;
  costsRiskComment?: string;
  costsApprovedAt?: string;
  contractHasDraft?: boolean;
  contractAnalysisStatus?: ContractAnalysisStatus;
  contractSentToLawyersAt?: string;
  contractAnalysisReceivedAt?: string;
  contractKeyRisks?: string;
  protocolNeeded?: boolean;
  protocolStatus?: ProtocolStatus;
  protocolPreparedAt?: string;
  protocolLawyersApprovedAt?: string;
  protocolGdApprovedAt?: string;
  contractComment?: string;
  documentsStatus?: DocumentsStatus;
  documentsResponsibleId?: string;
  documentsMissingText?: string;
  documentsReadyAt?: string;
  documentsComment?: string;
  offerCostsTransferredToKatyaAt?: string;
  offerStatus?: OfferStatus;
  offerPreparedAt?: string;
  offerSentToMlAt?: string;
  offerMlApprovedAt?: string;
  offerReturnCount?: number;
  submissionMethod?: string;
  submissionSubmittedBy?: string;
  submissionSubmittedAt?: string;
  offerComment?: string;
  feedbackStatus?: FeedbackStatus;
  feedbackReceivedAt?: string;
  feedbackCustomerComment?: string;
  resultStatus: RequestResult;
  resultComment?: string;
  closedAt?: string;
  closedBy?: string;
  closureReason?: string;
  closureComment?: string;
  resultReceivedAt?: string;
  lossReason?: string;
  winnerPrice?: number;
  ourPrice?: number;
  createdAt: string;
};

export type TaskStatus = "new" | "in_progress" | "completed";

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
  startedAt?: string;
  actualDurationMinutes?: number | null;
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
