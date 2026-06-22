"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RequestDetailsClient from "./[id]/RequestDetailsClient";
import { RequestKanban } from "@/components/RequestKanban";
import { RequestTable } from "@/components/RequestTable";
import { useCrmStore } from "@/lib/client-store";
import { getRequestDetailsHref } from "@/lib/request-links";
import { users } from "@/lib/mock-data";
import { requestStatuses, statusLabels } from "@/lib/workflow";

const emptyForm = { title: "", customerName: "", region: "", workType: "", submissionDeadlineAt: "", ownerUserId: "u-denis", sourceType: "" };
const requiredFields: Array<[keyof typeof emptyForm, string]> = [
  ["title", "Наименование"], ["customerName", "Заказчик"], ["region", "Регион"],
  ["workType", "Вид работ"], ["ownerUserId", "Ответственный"], ["sourceType", "Источник"]
];

function RequestsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedRequestId = searchParams.get("selectedRequestId");
  const { requests, tasks, createRequest, transitionRequest, resetDemoData, isHydrated } = useCrmStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState<"table" | "kanban">("table");
  const [form, setForm] = useState(emptyForm);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedRequest = selectedRequestId ? requests.find((request) => request.id === selectedRequestId) : undefined;
  const missingFields = requiredFields.filter(([key]) => !form[key].trim()).map(([, label]) => label);

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const matchesQuery = `${request.title} ${request.customerName} ${request.region}`.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = status === "all" || request.currentStatus === status;
      return matchesQuery && matchesStatus;
    });
  }, [requests, query, status]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (missingFields.length > 0) {
      setMessage("Заполните обязательные поля");
      return;
    }
    const created = createRequest({ ...form, title: form.title.trim(), customerName: form.customerName.trim(), region: form.region.trim(), workType: form.workType.trim(), sourceType: form.sourceType.trim() });
    setForm(emptyForm);
    setSubmitted(false);
    setCreateOpen(false);
    setMessage("Заявка создана");
    router.push(getRequestDetailsHref(created.id));
  }

  function resetDemo() {
    if (!window.confirm("Сбросить демо-данные до начального состояния? Локальные изменения будут удалены.")) return;
    resetDemoData();
    setMessage("Демо-данные сброшены");
    router.push("/requests");
  }

  const fieldClass = (key: keyof typeof emptyForm) => `input${submitted && !form[key].trim() ? " inputError" : ""}`;

  if (!isHydrated) {
    return <div className="card" role="status">Загрузка демо-данных…</div>;
  }

  return (
    <>
      <header className="pageHeader">
        <div>
          <h1>Заявки</h1>
          <p>Реестр тендеров и входящих коммерческих обращений.</p>
        </div>
        <div className="headerActions">
          <button className="button" type="button" onClick={() => { setCreateOpen(true); setMessage(null); }}>Новая заявка</button>
          <button className="button buttonSecondary" type="button" onClick={resetDemo}>Сбросить демо-данные</button>
        </div>
      </header>

      {message && <div className="alert" role="alert">{message}</div>}

      {isCreateOpen && (
        <section className="card sectionStack" aria-labelledby="create-request-title">
          <div className="pageHeader compactHeader">
            <div><h2 id="create-request-title">Новая заявка</h2><p>Поля со звёздочкой обязательны.</p></div>
            <button className="button buttonSecondary" type="button" onClick={() => setCreateOpen(false)}>Закрыть</button>
          </div>
          {submitted && missingFields.length > 0 && <div className="alert alertDanger" role="alert">Заполните обязательные поля: {missingFields.join(", ")}.</div>}
          <form className="detailGrid" onSubmit={onSubmit} noValidate>
            <label className="formField">Наименование *<input className={fieldClass("title")} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
            <label className="formField">Заказчик *<input className={fieldClass("customerName")} value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></label>
            <label className="formField">Регион *<input className={fieldClass("region")} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></label>
            <label className="formField">Вид работ *<input className={fieldClass("workType")} value={form.workType} onChange={(e) => setForm({ ...form, workType: e.target.value })} /></label>
            <label className="formField">Срок подачи<input className="input" type="datetime-local" value={form.submissionDeadlineAt} onChange={(e) => setForm({ ...form, submissionDeadlineAt: e.target.value })} /></label>
            <label className="formField">Ответственный *<select className={`select${submitted && !form.ownerUserId ? " inputError" : ""}`} value={form.ownerUserId} onChange={(e) => setForm({ ...form, ownerUserId: e.target.value })}>{users.map((user) => <option key={user.id} value={user.id}>{user.fullName}</option>)}</select></label>
            <label className="formField">Источник *<input className={fieldClass("sourceType")} value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value })} /></label>
            <div className="formActions"><button className="button" type="submit">Создать заявку</button>{missingFields.length > 0 && <span className="small muted">Недоступно без обязательных полей: {missingFields.join(", ")}.</span>}</div>
          </form>
        </section>
      )}

      <div className="filterBar">
        <input className="input" placeholder="Поиск по заявке, заказчику или региону" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">Все статусы</option>
          {requestStatuses.map((requestStatus) => <option value={requestStatus} key={requestStatus}>{statusLabels[requestStatus]}</option>)}
        </select>
      </div>

      {selectedRequestId && <section className="card selectedRequestCard">{selectedRequest ? <RequestDetailsClient id={selectedRequestId} embedded /> : <div role="alert"><h2>Заявка не найдена</h2><p className="muted">Проверьте ссылку или сбросьте выбранную заявку.</p><button className="button" type="button" onClick={() => router.push("/requests")}>Вернуться к реестру</button></div>}</section>}

      <div className="viewToggle" aria-label="Переключатель представления заявок">
        <button className={`button ${view === "table" ? "" : "buttonSecondary"}`} type="button" onClick={() => setView("table")}>Таблица</button>
        <button className={`button ${view === "kanban" ? "" : "buttonSecondary"}`} type="button" onClick={() => setView("kanban")}>Канбан</button>
      </div>

      {view === "table" ? <RequestTable requests={filteredRequests} tasks={tasks} /> : <RequestKanban requests={filteredRequests} tasks={tasks} transitionRequest={transitionRequest} />}
    </>
  );
}


export default function RequestsPage() {
  return (
    <Suspense fallback={<div className="card" role="status">Загрузка реестра…</div>}>
      <RequestsPageContent />
    </Suspense>
  );
}
