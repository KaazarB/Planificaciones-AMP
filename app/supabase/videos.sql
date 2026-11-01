-- Biblioteca de videos de ejercicios (correr una vez en Supabase → SQL Editor → New query → Run)
create table if not exists public.videos (
  clave       text primary key,          -- nombre del ejercicio normalizado (sin tildes ni paréntesis)
  nombre      text not null,             -- nombre tal como aparece en el plan
  url         text not null,             -- link de YouTube
  actualizado timestamptz not null default now()
);

alter table public.videos enable row level security;

drop policy if exists "videos: todos ven" on public.videos;
drop policy if exists "videos: coach crea" on public.videos;
drop policy if exists "videos: coach edita" on public.videos;
drop policy if exists "videos: coach borra" on public.videos;

create policy "videos: todos ven" on public.videos for select to authenticated using (true);
create policy "videos: coach crea" on public.videos for insert with check (public.es_coach());
create policy "videos: coach edita" on public.videos for update using (public.es_coach());
create policy "videos: coach borra" on public.videos for delete using (public.es_coach());
