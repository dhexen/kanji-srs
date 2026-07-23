-- Migration 038: arregla el 500 (infinite recursion, 42P17) en app_config y
-- user_vocab_progress.
--
-- Causa: is_admin() perdió en la BD el atributo SECURITY DEFINER, así que al
-- leer user_roles bajo RLS su política ("Users read own role" → or is_admin())
-- volvía a llamar a is_admin() → recursión infinita. Cualquier tabla cuya
-- política lea user_roles inline (app_config, user_vocab_progress) devolvía 500.
-- get_my_role() seguía funcionando por ser SECURITY DEFINER (salta la RLS).
--
-- Efecto colateral que resolvía: los repasos no se guardaban (el write a
-- user_vocab_progress fallaba antes de insertar en srs_review_log), por lo que
-- el ranking semanal salía vacío.

-- 1) Re-asegura que is_admin() salta la RLS (rompe la recursión).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- 2) Sustituye las subconsultas inline a user_roles por is_admin(), para que
--    estas políticas nunca evalúen user_roles bajo RLS (defensa en profundidad).
drop policy if exists "Admins can manage app_config" on public.app_config;
create policy "Admins can manage app_config"
  on public.app_config for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins read all vocab progress" on public.user_vocab_progress;
create policy "Admins read all vocab progress"
  on public.user_vocab_progress for select
  using (public.is_admin());
