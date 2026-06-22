"use client";

import Link from "next/link";
import { getRequestDetailsHref } from "@/lib/request-links";
import { useMemo, useState, type DragEvent } from "react";
import type { TransitionRequestResult } from "@/lib/client-store";
import type { Request, RequestStatus, RequestTask } from "@/lib/types";
import { canTransitionRequest, isRequestProblem, statusLabels } from "@/lib/workflow";
import { formatDateTime, formatMoney, getUserName, isPast } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

type KanbanColumn = {
  id: string;
  title: string;
  statuses: RequestStatus[];
  targetStatus?: RequestStatus;
};

const kanbanColumns: KanbanColumn[] = [
  { id: "new", title: "Входящие", statuses: ["new"], targetStatus: "new" },
  { id: "participation_decision", title: "На решении ГД", statuses: ["participation_decision"], targetStatus: "participation_decision" },
  { id: "appeal", title: "Заведение обращения", statuses: ["participation_approved", "appeal_and_folder"], targetStatus: "appeal_and_folder" },
  { id: "materials", title: "Подготовка материалов", statuses: ["materials_preparation", "materials_received", "internal_approval", "costs_approved"], targetStatus: "materials_preparation" },
  { id: "offer", title: "КП и согласование", statuses: ["offer_preparation", "owner_approval", "ready_to_submit"], targetStatus: "offer_preparation" },
  { id: "submitted", title: "Подано", statuses: ["submitted"], targetStatus: "submitted" },
  { id: "feedback", title: "Обратная связь", statuses: ["feedback_waiting"], targetStatus: "feedback_waiting" },
  { id: "closed", title: "Закрыто", statuses: ["won", "lost", "not_participating", "withdrawn_after_start", "missed_deadline", "canceled_or_paused"] }
];

export function RequestKanban({
  requests,
  tasks,
  transitionRequest,
  actorUserId
}: {
  requests: Request[];
  tasks: RequestTask[];
  transitionRequest: (requestId: string, toStatus: RequestStatus, actorUserId: string, comment?: string) => TransitionRequestResult;
  actorUserId: string;
}) {
  const [draggedRequestId, setDraggedRequestId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const requestsByColumn = useMemo(() => {
    return kanbanColumns.map((column) => {
      const columnRequests = requests.filter((request) => column.statuses.includes(request.currentStatus));
      const offerTotal = columnRequests.reduce((sum, request) => sum + (request.offerAmount ?? 0), 0);
      return { ...column, requests: columnRequests, offerTotal };
    });
  }, [requests]);

  function onDragStart(event: DragEvent<HTMLElement>, requestId: string) {
    event.dataTransfer.setData("text/plain", requestId);
    event.dataTransfer.effectAllowed = "move";
    setDraggedRequestId(requestId);
    setMessage(null);
  }

  function onDragEnd() {
    setDraggedRequestId(null);
  }

  function onDragOver(event: DragEvent<HTMLElement>, column: KanbanColumn) {
    event.preventDefault();
    event.dataTransfer.dropEffect = column.targetStatus ? "move" : "none";
  }

  function onDrop(event: DragEvent<HTMLElement>, column: KanbanColumn) {
    event.preventDefault();
    const requestId = event.dataTransfer.getData("text/plain") || draggedRequestId;
    const request = requests.find((item) => item.id === requestId);
    setDraggedRequestId(null);

    if (!request) return;

    if (!column.targetStatus) {
      setMessage("Закрытие заявки выполняется через форму результата в карточке заявки.");
      return;
    }

    if (request.currentStatus === column.targetStatus) return;

    if (!canTransitionRequest(request.currentStatus, column.targetStatus)) {
      setMessage("Переход из текущего статуса в выбранную колонку не разрешён процессом");
      return;
    }

    const result = transitionRequest(request.id, column.targetStatus, actorUserId, `Перемещено на канбане в колонку «${column.title}»`);
    if (!result.allowed) {
      setMessage(`Нельзя перейти на этот этап: заполните обязательные данные. Не хватает: ${result.errors.join(", ")}`);
      return;
    }
    setMessage(result.warnings.length > 0 ? `Переход выполнен. Рекомендуется заполнить: ${result.warnings.join(", ")}` : null);
  }

  return (
    <section className="kanbanSection" aria-label="Канбан заявок">
      {message && <div className="kanbanMessage" role="alert">{message}</div>}
      <div className="kanbanBoard">
        {requestsByColumn.map((column) => (
          <article
            className={`kanbanColumn${column.targetStatus ? "" : " kanbanColumnReadOnly"}`}
            key={column.id}
            onDragOver={(event) => onDragOver(event, column)}
            onDrop={(event) => onDrop(event, column)}
          >
            <header className="kanbanColumnHeader">
              <h2>{column.title}</h2>
              <div className="small muted">{column.requests.length} заявок · {formatMoney(column.offerTotal)}</div>
            </header>
            <div className="kanbanCards">
              {column.requests.map((request) => {
                const problem = isRequestProblem(request, tasks);
                const overdue = isPast(request.submissionDeadlineAt) || isPast(request.nextActionDueAt);
                return (
                  <Link
                    href={getRequestDetailsHref(request.id)}
                    className={`kanbanCard${problem ? " problemRow" : ""}${draggedRequestId === request.id ? " kanbanCardDragging" : ""}`}
                    draggable
                    key={request.id}
                    onDragStart={(event) => onDragStart(event, request.id)}
                    onDragEnd={onDragEnd}
                  >
                    <div className="kanbanCardTop">
                      <span className="small muted">{request.internalNumber}</span>
                      {(problem || overdue) && <span className="dangerText small">Проблема</span>}
                    </div>
                    <strong>{request.title}</strong>
                    <div className="small muted">{request.customerName}</div>
                    <StatusBadge status={request.currentStatus} />
                    <div className="kanbanCardMeta">
                      <span>Срок: {formatDateTime(request.submissionDeadlineAt)}</span>
                      <span>КП: {formatMoney(request.offerAmount)}</span>
                      <span>Действие: {request.nextActionText ?? "нет"}</span>
                      <span>Ответственный: {getUserName(request.ownerUserId)}</span>
                    </div>
                    <div className="small muted">{statusLabels[request.currentStatus]}</div>
                  </Link>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
