create table public.challenges (
    id text not null,
    title text not null,
    description text,
    latitude double precision not null,
    longitude double precision not null,
    created_at timestamptz not null default now(),
    end_at date not null,
    start_at date not null,
    radius_m double precision not null default 100,
    creator_account_id uuid default public.current_account_id(),
    media_type text not null default 'photo',

    constraint challenges_pkey primary key (id),
    constraint challenges_creator_account_id_fkey foreign key (creator_account_id)
        references public.accounts (id) on delete cascade,
    constraint challenges_radius_m_check check (radius_m > 0),
    constraint challenges_media_type_check check (media_type in ('photo', 'video'))
);

alter table public.challenges enable row level security;

create index challenges_creator_account_id_idx on public.challenges (creator_account_id);

create policy "Anyone can view challenges"
    on public.challenges for select
    to authenticated, anon
    using (true);

create policy "Enable insert for authenticated users only"
    on public.challenges for insert
    to authenticated
    with check (creator_account_id = public.current_account_id());

create policy "creators update their own challenges"
    on public.challenges for update to authenticated
    using (creator_account_id = public.current_account_id())
    with check (creator_account_id = public.current_account_id());

create policy "creators delete their own challenges"
    on public.challenges for delete to authenticated
    using (creator_account_id = public.current_account_id());

create trigger validate_challenge_edit
    before update on public.challenges
    for each row execute function public.validate_challenge_edit();

grant all on table public.challenges to anon, authenticated, service_role;
