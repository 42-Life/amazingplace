create table public.submissions (
    id uuid not null default gen_random_uuid(),
    challenge_id text not null,
    image_path text not null,
    created_at timestamptz not null default now(),
    account_id uuid not null default public.current_account_id(),
    latitude double precision not null,
    longitude double precision not null,
    media_type text not null default 'photo',
    duration_ms integer,

    constraint submissions_pkey primary key (id),
    -- Lets votes point at (submission, challenge) together, so a vote's challenge_id
    -- must be the challenge the submission actually belongs to.
    constraint submissions_id_challenge_id_key unique (id, challenge_id),
    constraint submissions_challenge_id_fkey foreign key (challenge_id)
        references public.challenges (id) on delete cascade,
    constraint submissions_account_id_fkey foreign key (account_id)
        references public.accounts (id) on delete cascade,
    constraint submissions_latitude_check check (latitude >= -90 and latitude <= 90),
    constraint submissions_longitude_check check (longitude >= -180 and longitude <= 180),
    constraint submissions_media_type_check check (media_type in ('photo', 'video')),
    -- Videos must say how long they are (up to 30 s, plus a little slack for the recorder); photos have no length
    constraint submissions_duration_ms_check check (
        (media_type = 'photo' and duration_ms is null)
        or (media_type = 'video' and duration_ms is not null and duration_ms between 1 and 31000)
    )
);

alter table public.submissions enable row level security;

create policy "Signed-in users can view submissions"
    on public.submissions for select
    to authenticated
    using (true);

-- Paid challenges only accept submissions from people who paid (and from the creator).
-- Free challenges are unaffected: has_challenge_access returns true for them.
create policy "users insert their own submissions"
    on public.submissions for insert
    to authenticated
    with check (
        account_id = public.current_account_id()
        and public.has_challenge_access(challenge_id, public.current_account_id())
    );

create policy "users delete their own submissions"
    on public.submissions for delete
    to authenticated
    using (account_id = public.current_account_id());

create trigger validate_submission_media_type
    before insert on public.submissions
    for each row execute function public.validate_submission_media_type();

grant all on table public.submissions to anon, authenticated, service_role;
