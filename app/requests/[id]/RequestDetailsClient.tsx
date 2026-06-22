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
import { closureReasonOptionsByStatus, finalRequestStatuses, getNextAllowedStatuses, isFinalRequestStatus, statusLabels } from "@/lib/workflow";

export default function RequestDetailsClient({ id }: { id: string }) {
  const { requests, tasks, fileLinks, events, statusHistory, transitionRequest, closeRequest, startTask, completeTask, returnTask, acceptTask, updateAppealAndFolder, updateNextAction } = useCrmStore();
  const request = requests.find((item) => item.id === id);
  const [nextAction, setNextAction] = useState({ text: request?.nextActionText ?? "", dueAt: request?.nextActionDueAt ? request.nextActionDueAt.slice(0, 16) : "", ownerId: request?.nextActionOwnerId ?? request?.ownerUserId ?? "u-denis" });
  const [folderForm, setFolderForm] = useState({ appealNumber: request?.appealNumber ?? "", workingFolderUrl: request?.workingFolderUrl ?? "" });
  const [closureForm, setClosureForm] = useState({ status: "not_participating", closureReason: "", closureComment: "", ourPrice: "", winnerPrice: "", resultReceivedAt: "" });
  const [closureError, setClosureError] = useState<string | null>(null);

  useEffect(() => {
    setFolderForm({ appealNumber: request?.appealNumber ?? "", workingFolderUrl: request?.workingFolderUrl ?? "" });
  }, [request?.appealNumber, request?.workingFolderUrl]);

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
          <Link href="/requests" className="muted">← К реестру</Link>
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
