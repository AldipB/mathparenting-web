-- Enable UUID generators (one will work; both are safe)
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- ===== Reset any partial/old course tables (order matters) =====
drop table if exists public.parent_progress    cascade;
drop table if exists public.parent_bookmarks   cascade;

drop table if exists public.lesson_sections    cascade;
drop table if exists public.practice_problems  cascade;
drop table if exists public.lessons            cascade;
drop table if exists public.units              cascade;
drop table if exists public.grades             cascade;

-- ===== PUBLIC, READ-ONLY COURSE CONTENT (RLS OFF) =====
create table public.grades (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                -- 'k','1',...,'12'
  name text not null,                       -- 'Kindergarten', 'Grade 1', ...
  description text,
  global_alignment jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  grade_id uuid not null references public.grades(id) on delete cascade,
  order_index int not null,
  title text not null,
  overview text,
  created_at timestamptz default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  order_index int not null,
  slug text not null,                        -- kebab-case
  title text not null,
  difficulty_level text
    check (difficulty_level in ('foundational','core','challenge')) default 'core',
  summary text,
  created_at timestamptz default now(),
  unique(unit_id, slug)
);

-- Structured sections per lesson (Markdown)
create table public.lesson_sections (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  section_key text not null,                 -- overview|core|demo|math|guide|mistakes|connection|practice|close
  markdown_content text not null default '',
  order_index int not null,
  created_at timestamptz default now(),
  unique(lesson_id, section_key)
);

-- Practice problems per lesson
create table public.practice_problems (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  order_index int not null,
  question_md text not null,
  hint_md text,
  answer_md text,
  created_at timestamptz default now()
);

-- Leave RLS DISABLED on the 5 content tables above so courses are free to read.

-- ===== USER-SCOPED (PRIVATE, RLS ON) =====
create table public.parent_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  last_section text,
  completed boolean default false,
  updated_at timestamptz default now(),
  unique(user_id, lesson_id)
);

create table public.parent_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, lesson_id)
);

-- Enable RLS ONLY on the private tables
alter table public.parent_progress   enable row level security;
alter table public.parent_bookmarks  enable row level security;

-- Owner-only policies
drop policy if exists "progress is user-scoped"  on public.parent_progress;
create policy "progress is user-scoped"
  on public.parent_progress
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "bookmarks are user-scoped" on public.parent_bookmarks;
create policy "bookmarks are user-scoped"
  on public.parent_bookmarks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
