"use client";

import { TaskList } from "@/components/TaskList";
import { useCrmStore } from "@/lib/client-store";
import { isTaskOverdue } from "@/lib/workflow";
import { isMyTask, isMyZoneRequest, DENIS_USER_ID } from "@/lib/user-workspace";

export default function TasksPage() {
  const { requests, tasks, currentUserId } = useCrmStore();
  const myTasks = tasks.filter((task) => isMyTask(task, currentUserId));
  const denisProblemTasks = currentUserId === DENIS_USER_ID
    ? requests.filter((request) => isMyZoneRequest(request, tasks, currentUserId)).map((request) => ({ id: `focus-${request.id}`, requestId: request.id, title: `Управленческое действие: ${request.title}`, taskType: "record_result" as const, status: "new" as const, createdBy: "u-denis", assigneeUserId: "u-denis", plannedDueAt: request.nextActionDueAt ?? request.submissionDeadlineAt, returnedCount: 0, comment: request.nextActionText ?? "Проверьте проблему по заявке" }))
    : [];
  const visibleTasks = [...myTasks, ...denisProblemTasks];
  const overdueTasks = visibleTasks.filter((task) => isTaskOverdue(task));
  const todayTasks = visibleTasks.filter((task) => task.status !== "completed" && task.status !== "accepted" && task.status !== "canceled");

  return (
    <>
      <header className="pageHeader">
        <div>
          <h1>Мои задачи</h1>
          <p>Рабочий список задач по заявкам. Данные берутся из клиентского demo-store.</p>
        </div>
      </header>

      <section className="sectionStack">
        <div className="card">
          <h2>Просроченные</h2>
          <TaskList tasks={overdueTasks} />
        </div>

        <div className="card">
          <h2>Активные</h2>
          <TaskList tasks={todayTasks} />
        </div>
      </section>
    </>
  );
}
