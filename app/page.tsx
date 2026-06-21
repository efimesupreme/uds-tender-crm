import Link from "next/link";
import { RequestTable } from "@/components/RequestTable";
import { TaskList } from "@/components/TaskList";
import { requests, tasks } from "@/lib/mock-data";
import { formatMoney, isRequestProblem, isTaskOverdue } from "@/lib/utils";

export default function DashboardPage() {
  const activeRequests = requests.filter((request) => !["won", "lost", "not_participating", "missed_deadline", "canceled_or_paused"].includes(request.currentStatus));
  const problemRequests = requests.filter((request) => isRequestProblem(request, tasks));
  const overdueTasks = tasks.filter(isTaskOverdue);
  const ownerApprovalRequests = requests.filter((request) => request.currentStatus === "owner_approval");
  const activeOfferSum = activeRequests.reduce((sum, request) => sum + (request.offerAmount ?? 0), 0);

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
                    <Link href={`/requests/${request.id}`} className="tableLink">{request.title}</Link>
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
