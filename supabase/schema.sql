-- Initial logical schema for UDS Tender CRM MVP.
-- This file is a draft for implementation and may be adjusted during development.

create table if not exists users_profile (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text unique,
  role text not null default 'user',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists external_participants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  comment text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists directory_items (
  id uuid primary key default gen_random_uuid(),
  directory_type text not null,
  code text not null,
  name text not null,
  sort_order int not null default 100,
  is_active boolean not null default true,
  comment text,
  unique(directory_type, code)
);

create table if not exists requests (
  id uuid primary key default gen_random_uuid(),
  internal_number text,
  title text not null,
  customer_name text,
  region text,
  source_type text,
  source_url text,
  request_type text,
  work_type text,
  submission_deadline_at timestamptz,
  deadline_comment text,
  current_status text not null default 'new',
  participation_decision text,
  participation_decision_requested_at timestamptz,
  participation_decision_received_at timestamptz,
  non_participation_reason text,
  non_participation_comment text,
  owner_user_id uuid references users_profile(id),
  next_action_text text,
  next_action_due_at timestamptz,
  next_action_owner_id uuid references users_profile(id),
  appeal_number text,
  working_folder_url text,
  folder_created_at timestamptz,
  cost_amount numeric(14,2),
  offer_amount numeric(14,2),
  planned_margin_percent numeric(6,2),
  result_status text,
  result_received_at timestamptz,
  loss_reason text,
  winner_price numeric(14,2),
  our_price numeric(14,2),
  result_comment text,
  created_by uuid references users_profile(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists request_tasks (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  title text not null,
  task_type text not null,
  status text not null default 'new',
  created_by uuid references users_profile(id),
  assignee_user_id uuid references users_profile(id),
  assignee_external_id uuid references external_participants(id),
  planned_due_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  accepted_at timestamptz,
  returned_count int not null default 0,
  result_text text,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists status_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references users_profile(id),
  changed_at timestamptz not null default now(),
  comment text
);

create table if not exists request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  task_id uuid references request_tasks(id) on delete set null,
  event_type text not null,
  actor_user_id uuid references users_profile(id),
  actor_external_id uuid references external_participants(id),
  old_value text,
  new_value text,
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists file_links (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  link_type text not null,
  title text not null,
  url text not null,
  comment text,
  created_by uuid references users_profile(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_requests_status on requests(current_status);
create index if not exists idx_requests_deadline on requests(submission_deadline_at);
create index if not exists idx_tasks_request_id on request_tasks(request_id);
create index if not exists idx_tasks_due on request_tasks(planned_due_at);
create index if not exists idx_status_history_request on status_history(request_id);
create index if not exists idx_events_request on request_events(request_id);
