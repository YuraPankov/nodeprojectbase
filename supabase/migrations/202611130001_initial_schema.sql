-- Nodebase cloud storage: PostgreSQL schema for Supabase
-- Every record belongs to one authenticated user. Never expose service_role keys in the browser.

create extension if not exists pgcrypto;

create table if not exists public.entities (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('person','project','artist','organization','idea','knowledge','resource','task','event','note')),
  title text not null,
  description text not null default '',
  status text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  archived_at timestamptz,
  unique (id, user_id)
);

create table if not exists public.relations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  from_entity_id uuid not null,
  to_entity_id uuid not null,
  type text not null,
  label text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  constraint relations_not_self check (from_entity_id <> to_entity_id),
  constraint relations_from_owner foreign key (from_entity_id, user_id) references public.entities(id, user_id) on delete cascade,
  constraint relations_to_owner foreign key (to_entity_id, user_id) references public.entities(id, user_id) on delete cascade,
  unique (id, user_id)
);

create table if not exists public.boards (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  section_key text,
  parent_board_id uuid,
  parent_entity_id uuid,
  sort_order integer,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (id, user_id),
  constraint boards_parent_owner foreign key (parent_board_id, user_id) references public.boards(id, user_id) on delete cascade,
  constraint boards_parent_entity_owner foreign key (parent_entity_id, user_id) references public.entities(id, user_id) on delete set null
);

create table if not exists public.board_nodes (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  board_id uuid not null,
  entity_id uuid not null,
  position_x double precision not null default 0,
  position_y double precision not null default 0,
  width double precision,
  height double precision,
  display_config jsonb not null default '{}'::jsonb,
  constraint board_nodes_board_owner foreign key (board_id, user_id) references public.boards(id, user_id) on delete cascade,
  constraint board_nodes_entity_owner foreign key (entity_id, user_id) references public.entities(id, user_id) on delete cascade,
  unique (board_id, entity_id)
);

create index if not exists entities_user_type_idx on public.entities(user_id, type);
create index if not exists entities_user_updated_idx on public.entities(user_id, updated_at desc);
create index if not exists relations_user_from_idx on public.relations(user_id, from_entity_id);
create index if not exists relations_user_to_idx on public.relations(user_id, to_entity_id);
create index if not exists boards_user_parent_idx on public.boards(user_id, parent_board_id);
create index if not exists board_nodes_user_board_idx on public.board_nodes(user_id, board_id);

alter table public.entities enable row level security;
alter table public.relations enable row level security;
alter table public.boards enable row level security;
alter table public.board_nodes enable row level security;

revoke all on public.entities, public.relations, public.boards, public.board_nodes from anon;
grant select, insert, update, delete on public.entities, public.relations, public.boards, public.board_nodes to authenticated;

drop policy if exists "users manage own entities" on public.entities;
create policy "users manage own entities" on public.entities for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "users manage own relations" on public.relations;
create policy "users manage own relations" on public.relations for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "users manage own boards" on public.boards;
create policy "users manage own boards" on public.boards for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "users manage own board nodes" on public.board_nodes;
create policy "users manage own board nodes" on public.board_nodes for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
