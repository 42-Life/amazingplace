create table public.accounts (
    id uuid not null default gen_random_uuid(),
    auth_user_id uuid not null,
    username text not null,
    created_at timestamptz not null default now(),

    constraint accounts_pkey primary key (id),
    constraint accounts_auth_user_id_key unique (auth_user_id),
    constraint accounts_username_key unique (username),
    constraint accounts_auth_user_id_fkey foreign key (auth_user_id)
        references auth.users (id) on delete cascade,
    constraint accounts_username_check
        check (char_length(username) >= 3 and char_length(username) <= 20)
);

alter table public.accounts enable row level security;

create policy "accounts are readable by signed-in users"
    on public.accounts for select
    to authenticated
    using (true);

create policy "users update their own account"
    on public.accounts for update
    to authenticated
    using (auth_user_id = auth.uid())
    with check (auth_user_id = auth.uid());

grant all on table public.accounts to anon, authenticated, service_role;
