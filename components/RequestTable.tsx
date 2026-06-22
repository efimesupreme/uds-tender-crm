import Link from "next/link";
import type { Request, RequestTask } from "@/lib/types";
import { isFinalRequestStatus, isRequestProblem, statusLabels } from "@/lib/workflow";
import { formatDateTime, formatMoney, getUserName } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

export function RequestTable({ requests, tasks }: { requests: Request[]; tasks: RequestTask[] }) {
  return (
    <div className="tableWrap">
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
                <Link href={`/requests/${request.id}`} className="tableLink">
                  {request.title}
                </Link>
                <div className="small muted">{request.region} · {request.workType}</div>
              </td>
              <td>{request.customerName}</td>
              <td><StatusBadge status={request.currentStatus} /></td>
              <td>{formatDateTime(request.submissionDeadlineAt)}</td>
              <td>{request.nextActionText ?? <span className="dangerText">Нет следующего действия</span>}</td>
              <td>{getUserName(request.ownerUserId)}</td>
              <td>{formatMoney(request.offerAmount)}</td>
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
  );
}
