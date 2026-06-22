import type { RequestTask } from "@/lib/types";
import { isTaskOverdue } from "@/lib/workflow";
import { formatDateTime, getAssigneeName } from "@/lib/utils";
import { TaskStatusBadge } from "./StatusBadge";

type TaskActions = {
  actorUserId: string;
  startTask: (taskId: string, actorUserId: string) => void;
  completeTask: (taskId: string, actorUserId: string, resultText?: string) => void;
  returnTask: (taskId: string, actorUserId: string, comment?: string) => void;
  acceptTask: (taskId: string, actorUserId: string) => void;
};

export function TaskList({ tasks, actions }: { tasks: RequestTask[]; actions?: TaskActions }) {
  if (tasks.length === 0) {
    return <p className="muted">Задач пока нет.</p>;
  }

  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Задача</th>
            <th>Исполнитель</th>
            <th>Срок</th>
            <th>Статус</th>
            <th>Возвраты</th>
            {actions && <th>Действия</th>}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className={isTaskOverdue(task) ? "problemRow" : undefined}>
              <td>
                {task.title}
                {task.comment && <div className="small muted">{task.comment}</div>}
              </td>
              <td>{getAssigneeName(task)}</td>
              <td>{formatDateTime(task.plannedDueAt)}</td>
              <td><TaskStatusBadge status={task.status} /></td>
              <td>{task.returnedCount}</td>
              {actions && (
                <td>
                  <div className="filterBar">
                    <button className="button" type="button" onClick={() => actions.startTask(task.id, actions.actorUserId)}>В работу</button>
                    <button className="button" type="button" onClick={() => actions.completeTask(task.id, actions.actorUserId, "Выполнено")}>Выполнить</button>
                    <button className="button" type="button" onClick={() => actions.returnTask(task.id, actions.actorUserId, "Возвращено на доработку")}>Вернуть</button>
                    <button className="button" type="button" onClick={() => actions.acceptTask(task.id, actions.actorUserId)}>Принять</button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
