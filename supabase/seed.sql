-- Draft seed data for MVP. Use only test / structural data.

insert into directory_items (directory_type, code, name, sort_order) values
('request_status', 'new', 'Новая заявка', 10),
('request_status', 'participation_decision', 'На решении об участии', 20),
('request_status', 'not_participating', 'Не участвуем', 30),
('request_status', 'participation_approved', 'Участие согласовано', 40),
('request_status', 'appeal_and_folder', 'Заведение обращения и папки', 50),
('request_status', 'materials_preparation', 'Подготовка материалов', 60),
('request_status', 'materials_received', 'Материалы получены', 70),
('request_status', 'internal_approval', 'Внутреннее согласование', 80),
('request_status', 'costs_approved', 'Затраты утверждены', 90),
('request_status', 'offer_preparation', 'КП в подготовке', 100),
('request_status', 'owner_approval', 'КП на согласовании у МЛ', 110),
('request_status', 'ready_to_submit', 'КП готово к подаче', 120),
('request_status', 'submitted', 'КП подано / предложение направлено', 130),
('request_status', 'feedback_waiting', 'Ожидание обратной связи', 140),
('request_status', 'won', 'Договор', 150),
('request_status', 'lost', 'Проиграли', 160),
('request_status', 'withdrawn_after_start', 'Отказались после запуска подготовки', 170),
('request_status', 'missed_deadline', 'Не успели податься', 180),
('request_status', 'canceled_or_paused', 'Тендер отменён / заморожен', 190)
on conflict (directory_type, code) do nothing;

insert into directory_items (directory_type, code, name, sort_order) values
('task_type', 'participation_decision', 'Согласовать участие с ГД', 10),
('task_type', 'create_appeal', 'Завести обращение', 20),
('task_type', 'create_folder', 'Создать рабочую папку', 30),
('task_type', 'prepare_costs', 'Подготовить затраты', 40),
('task_type', 'check_costs', 'Проверить и принять затраты', 50),
('task_type', 'contract_review', 'Проанализировать договор', 60),
('task_type', 'prepare_protocol', 'Подготовить протокол разногласий', 70),
('task_type', 'approve_protocol_lawyers', 'Согласовать протокол с юристами', 80),
('task_type', 'approve_protocol_gd', 'Согласовать протокол с ГД', 90),
('task_type', 'collect_documents', 'Собрать комплект документов', 100),
('task_type', 'prepare_offer', 'Подготовить КП', 110),
('task_type', 'owner_approval', 'Согласовать КП с МЛ', 120),
('task_type', 'submit_offer', 'Подать КП', 130),
('task_type', 'request_feedback', 'Запросить обратную связь', 140),
('task_type', 'record_result', 'Зафиксировать результат', 150)
on conflict (directory_type, code) do nothing;

insert into directory_items (directory_type, code, name, sort_order) values
('non_participation_reason', 'not_our_scope', 'Не наш предмет', 10),
('non_participation_reason', 'no_resources', 'Нет ресурсов', 20),
('non_participation_reason', 'short_deadline', 'Короткий срок', 30),
('non_participation_reason', 'other_region', 'Другой регион', 40),
('non_participation_reason', 'bad_contract', 'Невыгодный договор', 50),
('non_participation_reason', 'no_contract_draft', 'Нет проекта договора', 60),
('non_participation_reason', 'no_inputs', 'Нет исходных данных', 70),
('non_participation_reason', 'non_competitive_price', 'Неконкурентная цена', 80),
('non_participation_reason', 'construction_required', 'Требуется СМР', 90),
('non_participation_reason', 'in_person_required', 'Требуется личное присутствие', 100),
('non_participation_reason', 'no_customer_contact', 'Нет контакта с заказчиком', 110),
('non_participation_reason', 'not_strategic', 'Стратегически неинтересно', 120),
('non_participation_reason', 'other', 'Прочее', 130)
on conflict (directory_type, code) do nothing;
