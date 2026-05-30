-- everteam — Butterbase Postgres schema (Phase 0.3 / Phase 2)
-- The local Postgres provider + the eve edge function read/write these tables.

create table if not exists carrier_profile (
  id            int primary key default 1,
  name          text not null,
  base          text not null,
  equipment     text not null,
  fleet         text not null,
  role          text not null,
  fuel_per_mi   numeric not null default 0.55,
  updated_at    timestamptz not null default now()
);

create table if not exists memories (
  id          text primary key,
  category    text not null check (category in ('Profile','Rules','Past Loads','Recommendations')),
  text        text not null,
  source      text not null,
  locked      boolean not null default false,
  rule        jsonb,                     -- structured rule, e.g. {"type":"min_rate","value":2.0}
  created_at  timestamptz not null default now()
);
create index if not exists memories_category_idx on memories (category);

create table if not exists loads (
  id            text primary key,
  origin        text not null,
  origin_lat    numeric not null,
  origin_lng    numeric not null,
  dest          text not null,
  dest_lat      numeric not null,
  dest_lng      numeric not null,
  miles         int not null,
  deadhead_mi   int not null,
  equipment     text not null default 'Reefer',
  broker        text not null,
  rate_total    numeric not null,
  est_return_day text not null,
  truck         text,
  commodity     text
);

create table if not exists hunt_decisions (
  id          bigserial primary key,
  load_id     text not null,
  chosen      boolean not null,
  reason      text,
  created_at  timestamptz not null default now()
);

-- Seed the carrier (Valle Verde Trucking).
insert into carrier_profile (id, name, base, equipment, fleet, role)
values (1, 'Valle Verde Trucking', 'Fresno, CA', 'Reefer', '4 Freightliner Cascadia sleepers', 'owner-operator')
on conflict (id) do nothing;
