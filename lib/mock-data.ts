import type { DirectoryItem, ExternalParticipant, FileLink, Request, RequestEvent, RequestTask, StatusHistoryItem, User } from "./types";

export const users: User[] = [
  { id: "u-denis", fullName: "Денис", role: "admin" },
  { id: "u-katya", fullName: "Катя", role: "user" }
];

export const externalParticipants: ExternalParticipant[] = [
  { id: "e-gd", name: "Генеральный директор", type: "general_director" },
  { id: "e-ml", name: "МЛ", type: "owner" },
  { id: "e-lawyers", name: "Юристы", type: "lawyer" },
  { id: "e-gip", name: "РП / ГИП", type: "gip" },
  { id: "e-customer", name: "Заказчик", type: "customer" }
];

export const statusLabels: Record<Request["currentStatus"], string> = {
  new: "Новая заявка",
  participation_decision: "На решении об участии",
  not_participating: "Не участвуем",
  participation_approved: "Участие согласовано",
  appeal_and_folder: "Заведение обращения и папки",
  materials_preparation: "Подготовка материалов",
  materials_received: "Материалы получены",
  internal_approval: "Внутреннее согласование",
  costs_approved: "Затраты утверждены",
  offer_preparation: "КП в подготовке",
  owner_approval: "КП на согласовании у МЛ",
  ready_to_submit: "КП готово к подаче",
  submitted: "КП подано",
  feedback_waiting: "Ожидание обратной связи",
  won: "Победили",
  lost: "Проиграли",
  withdrawn_after_start: "Отказались после запуска",
  missed_deadline: "Не успели податься",
  canceled_or_paused: "Отменено / пауза"
};

export const requests: Request[] = [
  {
    id: "r-001",
    internalNumber: "T-2026-001",
    title: "ППТ для крупного жилого квартала",
    customerName: "Тестовый девелопер",
    region: "Санкт-Петербург",
    sourceType: "Входящее обращение",
    sourceUrl: "https://example.com/tender/001",
    requestType: "Запрос КП",
    workType: "ППТ",
    submissionDeadlineAt: "2026-06-27T15:00:00+03:00",
    currentStatus: "materials_preparation",
    participationDecision: "approved",
    ownerUserId: "u-denis",
    nextActionText: "Проверить получение анализа договора от юристов",
    nextActionDueAt: "2026-06-22T12:00:00+03:00",
    nextActionOwnerId: "u-denis",
    appealNumber: "ОБР-2026-014",
    workingFolderUrl: "file://server/tenders/OBR-2026-014",
    costAmount: 3200000,
    offerAmount: 4800000,
    plannedMarginPercent: 33.3,
    resultStatus: "none",
    createdAt: "2026-06-20T10:15:00+03:00"
  },
  {
    id: "r-002",
    internalNumber: "T-2026-002",
    title: "Проект организации дорожного движения",
    customerName: "Тестовый заказчик",
    region: "Ленинградская область",
    sourceType: "Тендерная площадка",
    sourceUrl: "https://example.com/tender/002",
    requestType: "Тендер",
    workType: "ОДД",
    submissionDeadlineAt: "2026-06-24T18:00:00+03:00",
    currentStatus: "owner_approval",
    participationDecision: "approved",
    ownerUserId: "u-denis",
    nextActionText: "Дождаться согласования КП с МЛ",
    nextActionDueAt: "2026-06-21T18:00:00+03:00",
    nextActionOwnerId: "u-katya",
    appealNumber: "ОБР-2026-015",
    workingFolderUrl: "file://server/tenders/OBR-2026-015",
    costAmount: 900000,
    offerAmount: 1450000,
    plannedMarginPercent: 37.9,
    resultStatus: "none",
    createdAt: "2026-06-19T09:30:00+03:00"
  },
  {
    id: "r-003",
    internalNumber: "T-2026-003",
    title: "Изыскания и проектирование вне профиля компании",
    customerName: "Неосновной заказчик",
    region: "Москва",
    sourceType: "Тендерная площадка",
    requestType: "Тендер",
    workType: "Прочее",
    submissionDeadlineAt: "2026-06-25T12:00:00+03:00",
    currentStatus: "not_participating",
    participationDecision: "rejected",
    nonParticipationReason: "Не наш предмет",
    ownerUserId: "u-denis",
    resultStatus: "none",
    resultComment: "Отказ до запуска подготовки. Предмет работ не соответствует текущей специализации.",
    createdAt: "2026-06-18T14:20:00+03:00"
  },
  {
    id: "r-004",
    internalNumber: "T-2026-004",
    title: "Аудит транспортных решений",
    customerName: "Повторный клиент",
    region: "Санкт-Петербург",
    sourceType: "Повторный клиент",
    requestType: "Запрос КП",
    workType: "Аудит",
    submissionDeadlineAt: "2026-06-18T18:00:00+03:00",
    currentStatus: "won",
    participationDecision: "approved",
    ownerUserId: "u-denis",
    appealNumber: "ОБР-2026-010",
    workingFolderUrl: "file://server/tenders/OBR-2026-010",
    costAmount: 450000,
    offerAmount: 850000,
    plannedMarginPercent: 47.0,
    resultStatus: "won",
    resultComment: "КП принято заказчиком. Можно использовать как пример короткого цикла обработки.",
    createdAt: "2026-06-12T11:00:00+03:00"
  },
  {
    id: "r-005",
    internalNumber: "T-2026-005",
    title: "ПД по улично-дорожной сети",
    customerName: "Тестовый застройщик",
    region: "Санкт-Петербург",
    sourceType: "Рекомендация",
    requestType: "Запрос КП",
    workType: "ПД",
    submissionDeadlineAt: "2026-06-21T10:00:00+03:00",
    currentStatus: "missed_deadline",
    participationDecision: "approved",
    ownerUserId: "u-denis",
    resultStatus: "canceled",
    resultComment: "Не успели согласовать условия договора до срока подачи.",
    createdAt: "2026-06-17T16:30:00+03:00"
  }
];

export const tasks: RequestTask[] = [
  {
    id: "t-001",
    requestId: "r-001",
    title: "Подготовить затраты",
    taskType: "prepare_costs",
    status: "completed",
    createdBy: "u-denis",
    assigneeExternalId: "e-gip",
    plannedDueAt: "2026-06-21T17:00:00+03:00",
    completedAt: "2026-06-21T15:40:00+03:00",
    returnedCount: 0,
    resultText: "Затраты получены"
  },
  {
    id: "t-002",
    requestId: "r-001",
    title: "Проанализировать договор",
    taskType: "contract_review",
    status: "in_progress",
    createdBy: "u-denis",
    assigneeExternalId: "e-lawyers",
    plannedDueAt: "2026-06-22T12:00:00+03:00",
    returnedCount: 0
  },
  {
    id: "t-003",
    requestId: "r-002",
    title: "Согласовать КП с МЛ",
    taskType: "owner_approval",
    status: "waiting",
    createdBy: "u-katya",
    assigneeExternalId: "e-ml",
    plannedDueAt: "2026-06-21T18:00:00+03:00",
    returnedCount: 1,
    comment: "КП возвращалось на уточнение состава работ"
  },
  {
    id: "t-004",
    requestId: "r-002",
    title: "Подать КП",
    taskType: "submit_offer",
    status: "new",
    createdBy: "u-katya",
    assigneeUserId: "u-katya",
    plannedDueAt: "2026-06-24T17:00:00+03:00",
    returnedCount: 0
  },
  {
    id: "t-005",
    requestId: "r-005",
    title: "Согласовать протокол с ГД",
    taskType: "approve_protocol_gd",
    status: "canceled",
    createdBy: "u-denis",
    assigneeExternalId: "e-gd",
    plannedDueAt: "2026-06-20T16:00:00+03:00",
    returnedCount: 0,
    comment: "Срок подачи прошёл"
  }
];

export const statusHistory: StatusHistoryItem[] = [
  { id: "h-001", requestId: "r-001", toStatus: "new", changedBy: "u-denis", changedAt: "2026-06-20T10:15:00+03:00" },
  { id: "h-002", requestId: "r-001", fromStatus: "new", toStatus: "participation_decision", changedBy: "u-denis", changedAt: "2026-06-20T10:30:00+03:00" },
  { id: "h-003", requestId: "r-001", fromStatus: "participation_decision", toStatus: "materials_preparation", changedBy: "u-denis", changedAt: "2026-06-20T13:10:00+03:00" }
];

export const events: RequestEvent[] = [
  { id: "ev-001", requestId: "r-001", eventType: "request_created", actorUserId: "u-denis", comment: "Заявка создана", createdAt: "2026-06-20T10:15:00+03:00" },
  { id: "ev-002", requestId: "r-001", eventType: "participation_decision_recorded", actorExternalId: "e-gd", comment: "Участие согласовано", createdAt: "2026-06-20T13:10:00+03:00" },
  { id: "ev-003", requestId: "r-001", eventType: "task_created", actorUserId: "u-denis", comment: "Созданы задачи по затратам, договору и документам", createdAt: "2026-06-20T13:20:00+03:00" }
];

export const fileLinks: FileLink[] = [
  { id: "f-001", requestId: "r-001", linkType: "working_folder", title: "Рабочая папка", url: "file://server/tenders/OBR-2026-014" },
  { id: "f-002", requestId: "r-001", linkType: "costs", title: "Расчёт затрат", url: "file://server/tenders/OBR-2026-014/04_costs.xlsx" },
  { id: "f-003", requestId: "r-002", linkType: "commercial_offer", title: "КП", url: "file://server/tenders/OBR-2026-015/06_offer.pdf" }
];

export const directories: DirectoryItem[] = [
  { directoryType: "work_type", code: "ppt", name: "ППТ", sortOrder: 10 },
  { directoryType: "work_type", code: "pd", name: "ПД", sortOrder: 20 },
  { directoryType: "work_type", code: "odd", name: "ОДД", sortOrder: 30 },
  { directoryType: "work_type", code: "audit", name: "Аудит", sortOrder: 40 },
  { directoryType: "source_type", code: "tender", name: "Тендерная площадка", sortOrder: 10 },
  { directoryType: "source_type", code: "repeat", name: "Повторный клиент", sortOrder: 20 },
  { directoryType: "source_type", code: "incoming", name: "Входящее обращение", sortOrder: 30 }
];
