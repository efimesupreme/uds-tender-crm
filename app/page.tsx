"use client";

import Link from "next/link";
import { getRequestDetailsHref } from "@/lib/request-links";
import { RequestTable } from "@/components/RequestTable";
import { TaskList } from "@/components/TaskList";
import { useCrmStore } from "@/lib/client-store";
import { getAverageStageDurations, getProcessBottlenecks } from "@/lib/metrics";
import { formatMoney } from "@/lib/utils";
import { isActiveRequest, isRequestProblem, isTaskOverdue } from "@/lib/workflow";

export default function DashboardPage() {
  const { requests, tasks, statusHistory, isHydrated } = useCrmStore();

  if (!isHydrated) {
    return <div className="card" role="status">Загрузка демо-данных…</div>;
  }
  const activeRequests = requests.filter((request) => isActiveRequest(request.currentStatus));
  const problemRequests = requests.filter((request) => isRequestProblem(request, tasks));
  const overdueTasks = tasks.filter((task) => isTaskOverdue(task));
  const ownerApprovalRequests = requests.filter((request) => request.currentStatus === "owner_approval");
  const activeOfferSum = activeRequests.reduce((sum, request) => sum + (request.offerAmount ?? 0), 0);
  const bottlenecks = getProcessBottlenecks(requests, tasks, statusHistory);
  const averageStageDurations = getAverageStageDurations(requests, statusHistory).filter((stage) => ["participation_decision", "appeal_and_folder", "materials_preparation", "offer_preparation", "owner_approval", "feedback_waiting"].includes(stage.status));
  const closedStats = {
    won: requests.filter((request) => request.currentStatus === "won").length,
    lost: requests.filter((request) => request.currentStatus === "lost").length,
    notParticipating: requests.filter((request) => request.currentStatus === "not_participating").length,
    withdrawn: requests.filter((request) => request.currentStatus === "withdrawn_after_start").length,
    missedDeadline: requests.filter((request) => request.currentStatus === "missed_deadline").length
  };

  return (
    <>
      <header className="pageHeader">
        <div>
          <h1>Дашборд</h1>
          <p>Контроль активных заявок, просрочек и следующих действий.</p>
        </div>
        <Link href="/requests" className="button">Открыть реестр</Link>
      </header>

      <section className="cardGrid">
        <div className="card">
          <div className="metric">{activeRequests.length}</div>
          <div className="metricLabel">активных заявок</div>
        </div>
        <div className="card">
          <div className="metric">{overdueTasks.length}</div>
          <div className="metricLabel">просроченных задач</div>
        </div>
        <div className="card">
          <div className="metric">{problemRequests.length}</div>
          <div className="metricLabel">проблемных заявок</div>
        </div>
        <div className="card">
          <div className="metric">{formatMoney(activeOfferSum)}</div>
          <div className="metricLabel">активная сумма КП</div>
        </div>
      </section>


      <section className="card">
        <h2>Статистика закрытия</h2>
        <div className="detailGrid">
          <div className="field"><span>Победили</span><strong>{closedStats.won}</strong></div>
          <div className="field"><span>Проиграли</span><strong>{closedStats.lost}</strong></div>
          <div className="field"><span>Не участвуем</span><strong>{closedStats.notParticipating}</strong></div>
          <div className="field"><span>Отказались после запуска</span><strong>{closedStats.withdrawn}</strong></div>
          <div className="field"><span>Не успели податься</span><strong>{closedStats.missedDeadline}</strong></div>
        </div>
      </section>

      <section className="gridTwo">
        <div className="card">
          <h2>Узкие места процесса</h2>
          {bottlenecks.length === 0 ? <p className="muted">Критичных узких мест не найдено.</p> : (
            <ul>
              {bottlenecks.slice(0, 8).map((item) => (
                <li key={item.id}>
                  <Link href={getRequestDetailsHref(item.requestId)} className="tableLink">{item.requestNumber}</Link> — {item.title}
                  <div className="small muted">{item.description}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h2>Средние сроки этапов</h2>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Этап</th>
                  <th>Средний срок</th>
                  <th>Замеров</th>
                </tr>
              </thead>
              <tbody>
                {averageStageDurations.map((stage) => (
                  <tr key={stage.status}>
                    <td>{stage.statusLabel}</td>
                    <td>{stage.count > 0 ? stage.averageText : "Недостаточно данных"}</td>
                    <td>{stage.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="gridTwo">
        <div className="card">
          <h2>Требует внимания</h2>
          <RequestTable requests={problemRequests} tasks={tasks} />
        </div>
        <div className="sectionStack">
          <div className="card">
            <h2>Просроченные задачи</h2>
            <TaskList tasks={overdueTasks} />
          </div>
          <div className="card">
            <h2>КП на согласовании у МЛ</h2>
            {ownerApprovalRequests.length === 0 ? (
              <p className="muted">Нет заявок на этом этапе.</p>
            ) : (
              <ul>
                {ownerApprovalRequests.map((request) => (
                  <li key={request.id}>
                    <Link href={getRequestDetailsHref(request.id)} className="tableLink">{request.title}</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
