"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AutomationSuggestions } from "@/components/AutomationSuggestions";
import { StatusBadge } from "@/components/StatusBadge";
import { TaskList } from "@/components/TaskList";
import { useCrmStore } from "@/lib/client-store";
import {
  buildFolderName,
  getFolderTemplate,
  getRequestFolderLinks,
} from "@/lib/folder-structure";
import { getRequestStageDurations } from "@/lib/metrics";
import { getAutomationSuggestions } from "@/lib/process-automation";
import { validateRequestTransition } from "@/lib/transition-guards";
import { users } from "@/lib/mock-data";
import {
  formatDateTime,
  formatMoney,
  getExternalName,
  getStatusLabel,
  getUserName,
} from "@/lib/utils";
import {
  closureReasonOptionsByStatus,
  contractAnalysisStatusOptions,
  costsStatusOptions,
  documentsStatusOptions,
  feedbackStatusOptions,
  finalRequestStatuses,
  getNextAllowedStatuses,
  isFinalRequestStatus,
  offerStatusOptions,
  participationDecisionOptions,
  protocolStatusOptions,
  statusLabels,
} from "@/lib/workflow";

type FieldProps = {
  id: string;
  label: string;
  children: React.ReactNode;
};

function Field({ id, label, children }: FieldProps) {
  return (
    <label className="formField" htmlFor={id}>
      {label}
      {children}
    </label>
  );
}

export default function RequestDetailsClient({
  id,
  embedded = false,
}: {
  id: string;
  embedded?: boolean;
}) {
  const {
    requests,
    tasks,
    fileLinks,
    events,
    statusHistory,
    currentUserId,
    transitionRequest,
    closeRequest,
    startTask,
    returnTaskToWork,
    completeTaskWithEffects,
    updateTaskAssignee,
    updateTaskExecutor,
    updateAppealAndFolder,
    updateNextAction,
    updateParticipationBlock,
    updateCostsBlock,
    updateContractBlock,
    updateDocumentsBlock,
    updateOfferBlock,
    updateFeedbackBlock,
    applyAutomationSuggestion,
  } = useCrmStore();
  const request = requests.find((item) => item.id === id);
  const [nextAction, setNextAction] = useState({
    text: request?.nextActionText ?? "",
    dueAt: request?.nextActionDueAt ? request.nextActionDueAt.slice(0, 16) : "",
    ownerId:
      request?.nextActionOwnerId ?? request?.ownerUserId ?? currentUserId,
  });
  const [folderForm, setFolderForm] = useState({
    appealNumber: request?.appealNumber ?? "",
    workingFolderUrl: request?.workingFolderUrl ?? "",
  });
  const [closureForm, setClosureForm] = useState({
    status: "not_participating",
    closureReason: "",
    closureComment: "",
    ourPrice: "",
    winnerPrice: "",
    resultReceivedAt: "",
  });
  const [closureError, setClosureError] = useState<string | null>(null);
  const [transitionMessage, setTransitionMessage] = useState<string | null>(
    null,
  );
  const [participationForm, setParticipationForm] = useState({
    sentAt: "",
    receivedAt: "",
    decision: "pending",
    comment: "",
    recordedBy: "",
  });
  const [costsForm, setCostsForm] = useState({
    responsibleId: "",
    taskSetAt: "",
    plannedDueAt: "",
    receivedAt: "",
    status: "not_started",
    costAmount: "",
    offerAmount: "",
    margin: "",
    returns: "0",
    risk: "",
    approvedAt: "",
  });
  const [contractForm, setContractForm] = useState({
    hasDraft: false,
    analysisStatus: "not_started",
    sentAt: "",
    receivedAt: "",
    risks: "",
    protocolNeeded: false,
    protocolStatus: "not_started",
    preparedAt: "",
    lawyersAt: "",
    gdAt: "",
    comment: "",
  });
  const [documentsForm, setDocumentsForm] = useState({
    status: "not_started",
    responsibleId: "",
    missing: "",
    readyAt: "",
    comment: "",
  });
  const [offerForm, setOfferForm] = useState({
    transferredAt: "",
    status: "not_started",
    amount: "",
    preparedAt: "",
    sentMlAt: "",
    approvedMlAt: "",
    returns: "0",
    method: "",
    submittedBy: "",
    submittedAt: "",
    comment: "",
  });
  const [feedbackForm, setFeedbackForm] = useState({
    nextAt: "",
    status: "waiting",
    receivedAt: "",
    customerComment: "",
    nextText: "",
  });

  useEffect(() => {
    setFolderForm({
      appealNumber: request?.appealNumber ?? "",
      workingFolderUrl: request?.workingFolderUrl ?? "",
    });
  }, [request?.appealNumber, request?.workingFolderUrl]);

  useEffect(() => {
    setParticipationForm({
      sentAt: request?.participationSentToGdAt?.slice(0, 16) ?? "",
      receivedAt: request?.participationDecisionReceivedAt?.slice(0, 16) ?? "",
      decision: request?.participationDecision ?? "pending",
      comment: request?.participationDecisionComment ?? "",
      recordedBy: request?.participationDecisionRecordedBy ?? "",
    });
    setCostsForm({
      responsibleId: request?.costsResponsibleId ?? "",
      taskSetAt: request?.costsTaskSetAt?.slice(0, 16) ?? "",
      plannedDueAt: request?.costsPlannedDueAt?.slice(0, 16) ?? "",
      receivedAt: request?.costsReceivedAt?.slice(0, 16) ?? "",
      status: request?.costsStatus ?? "not_started",
      costAmount: request?.costAmount?.toString() ?? "",
      offerAmount: request?.offerAmount?.toString() ?? "",
      margin: request?.plannedMarginPercent?.toString() ?? "",
      returns: request?.costsReturnCount?.toString() ?? "0",
      risk: request?.costsRiskComment ?? "",
      approvedAt: request?.costsApprovedAt?.slice(0, 16) ?? "",
    });
    setContractForm({
      hasDraft: request?.contractHasDraft ?? false,
      analysisStatus: request?.contractAnalysisStatus ?? "not_started",
      sentAt: request?.contractSentToLawyersAt?.slice(0, 16) ?? "",
      receivedAt: request?.contractAnalysisReceivedAt?.slice(0, 16) ?? "",
      risks: request?.contractKeyRisks ?? "",
      protocolNeeded: request?.protocolNeeded ?? false,
      protocolStatus: request?.protocolStatus ?? "not_started",
      preparedAt: request?.protocolPreparedAt?.slice(0, 16) ?? "",
      lawyersAt: request?.protocolLawyersApprovedAt?.slice(0, 16) ?? "",
      gdAt: request?.protocolGdApprovedAt?.slice(0, 16) ?? "",
      comment: request?.contractComment ?? "",
    });
    setDocumentsForm({
      status: request?.documentsStatus ?? "not_started",
      responsibleId: request?.documentsResponsibleId ?? "",
      missing: request?.documentsMissingText ?? "",
      readyAt: request?.documentsReadyAt?.slice(0, 16) ?? "",
      comment: request?.documentsComment ?? "",
    });
    setOfferForm({
      transferredAt:
        request?.offerCostsTransferredToKatyaAt?.slice(0, 16) ?? "",
      status: request?.offerStatus ?? "not_started",
      amount: request?.offerAmount?.toString() ?? "",
      preparedAt: request?.offerPreparedAt?.slice(0, 16) ?? "",
      sentMlAt: request?.offerSentToMlAt?.slice(0, 16) ?? "",
      approvedMlAt: request?.offerMlApprovedAt?.slice(0, 16) ?? "",
      returns: request?.offerReturnCount?.toString() ?? "0",
      method: request?.submissionMethod ?? "",
      submittedBy: request?.submissionSubmittedBy ?? "",
      submittedAt: request?.submissionSubmittedAt?.slice(0, 16) ?? "",
      comment: request?.offerComment ?? "",
    });
    setFeedbackForm({
      nextAt: request?.nextActionDueAt?.slice(0, 16) ?? "",
      status: request?.feedbackStatus ?? "waiting",
      receivedAt: request?.feedbackReceivedAt?.slice(0, 16) ?? "",
      customerComment: request?.feedbackCustomerComment ?? "",
      nextText: request?.nextActionText ?? "",
    });
  }, [request]);

  if (!request) {
    return <p className="muted">Заявка не найдена в demo-store.</p>;
  }

  function saveNextAction(event: FormEvent) {
    event.preventDefault();
    updateNextAction(
      id,
      nextAction.text,
      nextAction.dueAt,
      nextAction.ownerId,
      currentUserId,
    );
  }

  function saveAppealAndFolder(event: FormEvent) {
    event.preventDefault();
    updateAppealAndFolder(id, folderForm, currentUserId);
  }

  function submitClosure(event: FormEvent) {
    event.preventDefault();
    setClosureError(null);
    try {
      closeRequest(
        request!.id,
        {
          status: closureStatus,
          closureReason: closureForm.closureReason,
          closureComment: closureForm.closureComment,
          resultReceivedAt: closureForm.resultReceivedAt,
          ourPrice: closureForm.ourPrice
            ? Number(closureForm.ourPrice)
            : undefined,
          winnerPrice: closureForm.winnerPrice
            ? Number(closureForm.winnerPrice)
            : undefined,
          lossReason:
            closureStatus === "lost" ? closureForm.closureReason : undefined,
        },
        currentUserId,
      );
    } catch (error) {
      setClosureError(
        error instanceof Error ? error.message : "Не удалось закрыть заявку",
      );
    }
  }

  const numberOrUndefined = (value: string) =>
    value ? Number(value) : undefined;

  function saveParticipation(event: FormEvent) {
    event.preventDefault();
    updateParticipationBlock(
      id,
      {
        participationSentToGdAt: participationForm.sentAt,
        participationDecisionReceivedAt: participationForm.receivedAt,
        participationDecision: participationForm.decision as never,
        participationDecisionComment: participationForm.comment,
        participationDecisionRecordedBy: participationForm.recordedBy,
      },
      currentUserId,
    );
  }
  function saveCosts(event: FormEvent) {
    event.preventDefault();
    updateCostsBlock(
      id,
      {
        costsResponsibleId: costsForm.responsibleId,
        costsTaskSetAt: costsForm.taskSetAt,
        costsPlannedDueAt: costsForm.plannedDueAt,
        costsReceivedAt: costsForm.receivedAt,
        costsStatus: costsForm.status as never,
        costAmount: numberOrUndefined(costsForm.costAmount),
        offerAmount: numberOrUndefined(costsForm.offerAmount),
        plannedMarginPercent: numberOrUndefined(costsForm.margin),
        costsReturnCount: Number(costsForm.returns || 0),
        costsRiskComment: costsForm.risk,
        costsApprovedAt: costsForm.approvedAt,
      },
      currentUserId,
    );
  }
  function saveContract(event: FormEvent) {
    event.preventDefault();
    updateContractBlock(
      id,
      {
        contractHasDraft: contractForm.hasDraft,
        contractAnalysisStatus: contractForm.analysisStatus as never,
        contractSentToLawyersAt: contractForm.sentAt,
        contractAnalysisReceivedAt: contractForm.receivedAt,
        contractKeyRisks: contractForm.risks,
        protocolNeeded: contractForm.protocolNeeded,
        protocolStatus: contractForm.protocolStatus as never,
        protocolPreparedAt: contractForm.preparedAt,
        protocolLawyersApprovedAt: contractForm.lawyersAt,
        protocolGdApprovedAt: contractForm.gdAt,
        contractComment: contractForm.comment,
      },
      currentUserId,
    );
  }
  function saveDocuments(event: FormEvent) {
    event.preventDefault();
    updateDocumentsBlock(
      id,
      {
        documentsStatus: documentsForm.status as never,
        documentsResponsibleId: documentsForm.responsibleId,
        documentsMissingText: documentsForm.missing,
        documentsReadyAt: documentsForm.readyAt,
        documentsComment: documentsForm.comment,
      },
      currentUserId,
    );
  }
  function saveOffer(event: FormEvent) {
    event.preventDefault();
    updateOfferBlock(
      id,
      {
        offerCostsTransferredToKatyaAt: offerForm.transferredAt,
        offerStatus: offerForm.status as never,
        offerAmount: numberOrUndefined(offerForm.amount),
        offerPreparedAt: offerForm.preparedAt,
        offerSentToMlAt: offerForm.sentMlAt,
        offerMlApprovedAt: offerForm.approvedMlAt,
        offerReturnCount: Number(offerForm.returns || 0),
        submissionMethod: offerForm.method,
        submissionSubmittedBy: offerForm.submittedBy,
        submissionSubmittedAt: offerForm.submittedAt,
        offerComment: offerForm.comment,
      },
      currentUserId,
    );
  }
  function saveFeedback(event: FormEvent) {
    event.preventDefault();
    updateFeedbackBlock(
      id,
      {
        nextActionDueAt: feedbackForm.nextAt,
        feedbackStatus: feedbackForm.status as never,
        feedbackReceivedAt: feedbackForm.receivedAt,
        feedbackCustomerComment: feedbackForm.customerComment,
        nextActionText: feedbackForm.nextText,
      },
      currentUserId,
    );
  }

  const requestTasks = tasks.filter((task) => task.requestId === request.id);
  const requestFiles = fileLinks.filter(
    (link) => link.requestId === request.id,
  );
  const requestEvents = events.filter(
    (event) => event.requestId === request.id,
  );
  const requestHistory = statusHistory.filter(
    (item) => item.requestId === request.id,
  );
  const nextStatuses = getNextAllowedStatuses(request.currentStatus);
  const operationalNextStatuses = nextStatuses.filter(
    (status) => !isFinalRequestStatus(status),
  );
  const closureStatus =
    closureForm.status as (typeof finalRequestStatuses)[number];
  const closureReasons = closureReasonOptionsByStatus[closureStatus];
  const stageDurations = getRequestStageDurations(request.id, statusHistory);
  const folderLinks = getRequestFolderLinks(request);
  const folderTemplate = getFolderTemplate();
  const recommendedFolderName = buildFolderName(request);
  const automationSuggestions = getAutomationSuggestions(
    request,
    tasks,
    events,
    new Date(),
  );
  const transitionReadiness = operationalNextStatuses.map((status) => ({
    status,
    result: validateRequestTransition(
      request,
      requestTasks,
      request.currentStatus,
      status,
    ),
  }));
  const nextReadiness = transitionReadiness[0];

  return (
    <>
      <header className="pageHeader">
        <div>
          {!embedded && (
            <Link href="/requests" className="muted">
              ← К реестру
            </Link>
          )}
          <h1>{request.title}</h1>
          <p>
            {request.customerName} · {request.region} · {request.workType}
          </p>
        </div>
        <StatusBadge status={request.currentStatus} />
      </header>

      <section className="sectionStack">
        <div className="card">
          <div className="sectionHeader"><div><h2>Сводка</h2><p>Ключевые параметры заявки для быстрого контроля.</p></div></div>
          <div className="detailGrid">
            <div className="field">
              <span>ID</span>
              <strong>{request.internalNumber}</strong>
            </div>
            <div className="field">
              <span>Срок подачи</span>
              <strong>{formatDateTime(request.submissionDeadlineAt)}</strong>
            </div>
            <div className="field">
              <span>Ответственный</span>
              <strong>{getUserName(request.ownerUserId)}</strong>
            </div>
            <div className="field">
              <span>Следующее действие</span>
              <strong>{request.nextActionText ?? "Не задано"}</strong>
            </div>
            <div className="field">
              <span>Срок действия</span>
              <strong>{formatDateTime(request.nextActionDueAt)}</strong>
            </div>
            <div className="field">
              <span>Следующие статусы</span>
              <strong>
                {operationalNextStatuses.length > 0
                  ? operationalNextStatuses.map(getStatusLabel).join(", ")
                  : nextStatuses.length > 0
                    ? "Финальные статусы доступны в форме закрытия"
                    : "Финальный статус"}
              </strong>
            </div>
            <div className="field">
              <span>Сумма КП</span>
              <strong>{formatMoney(request.offerAmount)}</strong>
            </div>
          </div>
        </div>

        {nextReadiness && (
          <div className="card">
            <h2>Готовность к следующему этапу</h2>
            <p>
              Следующий этап:{" "}
              <strong>{statusLabels[nextReadiness.status]}</strong>
            </p>
            {nextReadiness.result.allowed ? (
              <p className="small">Обязательные данные заполнены.</p>
            ) : (
              <p className="dangerText">
                Блокирующие ошибки: {nextReadiness.result.errors.join(", ")}
              </p>
            )}
            {nextReadiness.result.warnings.length > 0 && (
              <p className="small muted">
                Рекомендуется заполнить:{" "}
                {nextReadiness.result.warnings.join(", ")}
              </p>
            )}
            <ul className="small">
              {nextReadiness.result.errors.map((item) => (
                <li key={item}>Нужно заполнить: {item}</li>
              ))}
              {nextReadiness.result.warnings.map((item) => (
                <li key={item}>Желательно заполнить: {item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="card">
          <h2>Предлагаемые действия по заявке</h2>
          <AutomationSuggestions
            suggestions={automationSuggestions}
            requests={[request]}
            onApply={(suggestionId) =>
              applyAutomationSuggestion(suggestionId, currentUserId)
            }
            showRequestLink={false}
          />
        </div>

        <div className="card">
          <h2>Доступные переходы статуса</h2>
          {transitionMessage && (
            <div
              className="alert"
              role={transitionMessage.startsWith("Нельзя") ? "alert" : "status"}
            >
              {transitionMessage}
            </div>
          )}
          {operationalNextStatuses.length === 0 ? (
            <p className="muted">
              Операционных переходов нет. Финальные статусы проставляются в
              блоке результата.
            </p>
          ) : (
            <div className="sectionStack">
              {transitionReadiness.map(({ status, result }) => (
                <div key={status}>
                  <button
                    className="button"
                    type="button"
                    disabled={!result.allowed}
                    onClick={() => {
                      const next = transitionRequest(
                        request.id,
                        status,
                        currentUserId,
                      );
                      setTransitionMessage(
                        next.allowed
                          ? next.warnings.length > 0
                            ? `Переход выполнен. Рекомендуется заполнить: ${next.warnings.join(", ")}`
                            : "Переход выполнен"
                          : `Нельзя перейти: ${next.errors.join(", ")}`,
                      );
                    }}
                  >
                    {statusLabels[status]}
                  </button>
                  {!result.allowed && (
                    <div className="dangerText small">
                      Не хватает: {result.errors.join(", ")}
                    </div>
                  )}
                  {result.warnings.length > 0 && (
                    <div className="small muted">
                      Желательно: {result.warnings.join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2>Результат и закрытие</h2>
          <div className="detailGrid">
            <div className="field">
              <span>Текущий результат</span>
              <strong>{statusLabels[request.currentStatus]}</strong>
            </div>
            <div className="field">
              <span>Дата закрытия</span>
              <strong>{formatDateTime(request.closedAt)}</strong>
            </div>
            <div className="field">
              <span>Причина</span>
              <strong>
                {request.lossReason ??
                  request.closureReason ??
                  request.nonParticipationReason ??
                  "—"}
              </strong>
            </div>
            <div className="field">
              <span>Комментарий</span>
              <strong>
                {request.closureComment ?? request.resultComment ?? "—"}
              </strong>
            </div>
            <div className="field">
              <span>Наша цена</span>
              <strong>
                {formatMoney(request.ourPrice ?? request.offerAmount)}
              </strong>
            </div>
            <div className="field">
              <span>Цена победителя</span>
              <strong>{formatMoney(request.winnerPrice)}</strong>
            </div>
          </div>
          {!isFinalRequestStatus(request.currentStatus) && (
            <form
              className="detailGrid"
              onSubmit={submitClosure}
              aria-describedby={closureError ? "closure-error" : undefined}
            >
              <Field id="closure-status" label="Финальный статус *">
                <select
                  id="closure-status"
                  name="closureStatus"
                  className="select"
                  value={closureForm.status}
                  onChange={(e) =>
                    setClosureForm({
                      ...closureForm,
                      status: e.target.value,
                      closureReason: "",
                    })
                  }
                >
                  {finalRequestStatuses.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="closure-reason" label="Причина закрытия">
                <select
                  id="closure-reason"
                  name="closureReason"
                  className="select"
                  value={closureForm.closureReason}
                  onChange={(e) =>
                    setClosureForm({
                      ...closureForm,
                      closureReason: e.target.value,
                    })
                  }
                  disabled={closureReasons.length === 0}
                >
                  <option value="">Причина</option>
                  {closureReasons.map((reason) => (
                    <option key={reason.code} value={reason.name}>
                      {reason.name}
                    </option>
                  ))}
                </select>
              </Field>
              {closureReasons.length === 0 && (
                <p className="small muted">
                  Для выбранного результата причина не требуется.
                </p>
              )}
              <Field id="closure-comment" label="Комментарий *">
                <textarea
                  id="closure-comment"
                  name="closureComment"
                  className="input"
                  value={closureForm.closureComment}
                  onChange={(e) =>
                    setClosureForm({
                      ...closureForm,
                      closureComment: e.target.value,
                    })
                  }
                />
              </Field>
              <Field id="closure-our-price" label="Наша цена">
                <input
                  id="closure-our-price"
                  name="ourPrice"
                  className="input"
                  type="number"
                  value={closureForm.ourPrice}
                  onChange={(e) =>
                    setClosureForm({ ...closureForm, ourPrice: e.target.value })
                  }
                />
              </Field>
              <Field id="closure-winner-price" label="Цена победителя">
                <input
                  id="closure-winner-price"
                  name="winnerPrice"
                  className="input"
                  type="number"
                  value={closureForm.winnerPrice}
                  onChange={(e) =>
                    setClosureForm({
                      ...closureForm,
                      winnerPrice: e.target.value,
                    })
                  }
                />
              </Field>
              <Field id="closure-result-received-at" label="Дата результата">
                <input
                  id="closure-result-received-at"
                  name="resultReceivedAt"
                  className="input"
                  type="datetime-local"
                  value={closureForm.resultReceivedAt}
                  onChange={(e) =>
                    setClosureForm({
                      ...closureForm,
                      resultReceivedAt: e.target.value,
                    })
                  }
                />
              </Field>
              {closureError && (
                <div id="closure-error" className="dangerText" role="alert">
                  {closureError}
                </div>
              )}
              <button className="button" type="submit">
                Закрыть заявку
              </button>
            </form>
          )}
        </div>

        <form className="card detailGrid" onSubmit={saveNextAction}>
          <h2>Следующее действие</h2>
          <Field id="next-action-text" label="Текст действия">
            <input
              id="next-action-text"
              name="nextActionText"
              className="input"
              value={nextAction.text}
              onChange={(e) =>
                setNextAction({ ...nextAction, text: e.target.value })
              }
            />
          </Field>
          <Field id="next-action-due-at" label="Срок действия">
            <input
              id="next-action-due-at"
              name="nextActionDueAt"
              className="input"
              type="datetime-local"
              value={nextAction.dueAt}
              onChange={(e) =>
                setNextAction({ ...nextAction, dueAt: e.target.value })
              }
            />
          </Field>
          <Field id="next-action-owner" label="Ответственный">
            <select
              id="next-action-owner"
              name="nextActionOwnerId"
              className="select"
              value={nextAction.ownerId}
              onChange={(e) =>
                setNextAction({ ...nextAction, ownerId: e.target.value })
              }
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName}
                </option>
              ))}
            </select>
          </Field>
          <button className="button" type="submit">
            Обновить следующее действие
          </button>
        </form>

        <div className="gridTwo">
          <div className="card">
            <h2>Базовые данные</h2>
            <div className="detailGrid">
              <div className="field">
                <span>Источник</span>
                <strong>{request.sourceCustomValue || request.sourceType}</strong>
              </div>
              <div className="field">
                <span>Тип обращения</span>
                <strong>{request.requestType}</strong>
              </div>
              <div className="field">
                <span>Вид работ</span>
                <strong>{request.workType}</strong>
              </div>
              <div className="field">
                <span>Номер обращения</span>
                <strong>{request.appealNumber ?? "—"}</strong>
              </div>
              <div className="field">
                <span>Рабочая папка</span>
                <strong>{request.workingFolderUrl ?? "—"}</strong>
              </div>
              <div className="field">
                <span>Результат</span>
                <strong>{request.resultComment ?? "—"}</strong>
              </div>
            </div>
          </div>

          <div className="card">
            <h2>Экономика КП</h2>
            <div className="detailGrid">
              <div className="field">
                <span>Затраты</span>
                <strong>{formatMoney(request.costAmount)}</strong>
              </div>
              <div className="field">
                <span>Цена КП</span>
                <strong>{formatMoney(request.offerAmount)}</strong>
              </div>
              <div className="field">
                <span>Плановая маржа</span>
                <strong>
                  {request.plannedMarginPercent
                    ? `${request.plannedMarginPercent}%`
                    : "—"}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div className="gridTwo">
          <form className="card detailGrid" onSubmit={saveParticipation}>
            <h2>Решение об участии</h2>
            <Field id="participation-sent-at" label="Отправлено на решение ГД">
              <input
                id="participation-sent-at"
                name="participationSentAt"
                className="input"
                type="datetime-local"
                value={participationForm.sentAt}
                onChange={(e) =>
                  setParticipationForm({
                    ...participationForm,
                    sentAt: e.target.value,
                  })
                }
              />
            </Field>
            <Field id="participation-received-at" label="Решение получено">
              <input
                id="participation-received-at"
                name="participationReceivedAt"
                className="input"
                type="datetime-local"
                value={participationForm.receivedAt}
                onChange={(e) =>
                  setParticipationForm({
                    ...participationForm,
                    receivedAt: e.target.value,
                  })
                }
              />
            </Field>
            <Field id="participation-decision" label="Решение">
              <select
                id="participation-decision"
                name="participationDecision"
                className="select"
                value={participationForm.decision}
                onChange={(e) =>
                  setParticipationForm({
                    ...participationForm,
                    decision: e.target.value,
                  })
                }
              >
                {participationDecisionOptions.map((o) => (
                  <option key={o.code} value={o.code}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="participation-recorded-by" label="Кто зафиксировал">
              <input
                id="participation-recorded-by"
                name="participationRecordedBy"
                className="input"
                value={participationForm.recordedBy}
                onChange={(e) =>
                  setParticipationForm({
                    ...participationForm,
                    recordedBy: e.target.value,
                  })
                }
              />
            </Field>
            <Field id="participation-comment" label="Комментарий">
              <textarea
                id="participation-comment"
                name="participationComment"
                className="input"
                value={participationForm.comment}
                onChange={(e) =>
                  setParticipationForm({
                    ...participationForm,
                    comment: e.target.value,
                  })
                }
              />
            </Field>
            <button className="button" type="submit">
              Сохранить решение об участии
            </button>
          </form>
          <form className="card detailGrid" onSubmit={saveCosts}>
            <h2>Затраты</h2>
            <Field id="costs-responsible" label="Ответственный">
              <input
                id="costs-responsible"
                name="costsResponsibleId"
                className="input"
                value={costsForm.responsibleId}
                onChange={(e) =>
                  setCostsForm({ ...costsForm, responsibleId: e.target.value })
                }
              />
            </Field>
            <Field id="costs-status" label="Статус затрат">
              <select
                id="costs-status"
                name="costsStatus"
                className="select"
                value={costsForm.status}
                onChange={(e) =>
                  setCostsForm({ ...costsForm, status: e.target.value })
                }
              >
                {costsStatusOptions.map((o) => (
                  <option key={o.code} value={o.code}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="costs-task-set-at" label="Задача поставлена">
              <input
                id="costs-task-set-at"
                name="costsTaskSetAt"
                className="input"
                type="datetime-local"
                value={costsForm.taskSetAt}
                onChange={(e) =>
                  setCostsForm({ ...costsForm, taskSetAt: e.target.value })
                }
              />
            </Field>
            <Field id="costs-planned-due-at" label="Плановый срок">
              <input
                id="costs-planned-due-at"
                name="costsPlannedDueAt"
                className="input"
                type="datetime-local"
                value={costsForm.plannedDueAt}
                onChange={(e) =>
                  setCostsForm({ ...costsForm, plannedDueAt: e.target.value })
                }
              />
            </Field>
            <Field id="costs-received-at" label="Затраты получены">
              <input
                id="costs-received-at"
                name="costsReceivedAt"
                className="input"
                type="datetime-local"
                value={costsForm.receivedAt}
                onChange={(e) =>
                  setCostsForm({ ...costsForm, receivedAt: e.target.value })
                }
              />
            </Field>
            <Field id="costs-amount" label="Сумма затрат">
              <input
                id="costs-amount"
                name="costAmount"
                className="input"
                type="number"
                value={costsForm.costAmount}
                onChange={(e) =>
                  setCostsForm({ ...costsForm, costAmount: e.target.value })
                }
              />
            </Field>
            <Field id="costs-offer-amount" label="Сумма КП">
              <input
                id="costs-offer-amount"
                name="costsOfferAmount"
                className="input"
                type="number"
                value={costsForm.offerAmount}
                onChange={(e) =>
                  setCostsForm({ ...costsForm, offerAmount: e.target.value })
                }
              />
            </Field>
            <Field id="costs-margin" label="Маржа %">
              <input
                id="costs-margin"
                name="costsMargin"
                className="input"
                type="number"
                value={costsForm.margin}
                onChange={(e) =>
                  setCostsForm({ ...costsForm, margin: e.target.value })
                }
              />
            </Field>
            <Field id="costs-returns" label="Возвраты">
              <input
                id="costs-returns"
                name="costsReturns"
                className="input"
                type="number"
                value={costsForm.returns}
                onChange={(e) =>
                  setCostsForm({ ...costsForm, returns: e.target.value })
                }
              />
            </Field>
            <Field id="costs-risk" label="Риски">
              <textarea
                id="costs-risk"
                name="costsRisk"
                className="input"
                value={costsForm.risk}
                onChange={(e) =>
                  setCostsForm({ ...costsForm, risk: e.target.value })
                }
              />
            </Field>
            <Field id="costs-approved-at" label="Затраты согласованы">
              <input
                id="costs-approved-at"
                name="costsApprovedAt"
                className="input"
                type="datetime-local"
                value={costsForm.approvedAt}
                onChange={(e) =>
                  setCostsForm({ ...costsForm, approvedAt: e.target.value })
                }
              />
            </Field>
            <button className="button" type="submit">
              Сохранить затраты
            </button>
          </form>
        </div>
        <div className="gridTwo">
          <form className="card detailGrid" onSubmit={saveContract}>
            <h2>Договор и протокол</h2>
            <label className="formField" htmlFor="contract-has-draft">
              <span>
                <input
                  id="contract-has-draft"
                  name="contractHasDraft"
                  type="checkbox"
                  checked={contractForm.hasDraft}
                  onChange={(e) =>
                    setContractForm({
                      ...contractForm,
                      hasDraft: e.target.checked,
                    })
                  }
                />{" "}
                Есть проект договора
              </span>
            </label>
            <Field id="contract-analysis-status" label="Статус анализа">
              <select
                id="contract-analysis-status"
                name="contractAnalysisStatus"
                className="select"
                value={contractForm.analysisStatus}
                onChange={(e) =>
                  setContractForm({
                    ...contractForm,
                    analysisStatus: e.target.value,
                  })
                }
              >
                {contractAnalysisStatusOptions.map((o) => (
                  <option key={o.code} value={o.code}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="contract-sent-at" label="Передано юристам">
              <input
                id="contract-sent-at"
                name="contractSentAt"
                className="input"
                type="datetime-local"
                value={contractForm.sentAt}
                onChange={(e) =>
                  setContractForm({ ...contractForm, sentAt: e.target.value })
                }
              />
            </Field>
            <Field id="contract-received-at" label="Анализ получен">
              <input
                id="contract-received-at"
                name="contractReceivedAt"
                className="input"
                type="datetime-local"
                value={contractForm.receivedAt}
                onChange={(e) =>
                  setContractForm({
                    ...contractForm,
                    receivedAt: e.target.value,
                  })
                }
              />
            </Field>
            <Field id="contract-risks" label="Ключевые риски">
              <textarea
                id="contract-risks"
                name="contractRisks"
                className="input"
                value={contractForm.risks}
                onChange={(e) =>
                  setContractForm({ ...contractForm, risks: e.target.value })
                }
              />
            </Field>
            <label className="formField" htmlFor="contract-protocol-needed">
              <span>
                <input
                  id="contract-protocol-needed"
                  name="protocolNeeded"
                  type="checkbox"
                  checked={contractForm.protocolNeeded}
                  onChange={(e) =>
                    setContractForm({
                      ...contractForm,
                      protocolNeeded: e.target.checked,
                    })
                  }
                />{" "}
                Нужен протокол
              </span>
            </label>
            <Field id="contract-protocol-status" label="Статус протокола">
              <select
                id="contract-protocol-status"
                name="protocolStatus"
                className="select"
                value={contractForm.protocolStatus}
                onChange={(e) =>
                  setContractForm({
                    ...contractForm,
                    protocolStatus: e.target.value,
                  })
                }
              >
                {protocolStatusOptions.map((o) => (
                  <option key={o.code} value={o.code}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              id="contract-protocol-prepared-at"
              label="Протокол подготовлен"
            >
              <input
                id="contract-protocol-prepared-at"
                name="protocolPreparedAt"
                className="input"
                type="datetime-local"
                value={contractForm.preparedAt}
                onChange={(e) =>
                  setContractForm({
                    ...contractForm,
                    preparedAt: e.target.value,
                  })
                }
              />
            </Field>
            <Field
              id="contract-protocol-lawyers-at"
              label="Согласовано юристами"
            >
              <input
                id="contract-protocol-lawyers-at"
                name="protocolLawyersAt"
                className="input"
                type="datetime-local"
                value={contractForm.lawyersAt}
                onChange={(e) =>
                  setContractForm({
                    ...contractForm,
                    lawyersAt: e.target.value,
                  })
                }
              />
            </Field>
            <Field id="contract-protocol-gd-at" label="Согласовано ГД">
              <input
                id="contract-protocol-gd-at"
                name="protocolGdAt"
                className="input"
                type="datetime-local"
                value={contractForm.gdAt}
                onChange={(e) =>
                  setContractForm({ ...contractForm, gdAt: e.target.value })
                }
              />
            </Field>
            <Field id="contract-comment" label="Комментарий">
              <textarea
                id="contract-comment"
                name="contractComment"
                className="input"
                value={contractForm.comment}
                onChange={(e) =>
                  setContractForm({ ...contractForm, comment: e.target.value })
                }
              />
            </Field>
            <button className="button" type="submit">
              Сохранить договор и протокол
            </button>
          </form>
          <form className="card detailGrid" onSubmit={saveDocuments}>
            <h2>Документы для подачи</h2>
            <Field id="documents-status" label="Статус документов">
              <select
                id="documents-status"
                name="documentsStatus"
                className="select"
                value={documentsForm.status}
                onChange={(e) =>
                  setDocumentsForm({ ...documentsForm, status: e.target.value })
                }
              >
                {documentsStatusOptions.map((o) => (
                  <option key={o.code} value={o.code}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="documents-responsible" label="Ответственный">
              <input
                id="documents-responsible"
                name="documentsResponsibleId"
                className="input"
                value={documentsForm.responsibleId}
                onChange={(e) =>
                  setDocumentsForm({
                    ...documentsForm,
                    responsibleId: e.target.value,
                  })
                }
              />
            </Field>
            <Field id="documents-missing" label="Чего не хватает">
              <textarea
                id="documents-missing"
                name="documentsMissing"
                className="input"
                value={documentsForm.missing}
                onChange={(e) =>
                  setDocumentsForm({
                    ...documentsForm,
                    missing: e.target.value,
                  })
                }
              />
            </Field>
            <Field id="documents-ready-at" label="Документы готовы">
              <input
                id="documents-ready-at"
                name="documentsReadyAt"
                className="input"
                type="datetime-local"
                value={documentsForm.readyAt}
                onChange={(e) =>
                  setDocumentsForm({
                    ...documentsForm,
                    readyAt: e.target.value,
                  })
                }
              />
            </Field>
            <Field id="documents-comment" label="Комментарий">
              <textarea
                id="documents-comment"
                name="documentsComment"
                className="input"
                value={documentsForm.comment}
                onChange={(e) =>
                  setDocumentsForm({
                    ...documentsForm,
                    comment: e.target.value,
                  })
                }
              />
            </Field>
            <button className="button" type="submit">
              Сохранить документы
            </button>
          </form>
        </div>
        <div className="gridTwo">
          <form className="card detailGrid" onSubmit={saveOffer}>
            <h2>КП и подача</h2>
            <Field id="offer-transferred-at" label="Затраты переданы Кате">
              <input
                id="offer-transferred-at"
                name="offerTransferredAt"
                className="input"
                type="datetime-local"
                value={offerForm.transferredAt}
                onChange={(e) =>
                  setOfferForm({ ...offerForm, transferredAt: e.target.value })
                }
              />
            </Field>
            <Field id="offer-status" label="Статус КП">
              <select
                id="offer-status"
                name="offerStatus"
                className="select"
                value={offerForm.status}
                onChange={(e) =>
                  setOfferForm({ ...offerForm, status: e.target.value })
                }
              >
                {offerStatusOptions.map((o) => (
                  <option key={o.code} value={o.code}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="offer-amount" label="Сумма КП">
              <input
                id="offer-amount"
                name="offerAmount"
                className="input"
                type="number"
                value={offerForm.amount}
                onChange={(e) =>
                  setOfferForm({ ...offerForm, amount: e.target.value })
                }
              />
            </Field>
            <Field id="offer-prepared-at" label="КП подготовлено">
              <input
                id="offer-prepared-at"
                name="offerPreparedAt"
                className="input"
                type="datetime-local"
                value={offerForm.preparedAt}
                onChange={(e) =>
                  setOfferForm({ ...offerForm, preparedAt: e.target.value })
                }
              />
            </Field>
            <Field id="offer-sent-ml-at" label="Отправлено МЛ">
              <input
                id="offer-sent-ml-at"
                name="offerSentMlAt"
                className="input"
                type="datetime-local"
                value={offerForm.sentMlAt}
                onChange={(e) =>
                  setOfferForm({ ...offerForm, sentMlAt: e.target.value })
                }
              />
            </Field>
            <Field id="offer-approved-ml-at" label="Согласовано МЛ">
              <input
                id="offer-approved-ml-at"
                name="offerApprovedMlAt"
                className="input"
                type="datetime-local"
                value={offerForm.approvedMlAt}
                onChange={(e) =>
                  setOfferForm({ ...offerForm, approvedMlAt: e.target.value })
                }
              />
            </Field>
            <Field id="offer-returns" label="Возвраты КП">
              <input
                id="offer-returns"
                name="offerReturns"
                className="input"
                type="number"
                value={offerForm.returns}
                onChange={(e) =>
                  setOfferForm({ ...offerForm, returns: e.target.value })
                }
              />
            </Field>
            <Field id="offer-method" label="Способ подачи">
              <input
                id="offer-method"
                name="submissionMethod"
                className="input"
                value={offerForm.method}
                onChange={(e) =>
                  setOfferForm({ ...offerForm, method: e.target.value })
                }
              />
            </Field>
            <Field id="offer-submitted-by" label="Кто подал">
              <input
                id="offer-submitted-by"
                name="submittedBy"
                className="input"
                value={offerForm.submittedBy}
                onChange={(e) =>
                  setOfferForm({ ...offerForm, submittedBy: e.target.value })
                }
              />
            </Field>
            <Field id="offer-submitted-at" label="Дата подачи">
              <input
                id="offer-submitted-at"
                name="submittedAt"
                className="input"
                type="datetime-local"
                value={offerForm.submittedAt}
                onChange={(e) =>
                  setOfferForm({ ...offerForm, submittedAt: e.target.value })
                }
              />
            </Field>
            <Field id="offer-comment" label="Комментарий">
              <textarea
                id="offer-comment"
                name="offerComment"
                className="input"
                value={offerForm.comment}
                onChange={(e) =>
                  setOfferForm({ ...offerForm, comment: e.target.value })
                }
              />
            </Field>
            <button className="button" type="submit">
              Сохранить КП и подачу
            </button>
          </form>
          <form className="card detailGrid" onSubmit={saveFeedback}>
            <h2>Обратная связь</h2>
            <Field id="feedback-next-at" label="Срок следующего действия">
              <input
                id="feedback-next-at"
                name="feedbackNextAt"
                className="input"
                type="datetime-local"
                value={feedbackForm.nextAt}
                onChange={(e) =>
                  setFeedbackForm({ ...feedbackForm, nextAt: e.target.value })
                }
              />
            </Field>
            <Field id="feedback-status" label="Статус обратной связи">
              <select
                id="feedback-status"
                name="feedbackStatus"
                className="select"
                value={feedbackForm.status}
                onChange={(e) =>
                  setFeedbackForm({ ...feedbackForm, status: e.target.value })
                }
              >
                {feedbackStatusOptions.map((o) => (
                  <option key={o.code} value={o.code}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="feedback-received-at" label="Обратная связь получена">
              <input
                id="feedback-received-at"
                name="feedbackReceivedAt"
                className="input"
                type="datetime-local"
                value={feedbackForm.receivedAt}
                onChange={(e) =>
                  setFeedbackForm({
                    ...feedbackForm,
                    receivedAt: e.target.value,
                  })
                }
              />
            </Field>
            <Field id="feedback-customer-comment" label="Комментарий заказчика">
              <textarea
                id="feedback-customer-comment"
                name="feedbackCustomerComment"
                className="input"
                value={feedbackForm.customerComment}
                onChange={(e) =>
                  setFeedbackForm({
                    ...feedbackForm,
                    customerComment: e.target.value,
                  })
                }
              />
            </Field>
            <Field id="feedback-next-text" label="Следующий шаг">
              <textarea
                id="feedback-next-text"
                name="feedbackNextText"
                className="input"
                value={feedbackForm.nextText}
                onChange={(e) =>
                  setFeedbackForm({ ...feedbackForm, nextText: e.target.value })
                }
              />
            </Field>
            <button className="button" type="submit">
              Сохранить обратную связь
            </button>
          </form>
        </div>

        <div className="card">
          <h2>Обращение и рабочая папка</h2>
          <form className="detailGrid" onSubmit={saveAppealAndFolder}>
            <Field id="folder-appeal-number" label="Номер обращения">
              <input
                id="folder-appeal-number"
                name="appealNumber"
                className="input"
                value={folderForm.appealNumber}
                onChange={(e) =>
                  setFolderForm({ ...folderForm, appealNumber: e.target.value })
                }
              />
            </Field>
            <Field
              id="folder-working-url"
              label="Ссылка на корневую рабочую папку"
            >
              <input
                id="folder-working-url"
                name="workingFolderUrl"
                className="input"
                type="url"
                value={folderForm.workingFolderUrl}
                onChange={(e) =>
                  setFolderForm({
                    ...folderForm,
                    workingFolderUrl: e.target.value,
                  })
                }
              />
            </Field>
            <button className="button" type="submit">
              Сохранить
            </button>
          </form>
          <div className="detailGrid">
            <div className="field">
              <span>Номер обращения</span>
              <strong>{request.appealNumber ?? "—"}</strong>
            </div>
            <div className="field">
              <span>Рабочая папка</span>
              <strong>
                {request.workingFolderUrl ? (
                  <a href={request.workingFolderUrl}>
                    {request.workingFolderUrl}
                  </a>
                ) : (
                  "—"
                )}
              </strong>
            </div>
            <div className="field">
              <span>Дата создания папки</span>
              <strong>{formatDateTime(request.folderCreatedAt)}</strong>
            </div>
            <div className="field">
              <span>Рекомендуемое имя папки</span>
              <strong>{recommendedFolderName}</strong>
            </div>
          </div>
          <h3>Типовая структура подпапок</h3>
          <ul>
            {folderTemplate.map((folderName) => (
              <li key={folderName}>{folderName}</li>
            ))}
          </ul>
          <h3>Рассчитанные рабочие ссылки</h3>
          <ul>
            {folderLinks.map((link) => (
              <li key={link.key}>
                <strong>{link.title}</strong>{" "}
                <span className="muted">
                  {link.url ? (
                    <a href={link.url}>{link.url}</a>
                  ) : (
                    "заполните корневую папку"
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h2>Сроки этапов</h2>
          {stageDurations.length === 0 ? (
            <p className="muted">Истории этапов пока нет.</p>
          ) : (
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Этап</th>
                    <th>Начало</th>
                    <th>Окончание</th>
                    <th>Длительность</th>
                    <th>Сейчас</th>
                  </tr>
                </thead>
                <tbody>
                  {stageDurations.map((stage) => (
                    <tr
                      key={`${stage.status}-${stage.startedAt}`}
                      className={stage.isCurrent ? "problemRow" : undefined}
                    >
                      <td>{stage.statusLabel}</td>
                      <td>{formatDateTime(stage.startedAt)}</td>
                      <td>
                        {stage.endedAt ? formatDateTime(stage.endedAt) : "—"}
                      </td>
                      <td>{stage.durationText}</td>
                      <td>{stage.isCurrent ? "Текущий этап" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h2>Сроки задач</h2>
          <TaskList
            tasks={requestTasks}
            actions={{
              actorUserId: currentUserId,
              requests,
              updateTaskAssignee,
              updateTaskExecutor,
              startTask,
              returnTaskToWork,
              onCompleteClick: (task) => completeTaskWithEffects(task.id, currentUserId),
            }}
          />
        </div>

        <div className="gridTwo">
          <div className="card">
            <h2>Рабочие ссылки</h2>
            {requestFiles.length === 0 ? (
              <p className="muted">Ссылок пока нет.</p>
            ) : (
              <ul>
                {requestFiles.map((link) => (
                  <li key={link.id}>
                    <strong>{link.title}</strong>{" "}
                    <span className="muted">{link.url}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <h2>История статусов</h2>
            {requestHistory.length === 0 ? (
              <p className="muted">Истории пока нет.</p>
            ) : (
              <ul className="journalList">
                {requestHistory.map((item) => (
                  <li className="journalItem" key={item.id}>
                    {formatDateTime(item.changedAt)} —{" "}
                    {item.fromStatus
                      ? `${getStatusLabel(item.fromStatus)} → `
                      : ""}
                    {getStatusLabel(item.toStatus)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="card">
          <h2>Журнал событий</h2>
          {requestEvents.length === 0 ? (
            <p className="muted">Событий пока нет.</p>
          ) : (
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th>Событие</th>
                    <th>Автор</th>
                    <th>Комментарий</th>
                  </tr>
                </thead>
                <tbody>
                  {requestEvents.map((event) => (
                    <tr key={event.id}>
                      <td>{formatDateTime(event.createdAt)}</td>
                      <td>{event.eventType}</td>
                      <td>
                        {event.actorUserId
                          ? getUserName(event.actorUserId)
                          : event.actorExternalId
                            ? getExternalName(event.actorExternalId)
                            : "Система"}
                      </td>
                      <td>{event.comment ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
