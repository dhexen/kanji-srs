-- Migration 034: aggregate count of teacher-validated sentences per grammar
-- point, so the admin monitor can show progress toward 100 validated/point
-- without fetching every row.

create or replace function public.grammar_validated_counts()
returns table (grammar_id text, n bigint)
language sql
stable
security definer
set search_path = public
as $$
  select grammar_id, count(*) as n
  from public.grammar_sentences
  where validated = true and is_private = false
  group by grammar_id
$$;

grant execute on function public.grammar_validated_counts() to authenticated, service_role;

notify pgrst, 'reload schema';
