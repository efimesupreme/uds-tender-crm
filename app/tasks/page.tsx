"use client";

import { TaskList } from "@/components/TaskList";
import { useCrmStore } from "@/lib/client-store";
import { isTaskOverdue } from "@/lib/workflow";

export default function TasksPage() {
  const { tasks } = useCrmStore();
  const overdueTasks = tasks.filter((task) => isTaskOverdue(task));
  const todayTasks = tasks.filter((task) => task.status !== "completed" && task.status !== "accepted" && task.status !== "canceled");

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
