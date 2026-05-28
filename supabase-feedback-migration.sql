-- Feedback reports table
create table if not exists public.feedback_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  user_email  text not null,
  type        text not null check (type in ('bug', 'mejora')),
  section     text not null,
  description text not null,
  status      text not null default 'open' check (status in ('open', 'resolved')),
  created_at  timestamptz not null default now()
);

-- RLS
alter table public.feedback_reports enable row level security;

-- Any authenticated user can insert their own reports
create policy "Users can insert own feedback"
  on public.feedback_reports for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Admins (service role or via admin API) can read all
create policy "Admins can read all feedback"
  on public.feedback_reports for select
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'admin'
    )
  );

-- Admins can update status
create policy "Admins can update feedback"
  on public.feedback_reports for update
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'admin'
    )
  );
