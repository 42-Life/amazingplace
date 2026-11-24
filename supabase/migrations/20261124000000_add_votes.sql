-- Votes: each account can vote for one submission per challenge.

-- Lets votes point at (submission, challenge) together, so a vote's challenge_id
-- must be the challenge the submission actually belongs to.
alter table public.submissions
    add constraint submissions_id_challenge_id_key unique (id, challenge_id);

create table public.votes (
    id uuid not null default gen_random_uuid(),
    account_id uuid not null default public.current_account_id(),
    submission_id uuid not null,
    challenge_id text not null,
    created_at timestamptz not null default now(),

    constraint votes_pkey primary key (id),
    constraint votes_account_id_fkey foreign key (account_id)
        references public.accounts (id) on delete cascade,
    constraint votes_challenge_id_fkey foreign key (challenge_id)
        references public.challenges (id) on delete cascade,
    constraint votes_submission_id_fkey foreign key (submission_id, challenge_id)
        references public.submissions (id, challenge_id) on delete cascade,
    -- One vote per account per challenge.
    constraint votes_account_challenge_key unique (account_id, challenge_id)
);

create index votes_submission_id_idx on public.votes (submission_id);
create index votes_challenge_id_idx on public.votes (challenge_id);

alter table public.votes enable row level security;

-- Anyone signed in can see votes (needed to show counts).
create policy "Signed-in users can view votes"
    on public.votes for select
    to authenticated
    using (true);

-- Users can only vote as themselves.
create policy "users insert their own votes"
    on public.votes for insert
    to authenticated
    with check (account_id = public.current_account_id());

-- Users can change which submission their own vote is for.
create policy "users update their own votes"
    on public.votes for update
    to authenticated
    using (account_id = public.current_account_id())
    with check (account_id = public.current_account_id());

-- Users can take back their own votes.
create policy "users delete their own votes"
    on public.votes for delete
    to authenticated
    using (account_id = public.current_account_id());

-- A vote can only switch submissions within the same challenge.
-- Row level security can't compare old and new values, so a trigger does it.
create or replace function public.validate_vote_update()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
    if new.account_id <> old.account_id then
        raise exception 'A vote''s account can''t be changed.';
    end if;
    if new.challenge_id <> old.challenge_id then
        raise exception 'A vote can''t be moved to another challenge.';
    end if;
    return new;
end;
$$;

create trigger validate_vote_update
    before update on public.votes
    for each row execute function public.validate_vote_update();

grant select, insert, update, delete on table public.votes to authenticated;
grant all on table public.votes to service_role;
