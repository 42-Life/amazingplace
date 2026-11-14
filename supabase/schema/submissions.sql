create table public.submissions (
    id uuid not null default gen_random_uuid(),
    challenge_id text not null,
    image_path text not null,
    created_at timestamptz not null default now(),
    account_id uuid not null default public.current_account_id(),
    latitude double precision not null,
    longitude double precision not null,

    constraint submissions_pkey primary key (id),
    constraint submissions_challenge_id_fkey foreign key (challenge_id)
        references public.challenges (id) on delete cascade,
    constraint submissions_account_id_fkey foreign key (account_id)
        references public.accounts (id) on delete cascade,
    constraint submissions_latitude_check check (latitude >= -90 and latitude <= 90),
    constraint submissions_longitude_check check (longitude >= -180 and longitude <= 180)
);

alter table public.submissions enable row level security;

create policy "Signed-in users can view submissions"
    on public.submissions for select
    to authenticated
    using (true);

create policy "users insert their own submissions"
    on public.submissions for insert
    to authenticated
    with check (account_id = public.current_account_id());

create policy "users delete their own submissions"
    on public.submissions for delete
    to authenticated
    using (account_id = public.current_account_id());

grant all on table public.submissions to anon, authenticated, service_role;
