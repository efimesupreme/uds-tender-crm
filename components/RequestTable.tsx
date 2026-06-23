import Link from "next/link";
import { getRequestDetailsHref } from "@/lib/request-links";
import type { Request, RequestTask } from "@/lib/types";
import { isFinalRequestStatus, isRequestProblem, statusLabels } from "@/lib/workflow";
import { formatDateTime, formatMoney, getUserName } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

export function RequestTable({ requests, tasks }: { requests: Request[]; tasks: RequestTask[] }) {
  return (
    <>
      <div className="requestCardList" aria-label="Список заявок">
        {requests.map((request) => {
          const problem = isRequestProblem(request, tasks);
          return (
            <Link href={getRequestDetailsHref(request.id)} className={`requestMobileCard${problem ? " problemRow" : ""}`} key={request.id}>
              <div className="kanbanCardTop">
                <span className="small muted">{request.internalNumber}</span>
                {problem && <span className="dangerText small">Проблема</span>}
              </div>
              <strong>{request.title}</strong>
              <div className="small muted">{request.customerName}</div>
              <StatusBadge status={request.currentStatus} />
              <div className="mobileMetaGrid">
                <span>Срок: {formatDateTime(request.submissionDeadlineAt)}</span>
                <span>Ответственный: {getUserName(request.ownerUserId)}</span>
                <span>КП: {formatMoney(request.offerAmount)}</span>
                <span>Дальше: {request.nextActionText ?? "нет действия"}</span>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="tableWrap requestDesktopTable">
        <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Заявка</th>
            <th>Заказчик</th>
            <th>Статус</th>
            <th>Срок подачи</th>
            <th>Следующее действие</th>
            <th>Ответственный</th>
            <th>КП</th>
            <th>Результат</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id} className={isRequestProblem(request, tasks) ? "problemRow" : undefined}>
              <td className="muted">{request.internalNumber}</td>
              <td>
                <Link href={getRequestDetailsHref(request.id)} className="tableLink">
                  {request.title}
                </Link>
                <div className="small muted">{request.region} · {request.workType}</div>
              </td>
              <td>{request.customerName}</td>
              <td><StatusBadge status={request.currentStatus} /></td>
              <td className="dateCell">{formatDateTime(request.submissionDeadlineAt)}</td>
              <td>{request.nextActionText ?? <span className="dangerText">Нет следующего действия</span>}</td>
              <td className="assigneeCell">{getUserName(request.ownerUserId)}</td>
              <td className="moneyCell">{formatMoney(request.offerAmount)}</td>
              <td>{isFinalRequestStatus(request.currentStatus) ? (
                <>
                  <strong>{statusLabels[request.currentStatus]}</strong>
                  <div className="small muted">{request.lossReason ?? request.closureReason ?? request.nonParticipationReason ?? "—"}</div>
                  <div className="small muted">{formatDateTime(request.closedAt)}</div>
                </>
              ) : "—"}</td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </>
  );
}
