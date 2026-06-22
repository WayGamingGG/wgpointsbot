create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  discord_id text unique not null,
  nome text not null,
  criado_em timestamptz default now()
);

create table if not exists event_types (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  pontos int not null,
  ativo bool default true
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  screenshot_url text,
  registado_por text not null,
  status text not null check (status in ('pendente','aprovado','rejeitado')) default 'pendente',
  criado_em timestamptz default now()
);

create index if not exists idx_matches_player_id on matches(player_id);
create index if not exists idx_matches_status on matches(status);
create index if not exists idx_matches_criado_em on matches(criado_em);

create table if not exists point_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  event_type_id uuid not null references event_types(id),
  pontos int not null,
  criado_em timestamptz default now()
);

insert into event_types (codigo, pontos) values
  ('MVP', 15),
  ('ACE', 10)
on conflict (codigo) do nothing;
