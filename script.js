-- BETHACK - Sync automatico diario en Supabase
-- Corre esto en Supabase > SQL Editor, en la compu.
-- No compartas este archivo con nadie, tiene un lugar para tu secreto.
--
-- PASO 1: Activa las extensiones (solo la primera vez)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- PASO 2: Guarda el secreto en Vault (solo la primera vez)
-- Reemplaza TU_SECRETO_AQUI por tu BETHACK_SYNC_SECRET,
-- el mismo que usaste en el Test y que si funciono.
-- No pongas la llave de Odds aqui, ni la llave anon.
select vault.create_secret('https://qlmifrawzbwwaguxwrbw.supabase.co', 'bethack_project_url');
select vault.create_secret('TU_SECRETO_AQUI', 'bethack_sync_secret');

-- PASO 3: Trabajos diarios, 8:00 AM hora de Puerto Rico = 12:00 UTC
-- Cada liga gasta 3 creditos. 4 ligas = 12 creditos al dia.

-- NBA, todos los dias 8:00 AM AST
select cron.schedule(
  'bethack-sync-nba-daily',
  '0 12 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'bethack_project_url') || '/functions/v1/sync-odds',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-bethack-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'bethack_sync_secret')),
    body := '{"sportKey": "basketball_nba", "leagueSlug": "nba"}'::jsonb
  );
  $$
);

-- Premier League, todos los dias 8:05 AM AST
select cron.schedule(
  'bethack-sync-epl-daily',
  '5 12 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'bethack_project_url') || '/functions/v1/sync-odds',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-bethack-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'bethack_sync_secret')),
    body := '{"sportKey": "soccer_epl", "leagueSlug": "premier-league"}'::jsonb
  );
  $$
);

-- La Liga, todos los dias 8:10 AM AST
select cron.schedule(
  'bethack-sync-laliga-daily',
  '10 12 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'bethack_project_url') || '/functions/v1/sync-odds',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-bethack-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'bethack_sync_secret')),
    body := '{"sportKey": "soccer_spain_la_liga", "leagueSlug": "la-liga"}'::jsonb
  );
  $$
);

-- Liga MX, todos los dias 8:15 AM AST
select cron.schedule(
  'bethack-sync-ligamx-daily',
  '15 12 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'bethack_project_url') || '/functions/v1/sync-odds',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-bethack-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'bethack_sync_secret')),
    body := '{"sportKey": "soccer_mexico_ligamx", "leagueSlug": "liga-mx"}'::jsonb
  );
  $$
);

-- Para ver que trabajos quedaron:
-- select jobname, schedule from cron.job;
-- Para ver si corrieron bien:
-- select * from cron.job_run_details order by start_time desc limit 10;
-- Para borrar uno:
-- select cron.unschedule('bethack-sync-nba-daily');
