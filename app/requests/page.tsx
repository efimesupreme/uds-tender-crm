"use client";

import { useMemo, useState } from "react";
import { RequestTable } from "@/components/RequestTable";
import { requests, tasks } from "@/lib/mock-data";
import { requestStatuses, statusLabels } from "@/lib/workflow";

export default function RequestsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const matchesQuery = `${request.title} ${request.customerName} ${request.region}`.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = status === "all" || request.currentStatus === status;
      return matchesQuery && matchesStatus;
    });
  }, [query, status]);

  return (
    <>
      <header className="pageHeader">
        <div>
          <h1>Заявки</h1>
          <p>Реестр тендеров и входящих коммерческих обращений.</p>
        </div>
        <button className="button">Создать заявку</button>
      </header>

      <div className="filterBar">
        <input
          className="input"
          placeholder="Поиск по заявке, заказчику или региону"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">Все статусы</option>
          {requestStatuses.map((requestStatus) => (
            <option value={requestStatus} key={requestStatus}>{statusLabels[requestStatus]}</option>
          ))}
        </select>
      </div>

      <RequestTable requests={filteredRequests} tasks={tasks} />
    </>
  );
}
