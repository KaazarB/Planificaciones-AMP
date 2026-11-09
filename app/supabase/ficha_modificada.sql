-- Ficha modificada: cuando un atleta activo (o en pausa) cambia su ficha, queda marcado para que el coach
-- revise su planificación. El coach lo desmarca con «Plan revisado» o al cargar un plan nuevo.
-- Correr UNA vez en Supabase → SQL Editor → New query → Run.

alter table public.perfiles add column if not exists ficha_modificada timestamptz;

create or replace function public.ficha_actualizada() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.datos is distinct from old.datos then
    update public.perfiles set ficha_modificada = now()
     where id = new.atleta_id and estado in ('activo', 'pausa');
  end if;
  return new;
end $$;

drop trigger if exists al_actualizar_ficha on public.fichas;
create trigger al_actualizar_ficha after update on public.fichas
  for each row execute function public.ficha_actualizada();

create or replace function public.coach_ficha_revisada(p_atleta uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_coach() then raise exception 'Solo el coach puede hacer esto'; end if;
  update public.perfiles set ficha_modificada = null where id = p_atleta;
end $$;

-- Las funciones del trigger no se llaman desde la app
revoke execute on function public.ficha_actualizada() from anon, authenticated;
revoke execute on function public.coach_ficha_revisada(uuid) from anon;
