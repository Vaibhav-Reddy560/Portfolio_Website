-- Portfolio content schema.
--
-- Table shapes deliberately mirror the TypeScript types in src/content/*.ts so
-- the components consuming them barely change, and so the static files can keep
-- working as a fallback when the database is unreachable.

create extension if not exists "pgcrypto";

-- Keeps updated_at honest without every write having to remember to set it.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- designs --
-- Gallery pieces. image_path null means the row is still a placeholder slot,
-- which is what the site renders as the CRT "NO SIGNAL" card.
create table if not exists public.designs (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  context       text not null default '',
  kind          text not null default '',
  year          text not null default '',
  ratio         numeric not null default 0.8,
  image_path    text,
  blur_data_url text,
  alt           text,
  published     boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- --------------------------------------------------------------- projects --
-- Build projects and full case studies. `detail` carries the shape that varies
-- between them — Easy Club's pillars[], Opacitys' modules[]/providers[]/
-- engineering[] — so adding a new case-study layout needs no migration.
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  tagline       text,
  year          text,
  href          text,
  href_label    text,
  summary       text,
  thesis        text,
  stack         text[] not null default '{}',
  note          text,
  image_path    text,
  blur_data_url text,
  alt           text,
  detail        jsonb not null default '{}'::jsonb,
  featured      boolean not null default false,
  published     boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ------------------------------------------------------------- experience --
-- is_additional folds the resume's short "also involved in" list into the same
-- table rather than needing a near-duplicate one.
create table if not exists public.experience (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  org           text not null default '',
  sub           text,
  start_label   text,
  end_label     text,
  detail        text,
  tags          text[] not null default '{}',
  is_additional boolean not null default false,
  published     boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ----------------------------------------------------------- skill_groups --
create table if not exists public.skill_groups (
  id          uuid primary key default gen_random_uuid(),
  group_key   text not null unique,
  label       text not null,
  discipline  text not null default 'lead',
  items       text[] not null default '{}',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -------------------------------------------------------------- education --
create table if not exists public.education (
  id            uuid primary key default gen_random_uuid(),
  qualification text not null,
  institution   text not null default '',
  period        text,
  place         text,
  is_current    boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------- profile --
-- Exactly one row. The boolean primary key with a check constraint makes a
-- second row impossible at the database level rather than by convention.
create table if not exists public.profile (
  id             boolean primary key default true,
  first          text not null default '',
  last           text not null default '',
  eyebrow        text[] not null default '{}',
  role           text,
  location       text,
  status         text,
  lede           text,
  about          text[] not null default '{}',
  facts          jsonb not null default '[]'::jsonb,
  contact        jsonb not null default '{}'::jsonb,
  interests      text[] not null default '{}',
  portrait_path  text,
  portrait_blur  text,
  updated_at     timestamptz not null default now(),
  constraint profile_is_singleton check (id)
);

-- ----------------------------------------------------------------- triggers
do $$
declare t text;
begin
  foreach t in array array[
    'designs','projects','experience','skill_groups','education','profile'
  ] loop
    execute format(
      'drop trigger if exists touch_%1$s on public.%1$s;
       create trigger touch_%1$s before update on public.%1$s
         for each row execute function public.touch_updated_at();', t);
  end loop;
end $$;

create index if not exists designs_order_idx    on public.designs (published, sort_order);
create index if not exists projects_order_idx   on public.projects (published, sort_order);
create index if not exists experience_order_idx on public.experience (is_additional, sort_order desc);

-- --------------------------------------------------------------------- RLS --
-- Anonymous visitors read published rows only. Writes require a logged-in user,
-- and since exactly one account exists, that is the admin.
alter table public.designs      enable row level security;
alter table public.projects     enable row level security;
alter table public.experience   enable row level security;
alter table public.skill_groups enable row level security;
alter table public.education    enable row level security;
alter table public.profile      enable row level security;

-- Tables with a published flag: gate anonymous reads on it.
do $$
declare t text;
begin
  foreach t in array array['designs','projects','experience'] loop
    execute format('drop policy if exists "public reads published" on public.%I;', t);
    execute format(
      'create policy "public reads published" on public.%I
         for select using (published = true);', t);
  end loop;
end $$;

-- Reference tables carry nothing sensitive, so they are readable outright.
do $$
declare t text;
begin
  foreach t in array array['skill_groups','education','profile'] loop
    execute format('drop policy if exists "public reads all" on public.%I;', t);
    execute format(
      'create policy "public reads all" on public.%I
         for select using (true);', t);
  end loop;
end $$;

-- Any authenticated session gets full write access.
do $$
declare t text;
begin
  foreach t in array array[
    'designs','projects','experience','skill_groups','education','profile'
  ] loop
    execute format('drop policy if exists "authenticated writes" on public.%I;', t);
    execute format(
      'create policy "authenticated writes" on public.%I
         for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- ------------------------------------------------------------------ storage --
insert into storage.buckets (id, name, public)
values ('work', 'work', true)
on conflict (id) do nothing;

drop policy if exists "work public read"    on storage.objects;
drop policy if exists "work authed insert"  on storage.objects;
drop policy if exists "work authed update"  on storage.objects;
drop policy if exists "work authed delete"  on storage.objects;

create policy "work public read" on storage.objects
  for select using (bucket_id = 'work');
create policy "work authed insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'work');
create policy "work authed update" on storage.objects
  for update to authenticated using (bucket_id = 'work');
create policy "work authed delete" on storage.objects
  for delete to authenticated using (bucket_id = 'work');
