-- Cuentas de atletas y coach (correr UNA vez en Supabase → SQL Editor → New query → Run)
-- Crea: perfiles, fichas y planes; deja cada dato visible solo para su dueño y para el coach.

-- 1. Perfil: se crea solo cuando alguien crea su cuenta ------------------------
create table if not exists public.perfiles (
  id      uuid primary key references auth.users on delete cascade,
  nombre  text not null default '',
  apodo   text not null default '',
  rol     text not null default 'atleta' check (rol in ('atleta', 'coach')),
  estado  text not null default 'ficha'  check (estado in ('ficha', 'evaluacion', 'activo', 'pausa')),
  creado  timestamptz not null default now()
);

create or replace function public.nuevo_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, nombre, apodo)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'nombre', ''),
          split_part(coalesce(new.raw_user_meta_data ->> 'nombre', ''), ' ', 1));
  return new;
end $$;

drop trigger if exists al_crear_cuenta on auth.users;
create trigger al_crear_cuenta after insert on auth.users
  for each row execute function public.nuevo_perfil();

-- ¿La persona conectada es coach?
create or replace function public.es_coach() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'coach');
$$;

-- 2. Ficha de inscripción (objetivo, marcas, disponibilidad, salud...) -------------
create table if not exists public.fichas (
  atleta_id   uuid primary key references public.perfiles on delete cascade default auth.uid(),
  datos       jsonb not null,
  actualizado timestamptz not null default now()
);

-- Al enviar la ficha, el atleta pasa a "en evaluación"
create or replace function public.ficha_enviada() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.perfiles set estado = 'evaluacion' where id = new.atleta_id and estado = 'ficha';
  return new;
end $$;

drop trigger if exists al_enviar_ficha on public.fichas;
create trigger al_enviar_ficha after insert on public.fichas
  for each row execute function public.ficha_enviada();

-- 3. Planes (un bloque por fila, mismo JSON que planificacion-bloque-1.json) --------
create table if not exists public.planes (
  id         bigint generated always as identity primary key,
  atleta_id  uuid not null references public.perfiles on delete cascade,
  bloque     int  not null,
  inicio     date not null,
  fin        date not null,
  contenido  jsonb not null,
  creado     timestamptz not null default now()
);

-- 4. Registros diarios: ahora con dueño -----------------------------------------
alter table public.registros_dia add column if not exists atleta_id uuid default auth.uid();

-- 5. Acciones del coach sobre un atleta -----------------------------------------
create or replace function public.coach_cambiar_estado(p_atleta uuid, p_estado text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_coach() then raise exception 'Solo el coach puede hacer esto'; end if;
  update public.perfiles set estado = p_estado where id = p_atleta;
end $$;

-- 6. Permisos: cada uno ve lo suyo, el coach ve todo ---------------------------------
alter table public.perfiles enable row level security;
alter table public.fichas   enable row level security;
alter table public.planes   enable row level security;

-- Un atleta solo puede cambiar su nombre y apodo (no su rol ni su estado)
revoke update on public.perfiles from authenticated, anon;
grant update (nombre, apodo) on public.perfiles to authenticated;

create policy "perfil: ver propio o coach" on public.perfiles for select
  using (id = auth.uid() or public.es_coach());
create policy "perfil: editar propio" on public.perfiles for update
  using (id = auth.uid());

create policy "ficha: ver propia o coach" on public.fichas for select
  using (atleta_id = auth.uid() or public.es_coach());
create policy "ficha: crear propia" on public.fichas for insert
  with check (atleta_id = auth.uid());
create policy "ficha: editar propia" on public.fichas for update
  using (atleta_id = auth.uid());

create policy "plan: ver propio o coach" on public.planes for select
  using (atleta_id = auth.uid() or public.es_coach());
create policy "plan: coach crea" on public.planes for insert
  with check (public.es_coach());
create policy "plan: coach edita" on public.planes for update
  using (public.es_coach());
create policy "plan: coach borra" on public.planes for delete
  using (public.es_coach());

-- Se reemplaza el acceso temporal (abierto a todos) por acceso por dueño
drop policy if exists "acceso temporal" on public.registros_dia;
create policy "registros: ver propios o coach" on public.registros_dia for select
  using (atleta_id = auth.uid() or public.es_coach());
create policy "registros: crear propios" on public.registros_dia for insert
  with check (atleta_id = auth.uid());
create policy "registros: editar propios" on public.registros_dia for update
  using (atleta_id = auth.uid());
