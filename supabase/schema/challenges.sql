create table public.challenges (
    id text not null,
    title text not null,
    description text,
    latitude double precision not null,
    longitude double precision not null,
    created_at timestamptz not null default now(),
    end_at date not null,                -- last day of the entry period
    start_at date not null,
    voting_end_at date not null,         -- last day of the voting period (filled in as end_at + 3 if left out)
    radius_m double precision not null default 100,
    creator_account_id uuid default public.current_account_id(),
    media_type text not null default 'photo',
    price_cents integer not null default 0,
    tags text[] not null default array['other']::text[],
    -- Optional preview photo, as its path in the "challenge-previews" bucket. Null means none.
    preview_path text,

    constraint challenges_pkey primary key (id),
    constraint challenges_creator_account_id_fkey foreign key (creator_account_id)
        references public.accounts (id) on delete cascade,
    constraint challenges_radius_m_check check (radius_m > 0),
    constraint challenges_media_type_check check (media_type in ('photo', 'video')),
    -- Voting starts the day after entries close, so it has to end after that
    constraint challenges_voting_end_at_check check (voting_end_at > end_at),
    -- A challenge is either free (0) or costs between 0.50 and 1,000.00 USD.
    -- The floor is Stripe's minimum charge for USD; anything under it is rejected by the API.
    constraint challenges_price_cents_check check (
        price_cents = 0 or price_cents between 50 and 100000
    ),
    -- Every challenge has 1 to 3 category tags, all from the known list.
    constraint challenges_tags_valid check (
        cardinality(tags) between 1 and 3
        and tags <@ array[
            'pranks_humor',
            'dares_skits',
            'everyday_life',
            'nature_scenery',
            'art_music',
            'sports_fitness',
            'photography',
            'food_drink',
            'animals_pets',
            'scavenger_hunt',
            'community_kindness',
            'other'
        ]::text[]
    )
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

-- See set_default_voting_end_at in functions.sql.
create trigger set_default_voting_end_at
    before insert on public.challenges
    for each row execute function public.set_default_voting_end_at();

create trigger validate_challenge_edit
    before update on public.challenges
    for each row execute function public.validate_challenge_edit();

grant all on table public.challenges to anon, authenticated, service_role;
