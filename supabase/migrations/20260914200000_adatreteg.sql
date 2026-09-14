-- Gyűrűsi Ménes weboldal — adatréteg (Supabase)
-- Futtatás: Supabase Dashboard → SQL Editor → az egész fájl beillesztése → Run. Többször is lefuttatható (idempotens).
--
-- Az adatokat KIZÁRÓLAG a weboldal szerveroldali kódja éri el a service_role kulccsal (SUPABASE_SERVICE_ROLE_KEY).
-- Minden táblán be van kapcsolva a sorszintű védelem (RLS), szabály nélkül: a nyilvános (anon) kulcs semmihez nem fér hozzá.
-- A mentések ütközésbiztosak: a `version` oszlop feltételes frissítéssel (version = a beolvasott érték) véd az elveszett írás ellen.

-- ---------------------------------------------------------------------------
-- Tartalom: egyetlen dokumentum (id = 'site') — főoldal, aloldalak, események, útvonalak, beszámolók, képek, jogi szövegek.
create table if not exists public.site_content (
  id         text primary key,
  data       jsonb not null,
  version    bigint not null default 1,
  updated_at timestamptz not null default now()
);

-- Jelentkezések (igényfelmérés) — soronként; az esemény vége után 30 nappal a napi karbantartás törli.
create table if not exists public.registrations (
  id          text primary key,
  event_id    text not null,
  name        text not null,
  phone       text not null,
  email       text,
  count       integer not null check (count > 0),
  note        text,
  received_at timestamptz not null default now()
);
create index if not exists registrations_event_id_idx on public.registrations (event_id);
create index if not exists registrations_received_at_idx on public.registrations (received_at desc);

-- Kapcsolati üzenetek — soronként; 365 nap után a napi karbantartás törli.
create table if not exists public.messages (
  id          text primary key,
  name        text not null,
  email       text not null,
  phone       text,
  message     text not null,
  page        text,
  received_at timestamptz not null default now(),
  read        boolean not null default false
);
create index if not exists messages_received_at_idx on public.messages (received_at desc);

-- Kis állapottár: a sebességkorlát sója, a karbantartás utolsó futása, a Google place ID és a napi hívásszámláló.
create table if not exists public.kv (
  key        text primary key,
  value      jsonb not null,
  version    bigint not null default 1,
  updated_at timestamptz not null default now()
);

-- Sebességkorlát az űrlapokhoz és a belépéshez. A kulcsban nincs IP-cím, csak annak sózott hash-e; a lejártakat a karbantartás törli.
create table if not exists public.rate_limits (
  key     text primary key,
  hits    jsonb not null default '[]'::jsonb,
  exp     timestamptz not null,
  version bigint not null default 1
);
create index if not exists rate_limits_exp_idx on public.rate_limits (exp);

-- Napi mentések (YYYY-MM-DD.json): tartalom + jelentkezések + üzenetek; az utolsó 30 marad meg.
create table if not exists public.backups (
  name       text primary key check (name ~ '^\d{4}-\d{2}-\d{2}\.json$'),
  data       jsonb not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Hozzáférés: csak a service_role.
alter table public.site_content  enable row level security;
alter table public.registrations enable row level security;
alter table public.messages      enable row level security;
alter table public.kv            enable row level security;
alter table public.rate_limits   enable row level security;
alter table public.backups       enable row level security;

revoke all on table public.site_content, public.registrations, public.messages, public.kv, public.rate_limits, public.backups from anon, authenticated;
grant select, insert, update, delete on table public.site_content, public.registrations, public.messages, public.kv, public.rate_limits, public.backups to service_role;

-- ---------------------------------------------------------------------------
-- Fájltár (Storage): mindkét tároló privát, a weboldal a /files/<kulcs> útvonalon szolgálja ki a fájlokat.
--   files          — feltöltött képek (WebP) és PDF-beszámolók, legfeljebb 25 MB
--   upload-chunks  — a darabolt PDF-feltöltés ideiglenes darabjai (legfeljebb 4 MB); 24 óra után a karbantartás törli
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('files', 'files', false, 26214400, array['image/webp', 'image/jpeg', 'image/png', 'application/pdf']),
  ('upload-chunks', 'upload-chunks', false, 4194304, array['application/octet-stream', 'application/json'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
