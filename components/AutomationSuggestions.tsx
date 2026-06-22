"use client";

import Link from "next/link";
import { useState } from "react";
import { getRequestDetailsHref } from "@/lib/request-links";
import type { AutomationSuggestion } from "@/lib/process-automation";
import type { Request } from "@/lib/types";

const priorityLabels: Record<AutomationSuggestion["priority"], string> = {
  high: "Высокий",
  medium: "Средний",
  low: "Низкий"
};

type Props = {
  suggestions: AutomationSuggestion[];
  requests: Request[];
  onApply?: (suggestionId: string) => void;
  showRequestLink?: boolean;
};

export function AutomationSuggestions({ suggestions, requests, onApply, showRequestLink = true }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const requestById = new Map(requests.map((request) => [request.id, request]));

  function applySuggestion(suggestion: AutomationSuggestion) {
    if (!suggestion.action || !onApply) return;
    onApply(suggestion.id);
    setMessage("Действие выполнено: задача создана, событие записано в журнал.");
  }

  if (suggestions.length === 0) {
    return <p className="muted">Нет предложений по текущим данным.</p>;
  }

  return (
    <div className="sectionStack">
      {message && <div className="alert" role="status">{message}</div>}
      <div className="automationList">
        {suggestions.map((suggestion) => {
          const request = requestById.get(suggestion.requestId);
          return (
            <article className="automationItem" key={suggestion.id}>
              <div>
                <div className="automationTitle">{suggestion.title}</div>
                {showRequestLink && request && <Link href={getRequestDetailsHref(request.id)} className="tableLink">{request.internalNumber} · {request.title}</Link>}
                <div className="small muted">{suggestion.reason}</div>
                <span className={`priority priority-${suggestion.priority}`}>Приоритет: {priorityLabels[suggestion.priority]}</span>
              </div>
              {suggestion.action && suggestion.actionLabel && onApply && (
                <button className="button secondary" type="button" onClick={() => applySuggestion(suggestion)}>{suggestion.actionLabel}</button>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
