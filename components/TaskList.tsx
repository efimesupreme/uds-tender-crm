import type { RequestTask } from "@/lib/types";
import { formatDateTime, getAssigneeName, isTaskOverdue } from "@/lib/utils";
import { TaskStatusBadge } from "./StatusBadge";

export function TaskList({ tasks }: { tasks: RequestTask[] }) {
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
