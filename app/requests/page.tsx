"use client";

import { FormEvent, useMemo, useState } from "react";
import { RequestTable } from "@/components/RequestTable";
import { useCrmStore } from "@/lib/client-store";
import { users } from "@/lib/mock-data";
import { requestStatuses, statusLabels } from "@/lib/workflow";

export default function RequestsPage() {
  const { requests, tasks, createRequest } = useCrmStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [form, setForm] = useState({ title: "", customerName: "", region: "", workType: "", submissionDeadlineAt: "", ownerUserId: "u-denis", sourceType: "" });

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const matchesQuery = `${request.title} ${request.customerName} ${request.region}`.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = status === "all" || request.currentStatus === status;
      return matchesQuery && matchesStatus;
    });
  }, [requests, query, status]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.title || !form.customerName || !form.region || !form.workType || !form.ownerUserId || !form.sourceType) return;
    createRequest(form);
    setForm({ title: "", customerName: "", region: "", workType: "", submissionDeadlineAt: "", ownerUserId: "u-denis", sourceType: "" });
  }

  return (
    <>
      <header className="pageHeader">
        <div>
          <h1>Заявки</h1>
          <p>Реестр тендеров и входящих коммерческих обращений.</p>
        </div>
      </header>

      <form className="card detailGrid" onSubmit={onSubmit}>
        <input className="input" placeholder="Наименование" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className="input" placeholder="Заказчик" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
        <input className="input" placeholder="Регион" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
        <input className="input" placeholder="Вид работ" value={form.workType} onChange={(e) => setForm({ ...form, workType: e.target.value })} />
        <input className="input" type="datetime-local" value={form.submissionDeadlineAt} onChange={(e) => setForm({ ...form, submissionDeadlineAt: e.target.value })} />
        <select className="select" value={form.ownerUserId} onChange={(e) => setForm({ ...form, ownerUserId: e.target.value })}>
          {users.map((user) => <option key={user.id} value={user.id}>{user.fullName}</option>)}
        </select>
        <input className="input" placeholder="Источник" value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value })} />
        <button className="button" type="submit">Создать заявку</button>
      </form>

      <div className="filterBar">
        <input className="input" placeholder="Поиск по заявке, заказчику или региону" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">Все статусы</option>
          {requestStatuses.map((requestStatus) => <option value={requestStatus} key={requestStatus}>{statusLabels[requestStatus]}</option>)}
        </select>
      </div>

      <RequestTable requests={filteredRequests} tasks={tasks} />
    </>
  );
}
