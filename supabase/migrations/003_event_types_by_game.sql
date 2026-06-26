-- Migration 003: Add game column to event_types and seed per-game event types

-- 1. Add game column (existing rows get default 'lol')
alter table event_types
  add column if not exists game text not null default 'lol'
  check (game in ('lol', 'val'));

-- 2. Replace unique constraint on codigo alone with (codigo, game)
alter table event_types drop constraint if exists event_types_codigo_key;
alter table event_types add constraint event_types_codigo_game_key unique (codigo, game);

-- 3. Deactivate all player-submitted event types (staff events TREINO/FALTA_TREINO are preserved)
update event_types set ativo = false where codigo not in ('TREINO', 'FALTA_TREINO');

-- 4. Insert val versions of staff events, copying pontos from the lol version
insert into event_types (codigo, pontos, ativo, game)
select codigo, pontos, true, 'val'
from event_types
where codigo in ('TREINO', 'FALTA_TREINO') and game = 'lol'
on conflict (codigo, game) do nothing;

-- 5. Seed LoL event types
insert into event_types (codigo, pontos, ativo, game) values
  ('WIN5',                     10,  true, 'lol'),
  ('ZERO_DEATH',               10,  true, 'lol'),
  ('ZERO_DEATH_SCRIM',         20,  true, 'lol'),
  ('RANK_UP',                  25,  true, 'lol'),
  ('PENTAKILL',                20,  true, 'lol'),
  ('PENTAKILL_SCRIM',          40,  true, 'lol'),
  ('QUADRAKILL',               10,  true, 'lol'),
  ('QUADRAKILL_SCRIM',         20,  true, 'lol'),
  ('S_PLUS',                    3,  true, 'lol'),
  ('OBJ_JUNGLE',               20,  true, 'lol'),
  ('CS_250',                   10,  true, 'lol'),
  ('OBJ_MENSAL',               15,  true, 'lol'),
  ('KILL_ASSIST_SUPP',         10,  true, 'lol'),
  ('KILL_ASSIST_SUPP_SCRIM',   20,  true, 'lol'),
  ('KILL_ASSIST_JUNGLE',       10,  true, 'lol'),
  ('KILL_ASSIST_JUNGLE_SCRIM', 20,  true, 'lol'),
  ('TOP_DAMAGE',               10,  true, 'lol'),
  ('TOP_DAMAGE_SCRIM',         20,  true, 'lol'),
  ('HONORS_4',                 10,  true, 'lol'),
  ('LOSE5',                   -10,  true, 'lol'),
  ('DEATH_10',                -10,  true, 'lol'),
  ('RANK_DOWN',               -25,  true, 'lol'),
  ('OBJ_MENSAL_FALHOU',       -15,  true, 'lol'),
  ('OBJ_JUNGLE_0_SCRIM',      -20,  true, 'lol'),
  ('OBJ_JUNGLE_0',            -10,  true, 'lol')
on conflict (codigo, game) do update set pontos = excluded.pontos, ativo = true;

-- 6. Seed Valorant event types
insert into event_types (codigo, pontos, ativo, game) values
  ('WIN5',              10,  true, 'val'),
  ('MVP',               10,  true, 'val'),
  ('RANK_UP',           20,  true, 'val'),
  ('DIV_UP',            10,  true, 'val'),
  ('ACE',               15,  true, 'val'),
  ('OBJ_MENSAL',        30,  true, 'val'),
  ('ASSIST_10',         15,  true, 'val'),
  ('BOOST_SERVER',      30,  true, 'val'),
  ('MVP_SCRIM',         20,  true, 'val'),
  ('ACE_SCRIM',         30,  true, 'val'),
  ('ASSIST_10_SCRIM',   30,  true, 'val'),
  ('LOSE5',            -10,  true, 'val'),
  ('DIV_DOWN',         -10,  true, 'val'),
  ('RANK_DOWN',        -20,  true, 'val'),
  ('OBJ_MENSAL_FALHOU',-20,  true, 'val')
on conflict (codigo, game) do update set pontos = excluded.pontos, ativo = true;
