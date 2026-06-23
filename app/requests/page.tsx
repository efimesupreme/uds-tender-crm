"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RequestDetailsClient from "./[id]/RequestDetailsClient";
import { RequestKanban } from "@/components/RequestKanban";
import { RequestTable } from "@/components/RequestTable";
import { useCrmStore } from "@/lib/client-store";
import { getRequestDetailsHref } from "@/lib/request-links";
import { users } from "@/lib/mock-data";
import { CUSTOM_SOURCE_TYPE, requestStatuses, sourceTypeOptions, statusLabels, workTypeOptions } from "@/lib/workflow";
import type { RequestStatus, SourceType, WorkType } from "@/lib/types";
import { ADMIN_USER_ID, isMyZoneRequest } from "@/lib/user-workspace";

const emptyForm = {
  title: "",
  customerName: "",
  region: "",
  workType: "",
  submissionDeadlineAt: "",
  ownerUserId: "u-denis",
  sourceType: "",
  sourceCustomValue: "",
};
const requiredFields: Array<[keyof typeof emptyForm, string]> = [
  ["title", "Наименование"],
  ["customerName", "Заказчик"],
  ["region", "Регион"],
  ["workType", "Вид работ"],
  ["ownerUserId", "Ответственный"],
  ["sourceType", "Источник"],
];

const quickStatusFilters = [
  {
    id: "requests",
    label: "Заявки",
    statuses: [
      "new",
      "participation_decision",
      "not_participating",
      "participation_approved",
    ],
  },
  {
    id: "appeal",
    label: "Обращение",
    statuses: [
      "appeal_and_folder",
      "materials_preparation",
      "materials_received",
      "internal_approval",
      "costs_approved",
    ],
  },
  {
    id: "offer",
    label: "КП",
    statuses: [
      "offer_preparation",
      "owner_approval",
      "ready_to_submit",
      "submitted",
      "feedback_waiting",
      "won",
      "lost",
      "withdrawn_after_start",
      "missed_deadline",
      "canceled_or_paused",
    ],
  },
] as const satisfies readonly {
  id: string;
  label: string;
  statuses: readonly RequestStatus[];
}[];

type QuickStatusFilterId = (typeof quickStatusFilters)[number]["id"];

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
  const [activeQuickFilters, setActiveQuickFilters] = useState<
    QuickStatusFilterId[]
  >([]);
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
  const sourceCustomMissing = form.sourceType === CUSTOM_SOURCE_TYPE && !form.sourceCustomValue.trim();

  const baseFilteredRequests = useMemo(() => {
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

  const selectedQuickStatuses = useMemo(() => {
    return new Set(
      quickStatusFilters
        .filter((filter) => activeQuickFilters.includes(filter.id))
        .flatMap((filter) => filter.statuses),
    );
  }, [activeQuickFilters]);

  const filteredRequests = useMemo(() => {
    if (selectedQuickStatuses.size === 0) return baseFilteredRequests;
    return baseFilteredRequests.filter((request) =>
      selectedQuickStatuses.has(request.currentStatus),
    );
  }, [baseFilteredRequests, selectedQuickStatuses]);

  const quickFilterCounts = useMemo(() => {
    return Object.fromEntries(
      quickStatusFilters.map((filter) => [
        filter.id,
        baseFilteredRequests.filter((request) =>
          (filter.statuses as readonly RequestStatus[]).includes(
            request.currentStatus,
          ),
        ).length,
      ]),
    ) as Record<QuickStatusFilterId, number>;
  }, [baseFilteredRequests]);

  function toggleQuickFilter(filterId: QuickStatusFilterId) {
    setActiveQuickFilters((current) =>
      current.includes(filterId)
        ? current.filter((item) => item !== filterId)
        : [...current, filterId],
    );
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (missingFields.length > 0 || sourceCustomMissing) {
      setMessage("Заполните обязательные поля");
      return;
    }
    const created = createRequest(
      {
        ...form,
        title: form.title.trim(),
        customerName: form.customerName.trim(),
        region: form.region.trim(),
        workType: form.workType.trim() as WorkType,
        sourceType: form.sourceType.trim() as SourceType,
        sourceCustomValue: form.sourceType === CUSTOM_SOURCE_TYPE ? form.sourceCustomValue.trim() : undefined,
      },
      currentUserId,
    );
    setForm({ ...emptyForm, ownerUserId: currentUserId });
    setSubmitted(false);
    setCreateOpen(false);
    setMessage("Заявка создана, задача на согласование участия с ГД запущена");
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
            className="button buttonDanger"
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
                <span
                  id="request-title-error"
                  className="dangerText small"
                  role="alert"
                >
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
                <span
                  id="request-customer-error"
                  className="dangerText small"
                  role="alert"
                >
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
                <span
                  id="request-region-error"
                  className="dangerText small"
                  role="alert"
                >
                  Заполните поле «Регион».
                </span>
              )}
            </label>
            <label className="formField" htmlFor="request-work-type">
              Вид работ *
              <select
                id="request-work-type"
                name="workType"
                className={`select${submitted && !form.workType.trim() ? " inputError" : ""}`}
                value={form.workType}
                onChange={(e) => setForm({ ...form, workType: e.target.value })}
                aria-invalid={submitted && !form.workType.trim()}
                aria-describedby={submitted && !form.workType.trim() ? "request-work-type-error" : undefined}
              >
                <option value="">Выберите вид работ</option>
                {workTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              {submitted && !form.workType.trim() && (
                <span
                  id="request-work-type-error"
                  className="dangerText small"
                  role="alert"
                >
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
                <span
                  id="request-owner-error"
                  className="dangerText small"
                  role="alert"
                >
                  Выберите ответственного.
                </span>
              )}
            </label>
            <label className="formField" htmlFor="request-source-type">
              Источник *
              <select
                id="request-source-type"
                name="sourceType"
                className={`select${submitted && !form.sourceType.trim() ? " inputError" : ""}`}
                value={form.sourceType}
                onChange={(e) => setForm({ ...form, sourceType: e.target.value, sourceCustomValue: e.target.value === CUSTOM_SOURCE_TYPE ? form.sourceCustomValue : "" })}
                aria-invalid={submitted && !form.sourceType.trim()}
                aria-describedby={submitted && !form.sourceType.trim() ? "request-source-type-error" : undefined}
              >
                <option value="">Выберите источник</option>
                {sourceTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                <option value={CUSTOM_SOURCE_TYPE}>{CUSTOM_SOURCE_TYPE}</option>
              </select>
              {submitted && !form.sourceType.trim() && (
                <span
                  id="request-source-type-error"
                  className="dangerText small"
                  role="alert"
                >
                  Заполните поле «Источник».
                </span>
              )}
            </label>
            {form.sourceType === CUSTOM_SOURCE_TYPE && (
              <label className="formField" htmlFor="request-source-custom">
                Свободный источник *
                <input
                  id="request-source-custom"
                  name="sourceCustomValue"
                  className={`input${submitted && sourceCustomMissing ? " inputError" : ""}`}
                  value={form.sourceCustomValue}
                  onChange={(e) => setForm({ ...form, sourceCustomValue: e.target.value })}
                  aria-invalid={submitted && sourceCustomMissing}
                  aria-describedby={submitted && sourceCustomMissing ? "request-source-custom-error" : "request-source-custom-help"}
                />
                <span id="request-source-custom-help" className="small muted">Например, имя сотрудника компании.</span>
                {submitted && sourceCustomMissing && <span id="request-source-custom-error" className="dangerText small" role="alert">Заполните свободный источник.</span>}
              </label>
            )}
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

      <div className="toolbar">
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
            <option value="mine">{currentUserId === ADMIN_USER_ID ? "Все" : "Моя зона"}</option>
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

      <div className="tableControls">
        {view === "table" && (
          <div
            className="quickFilterChips"
            aria-label="Быстрые фильтры по группам статусов"
          >
            {quickStatusFilters.map((filter) => {
              const isActive = activeQuickFilters.includes(filter.id);
              return (
                <button
                  key={filter.id}
                  type="button"
                  className={`filterChip${isActive ? " filterChipActive" : ""}`}
                  aria-pressed={isActive}
                  onClick={() => toggleQuickFilter(filter.id)}
                >
                  <span>{filter.label}</span>
                  <span className="filterChipCount">
                    {quickFilterCounts[filter.id]}
                  </span>
                </button>
              );
            })}
          </div>
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
