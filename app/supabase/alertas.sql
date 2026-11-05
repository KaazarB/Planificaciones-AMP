-- Alertas: WhatsApp y correo en el perfil + revisiones de fin de bloque.
-- Incluye también la seguridad de códigos de invitación (si ya corriste seguridad.sql, no pasa nada).
-- Correr UNA vez en Supabase → SQL Editor → New query → Run.

-- 1. WhatsApp y correo en el perfil (para recordar la ficha pendiente) ------------------
alter table public.perfiles add column if not exists whatsapp text not null default '';
alter table public.perfiles add column if not exists correo   text not null default '';

-- Correo de las cuentas que ya existen
update public.perfiles p set correo = u.email
  from auth.users u
 where u.id = p.id and p.correo = '';

-- 2. Códigos de invitación (igual que seguridad.sql) ---------------------------------
create table if not exists public.invitaciones (
  codigo   text primary key,
  nota     text not null default '',
  usos     int  not null default 0,
  usos_max int,
  activo   boolean not null default true,
  creado   timestamptz not null default now()
);
alter table public.invitaciones enable row level security;
drop policy if exists "invitaciones: coach" on public.invitaciones;
create policy "invitaciones: coach" on public.invitaciones for all
  using (public.es_coach()) with check (public.es_coach());
insert into public.invitaciones (codigo, nota)
select upper(substr(md5(random()::text), 1, 6)), 'Código general'
 where not exists (select 1 from public.invitaciones);

-- 3. Al crear cuenta: exige código válido y guarda nombre, WhatsApp y correo ------------
create or replace function public.nuevo_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_codigo text := upper(trim(coalesce(new.raw_user_meta_data ->> 'codigo', '')));
  v_nombre text := coalesce(new.raw_user_meta_data ->> 'nombre', '');
begin
  update public.invitaciones
     set usos = usos + 1
   where codigo = v_codigo and activo and (usos_max is null or usos < usos_max);
  if not found then
    raise exception 'codigo_invalido';
  end if;

  insert into public.perfiles (id, nombre, apodo, whatsapp, correo)
  values (new.id, v_nombre, split_part(v_nombre, ' ', 1),
          coalesce(new.raw_user_meta_data ->> 'whatsapp', ''), coalesce(new.email, ''));
  return new;
end $$;

-- 4. Registros más estrictos y cierre de la tabla antigua (igual que seguridad.sql) ------
drop policy if exists "registros: crear propios" on public.registros_dia;
drop policy if exists "registros: editar propios" on public.registros_dia;
create policy "registros: crear propios" on public.registros_dia for insert
  with check (atleta_id = auth.uid() and atleta = auth.uid()::text);
create policy "registros: editar propios" on public.registros_dia for update
  using (atleta_id = auth.uid())
  with check (atleta_id = auth.uid() and atleta = auth.uid()::text);
drop policy if exists "acceso temporal" on public.registros;

-- 5. Revisiones de fin de bloque (objetivo, molestias, cómo le fue) ----------------------
create table if not exists public.revisiones (
  id        bigint generated always as identity primary key,
  atleta_id uuid not null references public.perfiles on delete cascade default auth.uid(),
  bloque    int  not null,
  datos     jsonb not null,
  creado    timestamptz not null default now(),
  unique (atleta_id, bloque)
);
alter table public.revisiones enable row level security;
drop policy if exists "revisiones: ver propias o coach" on public.revisiones;
drop policy if exists "revisiones: crear propias" on public.revisiones;
drop policy if exists "revisiones: editar propias" on public.revisiones;
create policy "revisiones: ver propias o coach" on public.revisiones for select
  using (atleta_id = auth.uid() or public.es_coach());
create policy "revisiones: crear propias" on public.revisiones for insert
  with check (atleta_id = auth.uid());
create policy "revisiones: editar propias" on public.revisiones for update
  using (atleta_id = auth.uid());
