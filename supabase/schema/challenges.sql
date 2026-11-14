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

    constraint challenges_pkey primary key (id),
    constraint challenges_radius_m_check check (radius_m > 0)
);

alter table public.challenges enable row level security;

create policy "Anyone can view challenges"
    on public.challenges for select
    to authenticated, anon
    using (true);

create policy "Enable insert for authenticated users only"
    on public.challenges for insert
    to authenticated
    with check (true);

grant all on table public.challenges to anon, authenticated, service_role;
