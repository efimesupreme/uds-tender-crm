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

- Денис — admin;
- Катя — user.

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

В MVP файлы не загружаются в систему. Хранятся только ссылки.

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
