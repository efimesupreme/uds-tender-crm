import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { TaskList } from "@/components/TaskList";
import { events, fileLinks, requests, statusHistory, tasks } from "@/lib/mock-data";
import { formatDateTime, formatMoney, getExternalName, getStatusLabel, getUserName } from "@/lib/utils";

export default async function RequestDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const request = requests.find((item) => item.id === id);

  if (!request) {
    notFound();
  }

  const requestTasks = tasks.filter((task) => task.requestId === request.id);
  const requestFiles = fileLinks.filter((link) => link.requestId === request.id);
  const requestEvents = events.filter((event) => event.requestId === request.id);
  const requestHistory = statusHistory.filter((item) => item.requestId === request.id);

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
            <div className="field"><span>Сумма КП</span><strong>{formatMoney(request.offerAmount)}</strong></div>
          </div>
        </div>

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
          <h2>Задачи</h2>
          <TaskList tasks={requestTasks} />
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
