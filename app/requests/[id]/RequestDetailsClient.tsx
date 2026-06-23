"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AutomationSuggestions } from "@/components/AutomationSuggestions";
import { StatusBadge } from "@/components/StatusBadge";
import { TaskList } from "@/components/TaskList";
import { useCrmStore } from "@/lib/client-store";
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
  finalRequestStatuses,
  getNextAllowedStatuses,
  isFinalRequestStatus,
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
  const [workingLinkError, setWorkingLinkError] = useState<string | null>(null);
  const [transitionMessage, setTransitionMessage] = useState<string | null>(
    null,
  );
  useEffect(() => {
    setFolderForm({
      appealNumber: request?.appealNumber ?? "",
      workingFolderUrl: request?.workingFolderUrl ?? "",
    });
  }, [request?.appealNumber, request?.workingFolderUrl]);

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

  function saveWorkingLink(event: FormEvent) {
    event.preventDefault();
    const value = folderForm.workingFolderUrl.trim();
    setWorkingLinkError(null);
    if (value) {
      try {
        new URL(value);
      } catch {
        setWorkingLinkError("Введите корректный URL рабочей ссылки");
        return;
      }
    }
    updateAppealAndFolder(id, { appealNumber: request?.appealNumber, workingFolderUrl: value }, currentUserId);
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

  const requestTasks = tasks.filter((task) => task.requestId === request.id);
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
          <form className="card detailGrid" onSubmit={saveWorkingLink} noValidate>
            <h2>Рабочие ссылки</h2>
            <Field id="working-link-url" label="Рабочая ссылка">
              <input
                id="working-link-url"
                name="workingFolderUrl"
                className={`input${workingLinkError ? " inputError" : ""}`}
                type="url"
                value={folderForm.workingFolderUrl}
                onChange={(e) => {
                  setWorkingLinkError(null);
                  setFolderForm({ ...folderForm, workingFolderUrl: e.target.value });
                }}
                aria-invalid={Boolean(workingLinkError)}
                aria-describedby="working-link-url-help working-link-url-error"
              />
            </Field>
            <span id="working-link-url-help" className="small muted">
              Используется существующее поле workingFolderUrl как компактная рабочая ссылка заявки.
            </span>
            {workingLinkError && <span id="working-link-url-error" className="dangerText small" role="alert">{workingLinkError}</span>}
            {request.workingFolderUrl ? (
              <p className="small">
                Сохранённая ссылка: <a href={request.workingFolderUrl}>{request.workingFolderUrl}</a>
              </p>
            ) : (
              <p className="small muted">Рабочая ссылка пока не заполнена.</p>
            )}
            <button className="button" type="submit">Сохранить рабочую ссылку</button>
          </form>

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
