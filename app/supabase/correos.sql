-- Correos enviados por el coach (por ahora, la guía mensual: app en el inicio + registro).
-- Sirve para mostrar el botón solo a quien no lo ha recibido o lo recibió hace 30 días o más.
-- Correr UNA vez en Supabase → SQL Editor → New query → Run.

create table if not exists public.correos_enviados (
  id        bigint generated always as identity primary key,
  atleta_id uuid not null references public.perfiles on delete cascade,
  tipo      text not null default 'guia',
  enviado   timestamptz not null default now()
);
create index if not exists correos_enviados_atleta_tipo on public.correos_enviados (atleta_id, tipo, enviado desc);

alter table public.correos_enviados enable row level security;
drop policy if exists "correos: coach" on public.correos_enviados;
create policy "correos: coach" on public.correos_enviados for all
  using (public.es_coach()) with check (public.es_coach());
