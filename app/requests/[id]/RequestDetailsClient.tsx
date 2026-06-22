"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { TaskList } from "@/components/TaskList";
import { useCrmStore } from "@/lib/client-store";
import { buildFolderName, getFolderTemplate, getRequestFolderLinks } from "@/lib/folder-structure";
import { getRequestStageDurations } from "@/lib/metrics";
import { users } from "@/lib/mock-data";
import { formatDateTime, formatMoney, getExternalName, getStatusLabel, getUserName } from "@/lib/utils";
import { closureReasonOptionsByStatus, contractAnalysisStatusOptions, costsStatusOptions, documentsStatusOptions, feedbackStatusOptions, finalRequestStatuses, getNextAllowedStatuses, isFinalRequestStatus, offerStatusOptions, participationDecisionOptions, protocolStatusOptions, statusLabels } from "@/lib/workflow";

export default function RequestDetailsClient({ id, embedded = false }: { id: string; embedded?: boolean }) {
  const { requests, tasks, fileLinks, events, statusHistory, transitionRequest, closeRequest, startTask, completeTask, returnTask, acceptTask, updateAppealAndFolder, updateNextAction, updateParticipationBlock, updateCostsBlock, updateContractBlock, updateDocumentsBlock, updateOfferBlock, updateFeedbackBlock } = useCrmStore();
  const request = requests.find((item) => item.id === id);
  const [nextAction, setNextAction] = useState({ text: request?.nextActionText ?? "", dueAt: request?.nextActionDueAt ? request.nextActionDueAt.slice(0, 16) : "", ownerId: request?.nextActionOwnerId ?? request?.ownerUserId ?? "u-denis" });
  const [folderForm, setFolderForm] = useState({ appealNumber: request?.appealNumber ?? "", workingFolderUrl: request?.workingFolderUrl ?? "" });
  const [closureForm, setClosureForm] = useState({ status: "not_participating", closureReason: "", closureComment: "", ourPrice: "", winnerPrice: "", resultReceivedAt: "" });
  const [closureError, setClosureError] = useState<string | null>(null);
  const [participationForm, setParticipationForm] = useState({ sentAt: "", receivedAt: "", decision: "pending", comment: "", recordedBy: "" });
  const [costsForm, setCostsForm] = useState({ responsibleId: "", taskSetAt: "", plannedDueAt: "", receivedAt: "", status: "not_started", costAmount: "", offerAmount: "", margin: "", returns: "0", risk: "", approvedAt: "" });
  const [contractForm, setContractForm] = useState({ hasDraft: false, analysisStatus: "not_started", sentAt: "", receivedAt: "", risks: "", protocolNeeded: false, protocolStatus: "not_started", preparedAt: "", lawyersAt: "", gdAt: "", comment: "" });
  const [documentsForm, setDocumentsForm] = useState({ status: "not_started", responsibleId: "", missing: "", readyAt: "", comment: "" });
  const [offerForm, setOfferForm] = useState({ transferredAt: "", status: "not_started", amount: "", preparedAt: "", sentMlAt: "", approvedMlAt: "", returns: "0", method: "", submittedBy: "", submittedAt: "", comment: "" });
  const [feedbackForm, setFeedbackForm] = useState({ nextAt: "", status: "waiting", receivedAt: "", customerComment: "", nextText: "" });

  useEffect(() => {
    setFolderForm({ appealNumber: request?.appealNumber ?? "", workingFolderUrl: request?.workingFolderUrl ?? "" });
  }, [request?.appealNumber, request?.workingFolderUrl]);

  useEffect(() => {
    setParticipationForm({ sentAt: request?.participationSentToGdAt?.slice(0, 16) ?? "", receivedAt: request?.participationDecisionReceivedAt?.slice(0, 16) ?? "", decision: request?.participationDecision ?? "pending", comment: request?.participationDecisionComment ?? "", recordedBy: request?.participationDecisionRecordedBy ?? "" });
    setCostsForm({ responsibleId: request?.costsResponsibleId ?? "", taskSetAt: request?.costsTaskSetAt?.slice(0, 16) ?? "", plannedDueAt: request?.costsPlannedDueAt?.slice(0, 16) ?? "", receivedAt: request?.costsReceivedAt?.slice(0, 16) ?? "", status: request?.costsStatus ?? "not_started", costAmount: request?.costAmount?.toString() ?? "", offerAmount: request?.offerAmount?.toString() ?? "", margin: request?.plannedMarginPercent?.toString() ?? "", returns: request?.costsReturnCount?.toString() ?? "0", risk: request?.costsRiskComment ?? "", approvedAt: request?.costsApprovedAt?.slice(0, 16) ?? "" });
    setContractForm({ hasDraft: request?.contractHasDraft ?? false, analysisStatus: request?.contractAnalysisStatus ?? "not_started", sentAt: request?.contractSentToLawyersAt?.slice(0, 16) ?? "", receivedAt: request?.contractAnalysisReceivedAt?.slice(0, 16) ?? "", risks: request?.contractKeyRisks ?? "", protocolNeeded: request?.protocolNeeded ?? false, protocolStatus: request?.protocolStatus ?? "not_started", preparedAt: request?.protocolPreparedAt?.slice(0, 16) ?? "", lawyersAt: request?.protocolLawyersApprovedAt?.slice(0, 16) ?? "", gdAt: request?.protocolGdApprovedAt?.slice(0, 16) ?? "", comment: request?.contractComment ?? "" });
    setDocumentsForm({ status: request?.documentsStatus ?? "not_started", responsibleId: request?.documentsResponsibleId ?? "", missing: request?.documentsMissingText ?? "", readyAt: request?.documentsReadyAt?.slice(0, 16) ?? "", comment: request?.documentsComment ?? "" });
    setOfferForm({ transferredAt: request?.offerCostsTransferredToKatyaAt?.slice(0, 16) ?? "", status: request?.offerStatus ?? "not_started", amount: request?.offerAmount?.toString() ?? "", preparedAt: request?.offerPreparedAt?.slice(0, 16) ?? "", sentMlAt: request?.offerSentToMlAt?.slice(0, 16) ?? "", approvedMlAt: request?.offerMlApprovedAt?.slice(0, 16) ?? "", returns: request?.offerReturnCount?.toString() ?? "0", method: request?.submissionMethod ?? "", submittedBy: request?.submissionSubmittedBy ?? "", submittedAt: request?.submissionSubmittedAt?.slice(0, 16) ?? "", comment: request?.offerComment ?? "" });
    setFeedbackForm({ nextAt: request?.nextActionDueAt?.slice(0, 16) ?? "", status: request?.feedbackStatus ?? "waiting", receivedAt: request?.feedbackReceivedAt?.slice(0, 16) ?? "", customerComment: request?.feedbackCustomerComment ?? "", nextText: request?.nextActionText ?? "" });
  }, [request]);

  if (!request) {
    return <p className="muted">Заявка не найдена в demo-store.</p>;
  }

  function saveNextAction(event: FormEvent) {
    event.preventDefault();
    updateNextAction(id, nextAction.text, nextAction.dueAt, nextAction.ownerId);
  }

  function saveAppealAndFolder(event: FormEvent) {
    event.preventDefault();
    updateAppealAndFolder(id, folderForm, request!.ownerUserId);
  }

  function submitClosure(event: FormEvent) {
    event.preventDefault();
    setClosureError(null);
    try {
      closeRequest(request!.id, {
        status: closureStatus,
        closureReason: closureForm.closureReason,
        closureComment: closureForm.closureComment,
        resultReceivedAt: closureForm.resultReceivedAt,
        ourPrice: closureForm.ourPrice ? Number(closureForm.ourPrice) : undefined,
        winnerPrice: closureForm.winnerPrice ? Number(closureForm.winnerPrice) : undefined,
        lossReason: closureStatus === "lost" ? closureForm.closureReason : undefined
      }, request!.ownerUserId);
    } catch (error) {
      setClosureError(error instanceof Error ? error.message : "Не удалось закрыть заявку");
    }
  }


  const numberOrUndefined = (value: string) => value ? Number(value) : undefined;

  function saveParticipation(event: FormEvent) { event.preventDefault(); updateParticipationBlock(id, { participationSentToGdAt: participationForm.sentAt, participationDecisionReceivedAt: participationForm.receivedAt, participationDecision: participationForm.decision as never, participationDecisionComment: participationForm.comment, participationDecisionRecordedBy: participationForm.recordedBy }, request!.ownerUserId); }
  function saveCosts(event: FormEvent) { event.preventDefault(); updateCostsBlock(id, { costsResponsibleId: costsForm.responsibleId, costsTaskSetAt: costsForm.taskSetAt, costsPlannedDueAt: costsForm.plannedDueAt, costsReceivedAt: costsForm.receivedAt, costsStatus: costsForm.status as never, costAmount: numberOrUndefined(costsForm.costAmount), offerAmount: numberOrUndefined(costsForm.offerAmount), plannedMarginPercent: numberOrUndefined(costsForm.margin), costsReturnCount: Number(costsForm.returns || 0), costsRiskComment: costsForm.risk, costsApprovedAt: costsForm.approvedAt }, request!.ownerUserId); }
  function saveContract(event: FormEvent) { event.preventDefault(); updateContractBlock(id, { contractHasDraft: contractForm.hasDraft, contractAnalysisStatus: contractForm.analysisStatus as never, contractSentToLawyersAt: contractForm.sentAt, contractAnalysisReceivedAt: contractForm.receivedAt, contractKeyRisks: contractForm.risks, protocolNeeded: contractForm.protocolNeeded, protocolStatus: contractForm.protocolStatus as never, protocolPreparedAt: contractForm.preparedAt, protocolLawyersApprovedAt: contractForm.lawyersAt, protocolGdApprovedAt: contractForm.gdAt, contractComment: contractForm.comment }, request!.ownerUserId); }
  function saveDocuments(event: FormEvent) { event.preventDefault(); updateDocumentsBlock(id, { documentsStatus: documentsForm.status as never, documentsResponsibleId: documentsForm.responsibleId, documentsMissingText: documentsForm.missing, documentsReadyAt: documentsForm.readyAt, documentsComment: documentsForm.comment }, request!.ownerUserId); }
  function saveOffer(event: FormEvent) { event.preventDefault(); updateOfferBlock(id, { offerCostsTransferredToKatyaAt: offerForm.transferredAt, offerStatus: offerForm.status as never, offerAmount: numberOrUndefined(offerForm.amount), offerPreparedAt: offerForm.preparedAt, offerSentToMlAt: offerForm.sentMlAt, offerMlApprovedAt: offerForm.approvedMlAt, offerReturnCount: Number(offerForm.returns || 0), submissionMethod: offerForm.method, submissionSubmittedBy: offerForm.submittedBy, submissionSubmittedAt: offerForm.submittedAt, offerComment: offerForm.comment }, request!.ownerUserId); }
  function saveFeedback(event: FormEvent) { event.preventDefault(); updateFeedbackBlock(id, { nextActionDueAt: feedbackForm.nextAt, feedbackStatus: feedbackForm.status as never, feedbackReceivedAt: feedbackForm.receivedAt, feedbackCustomerComment: feedbackForm.customerComment, nextActionText: feedbackForm.nextText }, request!.ownerUserId); }

  const requestTasks = tasks.filter((task) => task.requestId === request.id);
  const requestFiles = fileLinks.filter((link) => link.requestId === request.id);
  const requestEvents = events.filter((event) => event.requestId === request.id);
  const requestHistory = statusHistory.filter((item) => item.requestId === request.id);
  const nextStatuses = getNextAllowedStatuses(request.currentStatus);
  const operationalNextStatuses = nextStatuses.filter((status) => !isFinalRequestStatus(status));
  const closureStatus = closureForm.status as (typeof finalRequestStatuses)[number];
  const closureReasons = closureReasonOptionsByStatus[closureStatus];
  const stageDurations = getRequestStageDurations(request.id, statusHistory);
  const folderLinks = getRequestFolderLinks(request);
  const folderTemplate = getFolderTemplate();
  const recommendedFolderName = buildFolderName(request);

  return (
    <>
      <header className="pageHeader">
        <div>
          {!embedded && <Link href="/requests" className="muted">← К реестру</Link>}
          <h1>{request.title}</h1>
          <p>{request.customerName} · {request.region} · {request.workType}</p>
        </div>
        <StatusBadge status={request.currentStatus} />
      </header>

      <section className="sectionStack">
        <div className="card">
          <h2>Сводка</h2>
          <div className="detailGrid">
            <div className="field"><span>ID</span><strong>{request.internalNumber}</strong></div>
            <div className="field"><span>Срок подачи</span><strong>{formatDateTime(request.submissionDeadlineAt)}</strong></div>
            <div className="field"><span>Ответственный</span><strong>{getUserName(request.ownerUserId)}</strong></div>
            <div className="field"><span>Следующее действие</span><strong>{request.nextActionText ?? "Не задано"}</strong></div>
            <div className="field"><span>Срок действия</span><strong>{formatDateTime(request.nextActionDueAt)}</strong></div>
            <div className="field"><span>Следующие статусы</span><strong>{operationalNextStatuses.length > 0 ? operationalNextStatuses.map(getStatusLabel).join(", ") : nextStatuses.length > 0 ? "Финальные статусы доступны в форме закрытия" : "Финальный статус"}</strong></div>
            <div className="field"><span>Сумма КП</span><strong>{formatMoney(request.offerAmount)}</strong></div>
          </div>
        </div>



        <div className="card">
          <h2>Доступные переходы статуса</h2>
          {operationalNextStatuses.length === 0 ? <p className="muted">Операционных переходов нет. Финальные статусы проставляются в блоке результата.</p> : (
            <div className="filterBar">
              {operationalNextStatuses.map((status) => (
                <button className="button" key={status} type="button" onClick={() => transitionRequest(request.id, status, request.ownerUserId)}>
                  {statusLabels[status]}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2>Результат и закрытие</h2>
          <div className="detailGrid">
            <div className="field"><span>Текущий результат</span><strong>{statusLabels[request.currentStatus]}</strong></div>
            <div className="field"><span>Дата закрытия</span><strong>{formatDateTime(request.closedAt)}</strong></div>
            <div className="field"><span>Причина</span><strong>{request.lossReason ?? request.closureReason ?? request.nonParticipationReason ?? "—"}</strong></div>
            <div className="field"><span>Комментарий</span><strong>{request.closureComment ?? request.resultComment ?? "—"}</strong></div>
            <div className="field"><span>Наша цена</span><strong>{formatMoney(request.ourPrice ?? request.offerAmount)}</strong></div>
            <div className="field"><span>Цена победителя</span><strong>{formatMoney(request.winnerPrice)}</strong></div>
          </div>
          {!isFinalRequestStatus(request.currentStatus) && (
            <form className="detailGrid" onSubmit={submitClosure}>
              <select className="select" value={closureForm.status} onChange={(e) => setClosureForm({ ...closureForm, status: e.target.value, closureReason: "" })}>
                {finalRequestStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
              </select>
              <select className="select" value={closureForm.closureReason} onChange={(e) => setClosureForm({ ...closureForm, closureReason: e.target.value })} disabled={closureReasons.length === 0}>
                <option value="">Причина</option>
                {closureReasons.map((reason) => <option key={reason.code} value={reason.name}>{reason.name}</option>)}
              </select>
              <textarea className="input" placeholder="Комментарий" value={closureForm.closureComment} onChange={(e) => setClosureForm({ ...closureForm, closureComment: e.target.value })} />
              <input className="input" type="number" placeholder="Наша цена" value={closureForm.ourPrice} onChange={(e) => setClosureForm({ ...closureForm, ourPrice: e.target.value })} />
              <input className="input" type="number" placeholder="Цена победителя" value={closureForm.winnerPrice} onChange={(e) => setClosureForm({ ...closureForm, winnerPrice: e.target.value })} />
              <input className="input" type="datetime-local" value={closureForm.resultReceivedAt} onChange={(e) => setClosureForm({ ...closureForm, resultReceivedAt: e.target.value })} />
              {closureError && <div className="dangerText">{closureError}</div>}
              <button className="button" type="submit">Закрыть заявку</button>
            </form>
          )}
        </div>

        <form className="card detailGrid" onSubmit={saveNextAction}>
          <h2>Следующее действие</h2>
          <input className="input" placeholder="Текст действия" value={nextAction.text} onChange={(e) => setNextAction({ ...nextAction, text: e.target.value })} />
          <input className="input" type="datetime-local" value={nextAction.dueAt} onChange={(e) => setNextAction({ ...nextAction, dueAt: e.target.value })} />
          <select className="select" value={nextAction.ownerId} onChange={(e) => setNextAction({ ...nextAction, ownerId: e.target.value })}>
            {users.map((user) => <option key={user.id} value={user.id}>{user.fullName}</option>)}
          </select>
          <button className="button" type="submit">Обновить следующее действие</button>
        </form>

        <div className="gridTwo">
          <div className="card">
            <h2>Базовые данные</h2>
            <div className="detailGrid">
              <div className="field"><span>Источник</span><strong>{request.sourceType}</strong></div>
              <div className="field"><span>Тип обращения</span><strong>{request.requestType}</strong></div>
              <div className="field"><span>Вид работ</span><strong>{request.workType}</strong></div>
              <div className="field"><span>Номер обращения</span><strong>{request.appealNumber ?? "—"}</strong></div>
              <div className="field"><span>Рабочая папка</span><strong>{request.workingFolderUrl ?? "—"}</strong></div>
              <div className="field"><span>Результат</span><strong>{request.resultComment ?? "—"}</strong></div>
            </div>
          </div>

          <div className="card">
            <h2>Экономика КП</h2>
            <div className="detailGrid">
              <div className="field"><span>Затраты</span><strong>{formatMoney(request.costAmount)}</strong></div>
              <div className="field"><span>Цена КП</span><strong>{formatMoney(request.offerAmount)}</strong></div>
              <div className="field"><span>Плановая маржа</span><strong>{request.plannedMarginPercent ? `${request.plannedMarginPercent}%` : "—"}</strong></div>
            </div>
          </div>
        </div>

        <div className="gridTwo">
          <form className="card detailGrid" onSubmit={saveParticipation}><h2>Решение об участии</h2><input className="input" type="datetime-local" value={participationForm.sentAt} onChange={(e) => setParticipationForm({ ...participationForm, sentAt: e.target.value })} /><input className="input" type="datetime-local" value={participationForm.receivedAt} onChange={(e) => setParticipationForm({ ...participationForm, receivedAt: e.target.value })} /><select className="select" value={participationForm.decision} onChange={(e) => setParticipationForm({ ...participationForm, decision: e.target.value })}>{participationDecisionOptions.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}</select><input className="input" placeholder="Кто зафиксировал" value={participationForm.recordedBy} onChange={(e) => setParticipationForm({ ...participationForm, recordedBy: e.target.value })} /><textarea className="input" placeholder="Комментарий" value={participationForm.comment} onChange={(e) => setParticipationForm({ ...participationForm, comment: e.target.value })} /><button className="button" type="submit">Сохранить</button></form>
          <form className="card detailGrid" onSubmit={saveCosts}><h2>Затраты</h2><input className="input" placeholder="Ответственный" value={costsForm.responsibleId} onChange={(e) => setCostsForm({ ...costsForm, responsibleId: e.target.value })} /><select className="select" value={costsForm.status} onChange={(e) => setCostsForm({ ...costsForm, status: e.target.value })}>{costsStatusOptions.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}</select><input className="input" type="datetime-local" value={costsForm.taskSetAt} onChange={(e) => setCostsForm({ ...costsForm, taskSetAt: e.target.value })} /><input className="input" type="datetime-local" value={costsForm.plannedDueAt} onChange={(e) => setCostsForm({ ...costsForm, plannedDueAt: e.target.value })} /><input className="input" type="datetime-local" value={costsForm.receivedAt} onChange={(e) => setCostsForm({ ...costsForm, receivedAt: e.target.value })} /><input className="input" type="number" placeholder="Сумма затрат" value={costsForm.costAmount} onChange={(e) => setCostsForm({ ...costsForm, costAmount: e.target.value })} /><input className="input" type="number" placeholder="Сумма КП" value={costsForm.offerAmount} onChange={(e) => setCostsForm({ ...costsForm, offerAmount: e.target.value })} /><input className="input" type="number" placeholder="Маржа %" value={costsForm.margin} onChange={(e) => setCostsForm({ ...costsForm, margin: e.target.value })} /><input className="input" type="number" placeholder="Возвраты" value={costsForm.returns} onChange={(e) => setCostsForm({ ...costsForm, returns: e.target.value })} /><textarea className="input" placeholder="Риски" value={costsForm.risk} onChange={(e) => setCostsForm({ ...costsForm, risk: e.target.value })} /><input className="input" type="datetime-local" value={costsForm.approvedAt} onChange={(e) => setCostsForm({ ...costsForm, approvedAt: e.target.value })} /><button className="button" type="submit">Сохранить</button></form>
        </div>
        <div className="gridTwo">
          <form className="card detailGrid" onSubmit={saveContract}><h2>Договор и протокол</h2><label><input type="checkbox" checked={contractForm.hasDraft} onChange={(e) => setContractForm({ ...contractForm, hasDraft: e.target.checked })} /> Есть проект договора</label><select className="select" value={contractForm.analysisStatus} onChange={(e) => setContractForm({ ...contractForm, analysisStatus: e.target.value })}>{contractAnalysisStatusOptions.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}</select><input className="input" type="datetime-local" value={contractForm.sentAt} onChange={(e) => setContractForm({ ...contractForm, sentAt: e.target.value })} /><input className="input" type="datetime-local" value={contractForm.receivedAt} onChange={(e) => setContractForm({ ...contractForm, receivedAt: e.target.value })} /><textarea className="input" placeholder="Ключевые риски" value={contractForm.risks} onChange={(e) => setContractForm({ ...contractForm, risks: e.target.value })} /><label><input type="checkbox" checked={contractForm.protocolNeeded} onChange={(e) => setContractForm({ ...contractForm, protocolNeeded: e.target.checked })} /> Нужен протокол</label><select className="select" value={contractForm.protocolStatus} onChange={(e) => setContractForm({ ...contractForm, protocolStatus: e.target.value })}>{protocolStatusOptions.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}</select><input className="input" type="datetime-local" value={contractForm.preparedAt} onChange={(e) => setContractForm({ ...contractForm, preparedAt: e.target.value })} /><input className="input" type="datetime-local" value={contractForm.lawyersAt} onChange={(e) => setContractForm({ ...contractForm, lawyersAt: e.target.value })} /><input className="input" type="datetime-local" value={contractForm.gdAt} onChange={(e) => setContractForm({ ...contractForm, gdAt: e.target.value })} /><textarea className="input" placeholder="Комментарий" value={contractForm.comment} onChange={(e) => setContractForm({ ...contractForm, comment: e.target.value })} /><button className="button" type="submit">Сохранить</button></form>
          <form className="card detailGrid" onSubmit={saveDocuments}><h2>Документы для подачи</h2><select className="select" value={documentsForm.status} onChange={(e) => setDocumentsForm({ ...documentsForm, status: e.target.value })}>{documentsStatusOptions.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}</select><input className="input" placeholder="Ответственный" value={documentsForm.responsibleId} onChange={(e) => setDocumentsForm({ ...documentsForm, responsibleId: e.target.value })} /><textarea className="input" placeholder="Чего не хватает" value={documentsForm.missing} onChange={(e) => setDocumentsForm({ ...documentsForm, missing: e.target.value })} /><input className="input" type="datetime-local" value={documentsForm.readyAt} onChange={(e) => setDocumentsForm({ ...documentsForm, readyAt: e.target.value })} /><textarea className="input" placeholder="Комментарий" value={documentsForm.comment} onChange={(e) => setDocumentsForm({ ...documentsForm, comment: e.target.value })} /><button className="button" type="submit">Сохранить</button></form>
        </div>
        <div className="gridTwo">
          <form className="card detailGrid" onSubmit={saveOffer}><h2>КП и подача</h2><input className="input" type="datetime-local" value={offerForm.transferredAt} onChange={(e) => setOfferForm({ ...offerForm, transferredAt: e.target.value })} /><select className="select" value={offerForm.status} onChange={(e) => setOfferForm({ ...offerForm, status: e.target.value })}>{offerStatusOptions.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}</select><input className="input" type="number" placeholder="Сумма КП" value={offerForm.amount} onChange={(e) => setOfferForm({ ...offerForm, amount: e.target.value })} /><input className="input" type="datetime-local" value={offerForm.preparedAt} onChange={(e) => setOfferForm({ ...offerForm, preparedAt: e.target.value })} /><input className="input" type="datetime-local" value={offerForm.sentMlAt} onChange={(e) => setOfferForm({ ...offerForm, sentMlAt: e.target.value })} /><input className="input" type="datetime-local" value={offerForm.approvedMlAt} onChange={(e) => setOfferForm({ ...offerForm, approvedMlAt: e.target.value })} /><input className="input" type="number" placeholder="Возвраты КП" value={offerForm.returns} onChange={(e) => setOfferForm({ ...offerForm, returns: e.target.value })} /><input className="input" placeholder="Способ подачи" value={offerForm.method} onChange={(e) => setOfferForm({ ...offerForm, method: e.target.value })} /><input className="input" placeholder="Кто подал" value={offerForm.submittedBy} onChange={(e) => setOfferForm({ ...offerForm, submittedBy: e.target.value })} /><input className="input" type="datetime-local" value={offerForm.submittedAt} onChange={(e) => setOfferForm({ ...offerForm, submittedAt: e.target.value })} /><textarea className="input" placeholder="Комментарий" value={offerForm.comment} onChange={(e) => setOfferForm({ ...offerForm, comment: e.target.value })} /><button className="button" type="submit">Сохранить</button></form>
          <form className="card detailGrid" onSubmit={saveFeedback}><h2>Обратная связь</h2><input className="input" type="datetime-local" value={feedbackForm.nextAt} onChange={(e) => setFeedbackForm({ ...feedbackForm, nextAt: e.target.value })} /><select className="select" value={feedbackForm.status} onChange={(e) => setFeedbackForm({ ...feedbackForm, status: e.target.value })}>{feedbackStatusOptions.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}</select><input className="input" type="datetime-local" value={feedbackForm.receivedAt} onChange={(e) => setFeedbackForm({ ...feedbackForm, receivedAt: e.target.value })} /><textarea className="input" placeholder="Комментарий заказчика" value={feedbackForm.customerComment} onChange={(e) => setFeedbackForm({ ...feedbackForm, customerComment: e.target.value })} /><textarea className="input" placeholder="Следующий шаг" value={feedbackForm.nextText} onChange={(e) => setFeedbackForm({ ...feedbackForm, nextText: e.target.value })} /><button className="button" type="submit">Сохранить</button></form>
        </div>

        <div className="card">
          <h2>Обращение и рабочая папка</h2>
          <form className="detailGrid" onSubmit={saveAppealAndFolder}>
            <input className="input" placeholder="Номер обращения" value={folderForm.appealNumber} onChange={(e) => setFolderForm({ ...folderForm, appealNumber: e.target.value })} />
            <input className="input" placeholder="Ссылка на корневую рабочую папку" value={folderForm.workingFolderUrl} onChange={(e) => setFolderForm({ ...folderForm, workingFolderUrl: e.target.value })} />
            <button className="button" type="submit">Сохранить</button>
          </form>
          <div className="detailGrid">
            <div className="field"><span>Номер обращения</span><strong>{request.appealNumber ?? "—"}</strong></div>
            <div className="field"><span>Рабочая папка</span><strong>{request.workingFolderUrl ? <a href={request.workingFolderUrl}>{request.workingFolderUrl}</a> : "—"}</strong></div>
            <div className="field"><span>Дата создания папки</span><strong>{formatDateTime(request.folderCreatedAt)}</strong></div>
            <div className="field"><span>Рекомендуемое имя папки</span><strong>{recommendedFolderName}</strong></div>
          </div>
          <h3>Типовая структура подпапок</h3>
          <ul>
            {folderTemplate.map((folderName) => <li key={folderName}>{folderName}</li>)}
          </ul>
          <h3>Рассчитанные рабочие ссылки</h3>
          <ul>
            {folderLinks.map((link) => (
              <li key={link.key}>
                <strong>{link.title}</strong> <span className="muted">{link.url ? <a href={link.url}>{link.url}</a> : "заполните корневую папку"}</span>
              </li>
            ))}
          </ul>
        </div>


        <div className="card">
          <h2>Сроки этапов</h2>
          {stageDurations.length === 0 ? <p className="muted">Истории этапов пока нет.</p> : (
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
                    <tr key={`${stage.status}-${stage.startedAt}`} className={stage.isCurrent ? "problemRow" : undefined}>
                      <td>{stage.statusLabel}</td>
                      <td>{formatDateTime(stage.startedAt)}</td>
                      <td>{stage.endedAt ? formatDateTime(stage.endedAt) : "—"}</td>
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
          <TaskList tasks={requestTasks} actions={{ startTask, completeTask, returnTask, acceptTask, actorUserId: request.ownerUserId }} />
        </div>

        <div className="gridTwo">
          <div className="card">
            <h2>Рабочие ссылки</h2>
            {requestFiles.length === 0 ? <p className="muted">Ссылок пока нет.</p> : (
              <ul>
                {requestFiles.map((link) => (
                  <li key={link.id}>
                    <strong>{link.title}</strong> <span className="muted">{link.url}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <h2>История статусов</h2>
            {requestHistory.length === 0 ? <p className="muted">Истории пока нет.</p> : (
              <ul>
                {requestHistory.map((item) => (
                  <li key={item.id}>
                    {formatDateTime(item.changedAt)} — {item.fromStatus ? `${getStatusLabel(item.fromStatus)} → ` : ""}{getStatusLabel(item.toStatus)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="card">
          <h2>Журнал событий</h2>
          {requestEvents.length === 0 ? <p className="muted">Событий пока нет.</p> : (
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
                      <td>{event.actorUserId ? getUserName(event.actorUserId) : getExternalName(event.actorExternalId)}</td>
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
