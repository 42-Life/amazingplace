-- Votes: each account can vote for one submission per challenge.
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
    -- Points at (submission, challenge) together, so the vote's challenge_id
    -- must be the challenge the submission actually belongs to.
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

-- See validate_vote_update in functions.sql.
create trigger validate_vote_update
    before update on public.votes
    for each row execute function public.validate_vote_update();

-- See prevent_self_vote in functions.sql.
create trigger prevent_self_vote
    before insert or update on public.votes
    for each row execute function public.prevent_self_vote();

grant select, insert, update, delete on table public.votes to authenticated;
grant all on table public.votes to service_role;
