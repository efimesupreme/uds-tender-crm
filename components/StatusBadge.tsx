import type { RequestStatus, TaskStatus } from "@/lib/types";
import { getStatusLabel, getStatusTone } from "@/lib/utils";

const taskLabels: Record<TaskStatus, string> = {
  new: "Новая",
  in_progress: "В работе",
  completed: "Выполнено"
};

const taskTones: Record<TaskStatus, string> = {
  new: "neutral",
  in_progress: "info",
  completed: "success"
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return <span className={`badge ${getStatusTone(status)}`}>{getStatusLabel(status)}</span>;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`badge ${taskTones[status]}`}>{taskLabels[status]}</span>;
}
