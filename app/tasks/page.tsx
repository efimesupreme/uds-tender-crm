"use client";

import { useMemo, useState } from "react";
import { TaskList } from "@/components/TaskList";
import { useCrmStore } from "@/lib/client-store";
import type { RequestTask, TaskStatus } from "@/lib/types";
import { getUserName } from "@/lib/utils";
import { taskTypeLabels } from "@/lib/workflow";
import { ADMIN_USER_ID, isMyTask } from "@/lib/user-workspace";

const statusFilters: Array<{ id: TaskStatus; label: string }> = [
  { id: "new", label: "Новые" },
  { id: "in_progress", label: "В работе" },
  { id: "completed", label: "Выполнено" },
];

export default function TasksPage() {
  const { requests, tasks, currentUserId, updateTaskAssignee, updateTaskExecutor, startTask, returnTaskToWork, completeTaskWithEffects } = useCrmStore();
  const [activeStatuses, setActiveStatuses] = useState<TaskStatus[]>([]);
  const [confirmTask, setConfirmTask] = useState<RequestTask | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isAdmin = currentUserId === ADMIN_USER_ID;
  const visibleTasks = tasks.filter((task) => isMyTask(task, currentUserId));
  const filteredTasks = activeStatuses.length === 0 ? visibleTasks : visibleTasks.filter((task) => activeStatuses.includes(task.status));
  const groups = useMemo(() => ({
    new: filteredTasks.filter((task) => task.status === "new"),
    in_progress: filteredTasks.filter((task) => task.status === "in_progress"),
    completed: filteredTasks.filter((task) => task.status === "completed"),
  }), [filteredTasks]);
  const counts = Object.fromEntries(statusFilters.map((filter) => [filter.id, visibleTasks.filter((task) => task.status === filter.id).length])) as Record<TaskStatus, number>;

  function toggleStatus(status: TaskStatus) {
    setActiveStatuses((current) => current.includes(status) ? current.filter((item) => item !== status) : [...current, status]);
  }
  function confirmComplete() {
    if (!confirmTask) return;
    const result = completeTaskWithEffects(confirmTask.id, currentUserId);
    setMessage(result.join(". "));
    setConfirmTask(null);
  }
  const request = confirmTask ? requests.find((item) => item.id === confirmTask.requestId) : undefined;

  return (
    <>
      <header className="pageHeader"><div><h1>Мои задачи</h1><p>Рабочий список задач по заявкам. Данные берутся из клиентского demo-store.</p></div></header>
      {message && <div className="alert" role="alert">{message}</div>}
      {isAdmin && <div className="inlineAlert" role="status">Режим администратора: показаны все задачи</div>}
      <div className="tableControls"><div className="quickFilterChips" aria-label="Фильтры задач по статусу">
        {statusFilters.map((filter) => {
          const isActive = activeStatuses.includes(filter.id);
          return <button key={filter.id} type="button" className={`filterChip${isActive ? " filterChipActive" : ""}`} aria-pressed={isActive} onClick={() => toggleStatus(filter.id)}><span>{filter.label}</span><span className="filterChipCount">{counts[filter.id]}</span></button>;
        })}
      </div></div>
      <section className="sectionStack">
        <div className="card"><h2>Новые</h2><TaskList tasks={groups.new} actions={{ actorUserId: currentUserId, requests, updateTaskAssignee, updateTaskExecutor, startTask, returnTaskToWork, onCompleteClick: setConfirmTask }} /></div>
        <div className="card"><h2>В работе</h2><TaskList tasks={groups.in_progress} actions={{ actorUserId: currentUserId, requests, updateTaskAssignee, updateTaskExecutor, startTask, returnTaskToWork, onCompleteClick: setConfirmTask }} /></div>
        {(activeStatuses.includes("completed") || activeStatuses.length === 0) && <div className="card"><h2>Выполнено</h2><TaskList tasks={groups.completed} actions={{ actorUserId: currentUserId, requests, updateTaskAssignee, updateTaskExecutor, startTask, returnTaskToWork, onCompleteClick: setConfirmTask }} /></div>}
      </section>
      {confirmTask && <div className="modalBackdrop" role="presentation"><section className="modalCard" role="dialog" aria-modal="true" aria-labelledby="complete-task-title">
        <h2 id="complete-task-title">Подтвердите исполнение</h2>
        <div className="detailGrid"><div className="field"><span>ID заявки</span><strong>{request?.internalNumber ?? confirmTask.requestId}</strong></div><div className="field"><span>Название заявки</span><strong>{request?.title ?? "—"}</strong></div><div className="field"><span>Задача</span><strong>{confirmTask.title}</strong></div><div className="field"><span>Ответственный</span><strong>{getUserName(confirmTask.assigneeUserId)}</strong></div>{confirmTask.executorName && <div className="field"><span>Исполнитель</span><strong>{confirmTask.executorName}</strong></div>}<div className="field"><span>Процесс</span><strong>{taskTypeLabels[confirmTask.taskType]} может запустить следующий шаг или показать предупреждение.</strong></div></div>
        <div className="inlineAlert warning" role="alert">После подтверждения задача станет выполненной; связанные действия будут созданы без дублей.</div>
        <div className="formActions"><button className="button" type="button" onClick={confirmComplete}>Подтвердить</button><button className="button buttonSecondary" type="button" onClick={() => setConfirmTask(null)}>Отмена</button></div>
      </section></div>}
    </>
  );
}
