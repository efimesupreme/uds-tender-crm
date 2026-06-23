import Link from "next/link";
import { getRequestDetailsHref } from "@/lib/request-links";
import type { Request, RequestTask } from "@/lib/types";
import { getTaskDuration } from "@/lib/metrics";
import { formatDateTime, getAssigneeName, getUserName } from "@/lib/utils";
import { getAllowedTaskAssigneeUserIds } from "@/lib/workflow";
import { TaskStatusBadge } from "./StatusBadge";

type TaskActions = {
  actorUserId: string;
  requests: Request[];
  updateTaskAssignee: (taskId: string, assigneeUserId: string, actorUserId: string) => void;
  onCompleteClick: (task: RequestTask) => void;
};

export function TaskList({ tasks, actions }: { tasks: RequestTask[]; actions?: TaskActions }) {
  if (tasks.length === 0) return <p className="muted">Задач пока нет.</p>;

  const renderAssignee = (task: RequestTask) => actions ? (
    <select
      className="select"
      value={task.assigneeUserId ?? ""}
      aria-label={`Ответственный по задаче ${task.title}`}
      onChange={(event) => actions.updateTaskAssignee(task.id, event.target.value, actions.actorUserId)}
    >
      {getAllowedTaskAssigneeUserIds(task.taskType).map((userId) => <option key={userId} value={userId}>{getUserName(userId)}</option>)}
    </select>
  ) : getAssigneeName(task);

  const requestTitle = (task: RequestTask) => actions?.requests.find((request) => request.id === task.requestId)?.title ?? task.requestId;

  return (
    <>
      <div className="taskCardList" aria-label="Список задач">
        {tasks.map((task) => {
          const duration = getTaskDuration(task);
          return (
            <article className="taskMobileCard" key={task.id}>
              <div className="kanbanCardTop"><strong>{task.title}</strong><TaskStatusBadge status={task.status} /></div>
              <div className="small muted">Заявка: <Link className="tableLink" href={getRequestDetailsHref(task.requestId)}>{requestTitle(task)}</Link></div>
              {task.comment && <div className="small muted">{task.comment}</div>}
              <div className="mobileMetaGrid">
                <span>Ответственный: {renderAssignee(task)}</span>
                <span>Срок: {formatDateTime(task.plannedDueAt)}</span>
                <span>Факт: {formatDateTime(task.completedAt)}</span>
                <span>Длительность: {duration.durationText}</span>
              </div>
              {actions && task.status !== "completed" && <button className="button" type="button" onClick={() => actions.onCompleteClick(task)}>Исполнено</button>}
            </article>
          );
        })}
      </div>
      <div className="tableWrap taskDesktopTable">
        <table>
          <thead><tr><th>Задача</th><th>Ответственный</th><th>Срок</th><th>Факт</th><th>Длительность</th><th>Статус</th>{actions && <th>Действия</th>}</tr></thead>
          <tbody>
            {tasks.map((task) => {
              const duration = getTaskDuration(task);
              return (
                <tr key={task.id}>
                  <td>{task.title}<div className="small muted">Заявка: <Link className="tableLink" href={getRequestDetailsHref(task.requestId)}>{requestTitle(task)}</Link></div>{task.comment && <div className="small muted">{task.comment}</div>}</td>
                  <td className="assigneeCell">{renderAssignee(task)}</td>
                  <td>{formatDateTime(task.plannedDueAt)}</td>
                  <td>{formatDateTime(task.completedAt)}</td>
                  <td>{duration.durationText}</td>
                  <td><TaskStatusBadge status={task.status} /></td>
                  {actions && <td>{task.status !== "completed" ? <button className="button" type="button" onClick={() => actions.onCompleteClick(task)}>Исполнено</button> : "—"}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
