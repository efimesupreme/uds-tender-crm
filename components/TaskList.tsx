import Link from "next/link";
import { getRequestDetailsHref } from "@/lib/request-links";
import type { Request, RequestTask } from "@/lib/types";
import { formatDateTime, getUserName } from "@/lib/utils";
import { getAllowedTaskAssigneeUserIds } from "@/lib/workflow";
import { TaskStatusBadge } from "./StatusBadge";

type TaskActions = {
  actorUserId: string;
  requests: Request[];
  updateTaskAssignee: (taskId: string, assigneeUserId: string, actorUserId: string) => void;
  updateTaskExecutor: (taskId: string, executorName: string, actorUserId: string) => void;
  startTask: (taskId: string, actorUserId: string) => void;
  returnTaskToWork: (taskId: string, actorUserId: string) => void;
  onCompleteClick: (task: RequestTask) => void;
};

export function TaskList({ tasks, actions }: { tasks: RequestTask[]; actions?: TaskActions }) {
  if (tasks.length === 0) return <p className="muted">Задач пока нет.</p>;

  const requestFor = (task: RequestTask) => actions?.requests.find((request) => request.id === task.requestId);
  const requestLabel = (task: RequestTask) => {
    const request = requestFor(task);
    return `${request?.internalNumber ?? task.requestId} · ${request?.title ?? task.requestId}`;
  };

  const renderResponsible = (task: RequestTask) => actions ? (
    <label className="srOnlyWrap" htmlFor={`task-responsible-${task.id}`}>
      <span className="srOnly">Ответственный</span>
      <select
        id={`task-responsible-${task.id}`}
        name="responsibleUserId"
        className="select"
        value={task.assigneeUserId ?? ""}
        aria-label={`Ответственный по задаче ${task.title}`}
        onChange={(event) => actions.updateTaskAssignee(task.id, event.target.value, actions.actorUserId)}
      >
        {getAllowedTaskAssigneeUserIds(task.taskType).map((userId) => <option key={userId} value={userId}>{getUserName(userId)}</option>)}
      </select>
    </label>
  ) : getUserName(task.assigneeUserId);

  const renderExecutor = (task: RequestTask) => actions ? (
    <label className="srOnlyWrap" htmlFor={`task-executor-${task.id}`}>
      <span className="srOnly">Исполнитель</span>
      <input
        id={`task-executor-${task.id}`}
        name="executorName"
        className="input"
        type="text"
        value={task.executorName ?? ""}
        placeholder="Вписать исполнителя"
        onChange={(event) => actions.updateTaskExecutor(task.id, event.target.value, actions.actorUserId)}
      />
    </label>
  ) : (task.executorName || "—");

  const renderAction = (task: RequestTask) => {
    if (!actions) return null;
    if (task.status === "new") return <button className="button" type="button" onClick={() => actions.startTask(task.id, actions.actorUserId)}>Взять в работу</button>;
    if (task.status === "in_progress") return <button className="button" type="button" onClick={() => actions.onCompleteClick(task)}>Исполнено</button>;
    return <button className="button buttonSecondary taskReturnButton" type="button" onClick={() => actions.returnTaskToWork(task.id, actions.actorUserId)}>Вернуть в работу</button>;
  };

  return (
    <>
      <div className="taskCardList" aria-label="Список задач">
        {tasks.map((task) => (
          <article className="taskMobileCard" key={task.id}>
            <div className="kanbanCardTop"><strong>{requestLabel(task)}</strong><TaskStatusBadge status={task.status} /></div>
            <div className="small">Задача: {task.title}</div>
            {task.comment && <div className="small muted">{task.comment}</div>}
            <div className="mobileMetaGrid">
              <span>Срок: {formatDateTime(task.plannedDueAt)}</span>
              <span>Ответственный: {renderResponsible(task)}</span>
              <span>Исполнитель: {renderExecutor(task)}</span>
            </div>
            {actions && <div>{renderAction(task)}</div>}
          </article>
        ))}
      </div>
      <div className="tableWrap taskDesktopTable">
        <table className="taskTable">
          <thead><tr><th>ID / заявка</th><th>Задача</th><th>Статус</th><th>Срок</th><th>Ответственный</th><th>Исполнитель</th>{actions && <th>Действия</th>}</tr></thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td><Link className="tableLink" href={getRequestDetailsHref(task.requestId)}>{requestLabel(task)}</Link></td>
                <td>Задача: {task.title}{task.comment && <div className="small muted">{task.comment}</div>}</td>
                <td><TaskStatusBadge status={task.status} /></td>
                <td>{formatDateTime(task.plannedDueAt)}</td>
                <td className="assigneeCell">{renderResponsible(task)}</td>
                <td className="assigneeCell">{renderExecutor(task)}</td>
                {actions && <td>{renderAction(task)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
