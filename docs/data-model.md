# Структура данных

Документ описывает логическую модель данных для MVP. Названия таблиц даны в английском стиле, чтобы их было удобно использовать в коде.

## 1. users

Пользователи системы.

Поля:

- id;
- full_name;
- email;
- role: admin / user;
- is_active;
- created_at;
- updated_at.

Стартовые пользователи:

- Тагиев — admin;
- Безрукова — user.

## 2. external_participants

Внешние участники процесса без входа в систему.

Поля:

- id;
- name;
- type: general_director / owner / lawyer / project_manager / gip / customer / other;
- comment;
- is_active.

Примеры: ГД, МЛ, юристы, РП/ГИП, заказчик.

## 3. requests

Основная таблица заявок.

Поля:

- id;
- internal_number;
- title;
- customer_name;
- region;
- source_type;
- source_url;
- request_type;
- work_type;
- submission_deadline_at;
- current_status;
- participation_decision;
- participation_decision_requested_at;
- participation_decision_received_at;
- non_participation_reason;
- non_participation_comment;
- owner_user_id;
- next_action_text;
- next_action_due_at;
- next_action_owner_id;
- appeal_number;
- working_folder_url;
- folder_created_at;
- cost_amount;
- offer_amount;
- planned_margin_percent;
- result_status;
- result_received_at;
- loss_reason;
- winner_price;
- our_price;
- result_comment;
- created_by;
- created_at;
- updated_at;
- closed_at.

## 4. tasks

Задачи по заявке.

Поля:

- id;
- request_id;
- title;
- task_type;
- status: new / in_progress / waiting / completed / returned / canceled;
- created_by;
- assignee_user_id;
- assignee_external_id;
- planned_due_at;
- started_at;
- completed_at;
- accepted_at;
- returned_count;
- result_text;
- comment;
- created_at;
- updated_at.

Правило: исполнитель может быть либо пользователем системы, либо внешним участником.

## 5. status_history

История переходов статусов заявки.

Поля:

- id;
- request_id;
- from_status;
- to_status;
- changed_by;
- changed_at;
- comment.

Используется для расчёта длительности этапов.

## 6. events

Журнал событий по заявке.

Поля:

- id;
- request_id;
- task_id;
- event_type;
- actor_user_id;
- actor_external_id;
- old_value;
- new_value;
- comment;
- created_at.

Типы событий:

- request_created;
- status_changed;
- task_created;
- task_started;
- task_completed;
- task_returned;
- task_accepted;
- deadline_changed;
- file_link_added;
- participation_decision_recorded;
- result_recorded;
- appeal_and_folder_updated;
- working_folder_ready;
- comment_added.

## 7. file_links

Ссылки на рабочие материалы.

Поля:

- id;
- request_id;
- link_type: working_folder / tender_docs / contract_draft / costs / disagreement_protocol / commercial_offer / submission_confirmation / feedback / other;
- title;
- url;
- comment;
- created_by;
- created_at;
- updated_at.

В MVP файлы не загружаются в систему. Хранятся только ссылки. Для рабочей папки обращения обязательной является только корневая ссылка `working_folder_url` в заявке. Отдельные ссылки на подпапки затрат, КП, договора, протокола и прочих материалов не хранятся как обязательные поля, если они выводятся из типовой структуры папки.

## 8. directories

Справочники можно реализовать как отдельные таблицы или как одну универсальную таблицу.

Вариант универсальной таблицы:

- id;
- directory_type;
- code;
- name;
- sort_order;
- is_active;
- comment.

Типы справочников:

- request_status;
- task_type;
- task_status;
- non_participation_reason;
- loss_reason;
- work_type;
- source_type;
- request_type;
- submission_method;
- participant_type.

## 9. stage_durations

Можно не хранить отдельной таблицей, а считать представлением/view на основе status_history и tasks.

Метрики:

- duration_from_created_to_decision;
- duration_from_decision_to_appeal_created;
- duration_cost_preparation;
- duration_contract_review;
- duration_protocol_preparation;
- duration_protocol_approval;
- duration_documents_collection;
- duration_offer_preparation;
- duration_owner_approval;
- duration_submission_to_feedback.

## 10. Принцип аудита

Все ключевые действия должны создавать запись в events. Если действие меняет общий статус заявки, дополнительно создаётся запись в status_history.

### Поля закрытия и результата заявки

В `requests` используются поля результата и закрытия:

- `closed_at` — дата закрытия заявки;
- `closed_by` — пользователь, который зафиксировал закрытие;
- `closure_reason` — причина закрытия для финального статуса;
- `closure_comment` — обязательный содержательный комментарий закрытия;
- `result_received_at` — дата получения результата от заказчика или дата фиксации результата;
- `loss_reason` — причина проигрыша для статуса `lost`;
- `winner_price` — цена победителя, если известна;
- `our_price` — наша цена, зафиксированная при закрытии;
- `result_status` и `result_comment` — краткое состояние результата и комментарий для совместимости с существующими экранами.

Финальные статусы не должны устанавливаться без обязательных полей закрытия. История изменения статуса хранится в `status_history`, а бизнес-события закрытия — в `events`.

## Рабочие блоки заявки

В объекте `Request` добавлены структурированные группы плоских полей с префиксами:

- `participation...` — направление на решение ГД, получение решения, решение участия, комментарий и фиксирующий сотрудник.
- `costs...` — ответственный, постановка задачи, плановый срок, получение/утверждение затрат, статус, сумма затрат, возвраты и риски. Сумма затрат хранится в общем поле `costAmount`, плановая маржинальность — в `plannedMarginPercent`.
- `contract...` и `protocol...` — наличие проекта договора, анализ юристами, риски, необходимость и согласование протокола разногласий.
- `documents...` — статус комплекта документов, ответственный, недостающие документы, дата готовности и комментарий.
- `offer...` и `submission...` — передача затрат Безруковой, статус КП, сумма КП, согласование МЛ, возвраты КП, способ/автор/дата подачи. Сумма КП хранится в общем поле `offerAmount`.
- `feedback...` — статус обратной связи, дата получения, комментарий заказчика. Следующее касание и следующий шаг синхронизируются с `nextActionDueAt` и `nextActionText`.

## Демо-пользователи и текущий пользователь

В статическом демо-режиме системными пользователями считаются только Тагиев (`u-denis`) и Безрукова (`u-katya`). Тагиев — руководитель процесса / администратор процесса. Безрукова — коммерческий директор, ответственная за КП, документы, согласование с МЛ и подачу.

ГД, МЛ, юристы, РП/ГИП и заказчик остаются внешними участниками (`externalParticipants`) без входа в систему. Они могут фигурировать в задачах, истории и событиях как внешние роли, но не выбираются в переключателе текущего пользователя.

Клиентский store хранит `currentUserId` в `localStorage` рядом с demo-store. По умолчанию используется `u-denis`. После гидратации интерфейс показывает выбранного пользователя, а до чтения `localStorage` выводит нейтральное состояние загрузки, чтобы не создавать hydration mismatch. Все пользовательские действия передают actor из `currentUserId`.

## Автоматические предложения процесса

Предложения автоматизации не сохраняются отдельной сущностью в `localStorage`. Они рассчитываются на лету функцией `getAutomationSuggestions(request, tasks, events, now)` из текущих данных заявки, списка задач, журнала событий и текущей даты.

Расчётная структура предложения содержит:

- `id` — стабильный идентификатор правила для заявки;
- `requestId` — заявка, к которой относится предложение;
- `title` — что нужно сделать;
- `reason` — почему система предлагает действие;
- `action` и `actionLabel` — автоматическое действие и подпись кнопки, если действие доступно;
- `audience` — Тагиев, Безрукова или система;
- `priority` — высокий, средний или низкий приоритет.

После применения предложения сохраняется только результат: новая задача и события журнала. Само предложение исчезает при следующем пересчёте, если активная задача нужного типа уже существует.

## Поля для проверок переходов

Проверки переходов используют существующие поля заявки и задачи:

- базовые данные: `title`, `customerName`, `workType`, `sourceType`, `ownerUserId`, `submissionDeadlineAt`;
- решение об участии: `participationDecision`, `participationDecisionReceivedAt`, `participationDecisionComment`;
- обращение и папка: `appealNumber`, `workingFolderUrl`;
- задачи запуска работ: задачи типов `approve_costs`, `contract_review`, `collect_documents`;
- затраты: `costsStatus`, `costAmount`, `costsRiskComment`, `plannedMarginPercent`;
- КП: `offerStatus`, `offerAmount`, `offerPreparedAt`, `offerComment`, `offerMlApprovedAt`;
- документы и подача: `documentsStatus`, `submissionMethod`, `submissionSubmittedBy`, `submissionSubmittedAt`;
- обратная связь: `nextActionText`, `nextActionDueAt`.

Незаполненные обязательные поля возвращаются как ошибки и не дают изменить статус. Желательные поля возвращаются как предупреждения.

## Задачи: ответственный, статусы и факт выполнения

У задач используется единая модель статусов: `new` («Новая»), `in_progress` («В работе»), `completed` («Выполнено»). Поле `assigneeUserId` хранит ответственного пользователя; для назначения задач в демо-процессе допустимы Тагиев (`u-denis`) и Безрукова (`u-katya`), а Админ (`u-admin`) используется для общего просмотра и проверки процесса. Ответственный по умолчанию вычисляется по типу задачи, но может быть изменён вручную через select; изменение сохраняется в `localStorage` и пишет событие `task_assignee_changed`.

Для факта выполнения используются `startedAt`, `completedAt` и `actualDurationMinutes`. Если задача была начата, длительность считается от `startedAt`; иначе — от `createdAt`, а при отсутствии даты остаётся `null`, чтобы метрики не ломались.

## Уточнение модели задач

В задачах используются только статусы `new` («Новая»), `in_progress` («В работе») и `completed` («Выполнено»). `responsibleUserId` в интерфейсе соответствует системному ответственному задачи и хранится в текущей клиентской модели как `assigneeUserId`; допустимые ответственные — Тагиев (`u-denis`) и Безрукова (`u-katya`). Для фактического исполнителя добавлено свободное текстовое поле `executorName`: это не справочник и не select, пользователь вручную вводит любое имя или роль, а изменение пишет событие `task_executor_changed`.

Технические поля сроков и метрик (`startedAt`, `completedAt`, `actualDurationMinutes`, счётчики возвратов) могут продолжать храниться и использоваться для аналитики и журнала. В основном списке «Мои задачи» они не выводятся как отдельные колонки «Факт», «Длительность», «Просрочка» или «Возвраты».

## Демо-пользователи и видимость задач

Демо-режим содержит три пользователя: Тагиев (`u-denis`, руководитель процесса), Безрукова (`u-katya`, КП, документы, подача) и Админ (`u-admin`, администратор системы). Id Тагиева и Безруковой оставлены прежними, чтобы старые сохранённые данные в `localStorage` продолжали открываться.

Видимость задач определяется только системным ответственным задачи: поле `responsibleUserId` в интерфейсе соответствует `assigneeUserId` в текущей клиентской модели. Тагиев видит задачи с `assigneeUserId = u-denis`, Безрукова — с `assigneeUserId = u-katya`, Админ — все задачи. Свободное поле `executorName` хранит фактического исполнителя текстом, не является справочником и не влияет на видимость задач.

## Планы КП и метрики дашборда

Планы КП хранятся в клиентском store `localStorage` как структура `kpOfferPlans`: год → квартал (`Q1`–`Q4`) → плановая сумма КП. Минимально поддержан 2026 год; интерфейс также даёт значения для 2027 и 2028 годов. Это план по сумме выданных КП, а не план выручки.

Факт КП считается по заявкам КП-контура и сумме `offerAmount`. Квартал факта определяется по дате подготовки КП (`offerPreparedAt`), затем по дате подачи (`submissionSubmittedAt`), затем по дате создания заявки (`createdAt`). Если сумма КП не заполнена, она считается как 0.

Сумма обращений на дашборде не считается: цена появляется только на стадии КП, поэтому управленческие денежные метрики строятся вокруг `Сумма КП`.

Текущая конверсия в договор = количество заявок со статусом `Договор` / количество заявок в КП-контуре. Если КП-контур пуст, показывается 0%. Историческая конверсия хранится в коде как справочная константа 12% и используется только как ориентир.

## Рабочая ссылка заявки

Для компактного блока **«Рабочие ссылки»** используется существующее поле заявки `workingFolderUrl`. Новое отдельное поле не добавлялось: прежняя ссылка на корневую рабочую папку теперь отображается в интерфейсе как **«Рабочая ссылка»**.

Поле хранит URL рабочей папки или другой рабочей ссылки заявки, валидируется на клиенте как `url`, сохраняется в `localStorage` вместе с заявкой и обновляется через существующую операцию обновления обращения/рабочей папки, чтобы журнал событий и процессные проверки продолжали работать без изменения модели workflow.
