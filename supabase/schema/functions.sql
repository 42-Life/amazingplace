-- Returns the accounts.id of the signed-in user.
-- Used as the default for submissions.account_id and in RLS policies.
create or replace function public.current_account_id()
returns uuid
language sql
stable
security definer
set search_path to 'public'
as $$
    select id from public.accounts where auth_user_id = auth.uid()
$$;

-- Creates an accounts row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
    insert into public.accounts (auth_user_id, username)
    values (new.id, new.raw_user_meta_data ->> 'username');
    return new;
end;
$$;

grant all on function public.current_account_id() to anon, authenticated, service_role;
grant all on function public.handle_new_user() to anon, authenticated, service_role;
