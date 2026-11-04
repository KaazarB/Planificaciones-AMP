-- Seguridad: crear cuenta solo con código de invitación + permisos más estrictos.
-- Correr UNA vez en Supabase → SQL Editor → New query → Run.

-- 1. Códigos de invitación (solo el coach los ve y los administra) -----------------
create table if not exists public.invitaciones (
  codigo   text primary key,
  nota     text not null default '',
  usos     int  not null default 0,
  usos_max int,                       -- vacío = sin límite
  activo   boolean not null default true,
  creado   timestamptz not null default now()
);

alter table public.invitaciones enable row level security;
drop policy if exists "invitaciones: coach" on public.invitaciones;
create policy "invitaciones: coach" on public.invitaciones for all
  using (public.es_coach()) with check (public.es_coach());

-- Un primer código general para empezar
insert into public.invitaciones (codigo, nota)
values (upper(substr(md5(random()::text), 1, 6)), 'Código general')
on conflict do nothing;

-- 2. Al crear cuenta se exige un código válido; si no, Supabase rechaza el registro -----
create or replace function public.nuevo_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_codigo text := upper(trim(coalesce(new.raw_user_meta_data ->> 'codigo', '')));
begin
  update public.invitaciones
     set usos = usos + 1
   where codigo = v_codigo and activo and (usos_max is null or usos < usos_max);
  if not found then
    raise exception 'codigo_invalido';
  end if;

  insert into public.perfiles (id, nombre, apodo)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'nombre', ''),
          split_part(coalesce(new.raw_user_meta_data ->> 'nombre', ''), ' ', 1));
  return new;
end $$;

-- 3. Registros: cada fila debe ser del mismo usuario en sus dos columnas ---------------
drop policy if exists "registros: crear propios" on public.registros_dia;
drop policy if exists "registros: editar propios" on public.registros_dia;
create policy "registros: crear propios" on public.registros_dia for insert
  with check (atleta_id = auth.uid() and atleta = auth.uid()::text);
create policy "registros: editar propios" on public.registros_dia for update
  using (atleta_id = auth.uid())
  with check (atleta_id = auth.uid() and atleta = auth.uid()::text);

-- 4. Tabla antigua «registros» (ya no se usa): se cierra el acceso abierto ---------------
drop policy if exists "acceso temporal" on public.registros;
