-- Aviso por correo al coach cuando un atleta envía su ficha o la cambia.
-- 1) Cada envío o cambio de ficha queda en fichas_cambios (antes / después; solo el coach lo ve).
-- 2) Al guardarse, la base de datos llama a la función aviso-ficha (supabase/functions/aviso-ficha),
--    que manda el correo con Resend. La clave RESEND_API_KEY va en Supabase → Edge Functions → Secrets,
--    nunca en este repositorio.
-- Requiere ficha_modificada.sql. Correr UNA vez en Supabase → SQL Editor → New query → Run.

create extension if not exists pg_net with schema extensions;

create table if not exists public.fichas_cambios (
  id        bigint generated always as identity primary key,
  atleta_id uuid not null references public.perfiles on delete cascade,
  antes     jsonb,          -- null = ficha nueva
  despues   jsonb not null,
  creado    timestamptz not null default now(),
  avisado   timestamptz     -- cuándo se mandó el correo (lo marca la función)
);
create index if not exists fichas_cambios_atleta on public.fichas_cambios (atleta_id, creado desc);

alter table public.fichas_cambios enable row level security;
drop policy if exists "fichas_cambios: coach ve" on public.fichas_cambios;
create policy "fichas_cambios: coach ve" on public.fichas_cambios for select using (public.es_coach());

-- Ficha nueva → queda en el historial
create or replace function public.ficha_nueva_historial() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.fichas_cambios (atleta_id, antes, despues) values (new.atleta_id, null, new.datos);
  return new;
end $$;

drop trigger if exists al_enviar_ficha_historial on public.fichas;
create trigger al_enviar_ficha_historial after insert on public.fichas
  for each row execute function public.ficha_nueva_historial();

-- Ficha cambiada → marca para el panel (si ya tiene plan) y queda en el historial
create or replace function public.ficha_actualizada() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.datos is distinct from old.datos then
    update public.perfiles set ficha_modificada = now()
     where id = new.atleta_id and estado in ('activo', 'pausa');
    insert into public.fichas_cambios (atleta_id, antes, despues) values (new.atleta_id, old.datos, new.datos);
  end if;
  return new;
end $$;

-- Cada registro del historial llama a la función que manda el correo (asíncrono: no frena el guardado)
create or replace function public.avisar_cambio_ficha() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url := 'https://wmvwvkiaabomaamsxlxv.supabase.co/functions/v1/aviso-ficha',
    body := jsonb_build_object('cambio_id', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return new;
end $$;

drop trigger if exists al_registrar_cambio_ficha on public.fichas_cambios;
create trigger al_registrar_cambio_ficha after insert on public.fichas_cambios
  for each row execute function public.avisar_cambio_ficha();

-- Funciones de trigger: no se llaman desde la app
revoke execute on function public.ficha_nueva_historial() from anon, authenticated;
revoke execute on function public.ficha_actualizada() from anon, authenticated;
revoke execute on function public.avisar_cambio_ficha() from anon, authenticated;
