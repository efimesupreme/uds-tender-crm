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
import { isMyZoneRequest } from "@/lib/user-workspace";

const emptyForm = {
  title: "",
  customerName: "",
  region: "",
  workType: "",
  submissionDeadlineAt: "",
  ownerUserId: "u-denis",
  sourceType: "",
};
const requiredFields: Array<[keyof typeof emptyForm, string]> = [
  ["title", "Наименование"],
  ["customerName", "Заказчик"],
  ["region", "Регион"],
  ["workType", "Вид работ"],
  ["ownerUserId", "Ответственный"],
  ["sourceType", "Источник"],
];

function RequestsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedRequestId = searchParams.get("selectedRequestId");
  const {
    requests,
    tasks,
    createRequest,
    transitionRequest,
    resetDemoData,
    currentUserId,
    isHydrated,
  } = useCrmStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState<"table" | "kanban">("table");
  const [zone, setZone] = useState<"all" | "mine">("all");
  const [form, setForm] = useState(emptyForm);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedRequest = selectedRequestId
    ? requests.find((request) => request.id === selectedRequestId)
    : undefined;
  const missingFields = requiredFields
    .filter(([key]) => !form[key].trim())
    .map(([, label]) => label);

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const matchesQuery =
        `${request.title} ${request.customerName} ${request.region}`
          .toLowerCase()
          .includes(query.toLowerCase());
      const matchesStatus =
        status === "all" || request.currentStatus === status;
      const matchesZone =
        zone === "all" || isMyZoneRequest(request, tasks, currentUserId);
      return matchesQuery && matchesStatus && matchesZone;
    });
  }, [requests, tasks, query, status, zone, currentUserId]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (missingFields.length > 0) {
      setMessage("Заполните обязательные поля");
      return;
    }
    const created = createRequest(
      {
        ...form,
        title: form.title.trim(),
        customerName: form.customerName.trim(),
        region: form.region.trim(),
        workType: form.workType.trim(),
        sourceType: form.sourceType.trim(),
      },
      currentUserId,
    );
    setForm({ ...emptyForm, ownerUserId: currentUserId });
    setSubmitted(false);
    setCreateOpen(false);
    setMessage("Заявка создана");
    router.push(getRequestDetailsHref(created.id));
  }

  function resetDemo() {
    if (
      !window.confirm(
        "Сбросить демо-данные до начального состояния? Локальные изменения будут удалены.",
      )
    )
      return;
    resetDemoData();
    setMessage("Демо-данные сброшены");
    router.push("/requests");
  }

  const fieldClass = (key: keyof typeof emptyForm) =>
    `input${submitted && !form[key].trim() ? " inputError" : ""}`;

  if (!isHydrated) {
    return (
      <div className="card" role="status">
        Загрузка демо-данных…
      </div>
    );
  }

  return (
    <>
      <header className="pageHeader">
        <div>
          <h1>Заявки</h1>
          <p>Реестр тендеров и входящих коммерческих обращений.</p>
        </div>
        <div className="headerActions">
          <button
            className="button"
            type="button"
            onClick={() => {
              setForm({ ...emptyForm, ownerUserId: currentUserId });
              setCreateOpen(true);
              setMessage(null);
            }}
          >
            Новая заявка
          </button>
          <button
            className="button buttonSecondary"
            type="button"
            onClick={resetDemo}
          >
            Сбросить демо-данные
          </button>
        </div>
      </header>

      {message && (
        <div className="alert" role="alert">
          {message}
        </div>
      )}

      {isCreateOpen && (
        <section
          className="card sectionStack"
          aria-labelledby="create-request-title"
        >
          <div className="pageHeader compactHeader">
            <div>
              <h2 id="create-request-title">Новая заявка</h2>
              <p>Поля со звёздочкой обязательны.</p>
            </div>
            <button
              className="button buttonSecondary"
              type="button"
              onClick={() => {
                setCreateOpen(false);
                setSubmitted(false);
                setForm({ ...emptyForm, ownerUserId: currentUserId });
              }}
            >
              Закрыть
            </button>
          </div>
          {submitted && missingFields.length > 0 && (
            <div className="alert alertDanger" role="alert">
              Заполните обязательные поля: {missingFields.join(", ")}.
            </div>
          )}
          <form className="detailGrid" onSubmit={onSubmit} noValidate>
            <label className="formField" htmlFor="request-title">
              Наименование *
              <input
                id="request-title"
                name="title"
                className={fieldClass("title")}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                aria-invalid={submitted && !form.title.trim()}
                aria-describedby={
                  submitted && !form.title.trim()
                    ? "request-title-error"
                    : undefined
                }
              />
              {submitted && !form.title.trim() && (
                <span id="request-title-error" className="dangerText small">
                  Заполните поле «Наименование».
                </span>
              )}
            </label>
            <label className="formField" htmlFor="request-customer">
              Заказчик *
              <input
                id="request-customer"
                name="customerName"
                className={fieldClass("customerName")}
                value={form.customerName}
                onChange={(e) =>
                  setForm({ ...form, customerName: e.target.value })
                }
                aria-invalid={submitted && !form.customerName.trim()}
                aria-describedby={
                  submitted && !form.customerName.trim()
                    ? "request-customer-error"
                    : undefined
                }
              />
              {submitted && !form.customerName.trim() && (
                <span id="request-customer-error" className="dangerText small">
                  Заполните поле «Заказчик».
                </span>
              )}
            </label>
            <label className="formField" htmlFor="request-region">
              Регион *
              <input
                id="request-region"
                name="region"
                className={fieldClass("region")}
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                aria-invalid={submitted && !form.region.trim()}
                aria-describedby={
                  submitted && !form.region.trim()
                    ? "request-region-error"
                    : undefined
                }
              />
              {submitted && !form.region.trim() && (
                <span id="request-region-error" className="dangerText small">
                  Заполните поле «Регион».
                </span>
              )}
            </label>
            <label className="formField" htmlFor="request-work-type">
              Вид работ *
              <input
                id="request-work-type"
                name="workType"
                className={fieldClass("workType")}
                value={form.workType}
                onChange={(e) => setForm({ ...form, workType: e.target.value })}
                aria-invalid={submitted && !form.workType.trim()}
                aria-describedby={
                  submitted && !form.workType.trim()
                    ? "request-work-type-error"
                    : undefined
                }
              />
              {submitted && !form.workType.trim() && (
                <span id="request-work-type-error" className="dangerText small">
                  Заполните поле «Вид работ».
                </span>
              )}
            </label>
            <label className="formField" htmlFor="request-submission-deadline">
              Срок подачи
              <input
                id="request-submission-deadline"
                name="submissionDeadlineAt"
                className="input"
                type="datetime-local"
                value={form.submissionDeadlineAt}
                onChange={(e) =>
                  setForm({ ...form, submissionDeadlineAt: e.target.value })
                }
              />
            </label>
            <label className="formField" htmlFor="request-owner">
              Ответственный *
              <select
                id="request-owner"
                name="ownerUserId"
                className={`select${submitted && !form.ownerUserId ? " inputError" : ""}`}
                value={form.ownerUserId}
                onChange={(e) =>
                  setForm({ ...form, ownerUserId: e.target.value })
                }
                aria-invalid={submitted && !form.ownerUserId}
                aria-describedby={
                  submitted && !form.ownerUserId
                    ? "request-owner-error"
                    : undefined
                }
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName}
                  </option>
                ))}
              </select>
              {submitted && !form.ownerUserId && (
                <span id="request-owner-error" className="dangerText small">
                  Выберите ответственного.
                </span>
              )}
            </label>
            <label className="formField" htmlFor="request-source-type">
              Источник *
              <input
                id="request-source-type"
                name="sourceType"
                className={fieldClass("sourceType")}
                value={form.sourceType}
                onChange={(e) =>
                  setForm({ ...form, sourceType: e.target.value })
                }
                aria-invalid={submitted && !form.sourceType.trim()}
                aria-describedby={
                  submitted && !form.sourceType.trim()
                    ? "request-source-type-error"
                    : undefined
                }
              />
              {submitted && !form.sourceType.trim() && (
                <span
                  id="request-source-type-error"
                  className="dangerText small"
                >
                  Заполните поле «Источник».
                </span>
              )}
            </label>
            <div className="formActions">
              <button className="button" type="submit">
                Создать заявку
              </button>
              {missingFields.length > 0 && (
                <span className="small muted">
                  Недоступно без обязательных полей: {missingFields.join(", ")}.
                </span>
              )}
            </div>
          </form>
        </section>
      )}

      <div className="filterBar">
        <label className="formField" htmlFor="request-search">
          Поиск
          <input
            id="request-search"
            name="requestSearch"
            className="input"
            placeholder="Поиск по заявке, заказчику или региону"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
          />
        </label>
        <label className="formField" htmlFor="request-status-filter">
          Статус
          <select
            id="request-status-filter"
            name="requestStatusFilter"
            className="select"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">Все статусы</option>
            {requestStatuses.map((requestStatus) => (
              <option value={requestStatus} key={requestStatus}>
                {statusLabels[requestStatus]}
              </option>
            ))}
          </select>
        </label>
        <label className="formField" htmlFor="request-zone-filter">
          Зона ответственности
          <select
            id="request-zone-filter"
            name="requestZoneFilter"
            className="select"
            value={zone}
            onChange={(event) => setZone(event.target.value as "all" | "mine")}
          >
            <option value="all">Все заявки</option>
            <option value="mine">Моя зона</option>
          </select>
        </label>
      </div>

      {selectedRequestId && (
        <section className="card selectedRequestCard">
          {selectedRequest ? (
            <RequestDetailsClient id={selectedRequestId} embedded />
          ) : (
            <div role="alert">
              <h2>Заявка не найдена</h2>
              <p className="muted">
                Проверьте ссылку или сбросьте выбранную заявку.
              </p>
              <button
                className="button"
                type="button"
                onClick={() => router.push("/requests")}
              >
                Вернуться к реестру
              </button>
            </div>
          )}
        </section>
      )}

      <div
        className="viewToggle"
        aria-label="Переключатель представления заявок"
      >
        <button
          className={`button ${view === "table" ? "" : "buttonSecondary"}`}
          type="button"
          onClick={() => setView("table")}
        >
          Таблица
        </button>
        <button
          className={`button ${view === "kanban" ? "" : "buttonSecondary"}`}
          type="button"
          onClick={() => setView("kanban")}
        >
          Канбан
        </button>
      </div>

      {view === "table" ? (
        <RequestTable requests={filteredRequests} tasks={tasks} />
      ) : (
        <RequestKanban
          requests={filteredRequests}
          tasks={tasks}
          transitionRequest={transitionRequest}
          actorUserId={currentUserId}
        />
      )}
    </>
  );
}

export default function RequestsPage() {
  return (
    <Suspense
      fallback={
        <div className="card" role="status">
          Загрузка реестра…
        </div>
      }
    >
      <RequestsPageContent />
    </Suspense>
  );
}
