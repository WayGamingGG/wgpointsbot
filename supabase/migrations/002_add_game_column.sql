alter table matches add column if not exists game text not null default 'lol' check (game in ('lol', 'val'));
create index if not exists idx_matches_game on matches(game);
