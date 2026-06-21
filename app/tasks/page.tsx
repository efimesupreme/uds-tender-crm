import { TaskList } from "@/components/TaskList";
import { tasks } from "@/lib/mock-data";
import { isTaskOverdue } from "@/lib/utils";

export default function TasksPage() {
  const overdueTasks = tasks.filter(isTaskOverdue);
  const todayTasks = tasks.filter((task) => task.status !== "completed" && task.status !== "accepted" && task.status !== "canceled");

  return (
    <>
      <header className="pageHeader">
        <div>
          <h1>Мои задачи</h1>
          <p>Рабочий список задач по заявкам. В MVP пока показаны общие моковые данные.</p>
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
