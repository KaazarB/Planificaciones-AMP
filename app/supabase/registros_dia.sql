-- Tabla de registros por día (un registro = todo lo anotado en una fecha).
-- Pegar en Supabase → SQL Editor → Run. Solo hay que hacerlo una vez.

create table if not exists public.registros_dia (
  atleta      text        not null,           -- código del atleta, ej. marcelo-x7k3
  fecha       date        not null,           -- día del plan
  datos       jsonb       not null,           -- checks, series (kg/reps/seg), RPE, lumbar, sueño, notas
  actualizado timestamptz not null default now(),
  primary key (atleta, fecha)
);

alter table public.registros_dia enable row level security;

-- MVP sin login: la app (clave pública) puede leer y escribir.
-- Cuando agreguemos login, se reemplaza por políticas por usuario.
create policy "app lee"     on public.registros_dia for select using (true);
create policy "app inserta" on public.registros_dia for insert with check (true);
create policy "app edita"   on public.registros_dia for update using (true);
