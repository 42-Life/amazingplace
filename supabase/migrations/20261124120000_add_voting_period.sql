-- Entry period, then voting period.
--
-- A challenge now runs in four phases:
--   upcoming  before start_at                      nothing to do yet
--   entry     start_at through end_at              submit photos/videos
--   voting    the day after end_at through voting_end_at   vote for submissions
--   closed    after voting_end_at                  results are final
--
-- Submissions are only accepted during entry, and votes can only be cast, moved or
-- taken back during voting. Both are enforced here, not only by the app's buttons.


-- 1. THE NEW COLUMN
-- Existing challenges get three days of voting after their last entry day.
alter table public.challenges add column voting_end_at date;
update public.challenges set voting_end_at = end_at + 3;
alter table public.challenges alter column voting_end_at set not null;
alter table public.challenges
    add constraint challenges_voting_end_at_check check (voting_end_at > end_at);


-- 2. "TODAY" FOR CHALLENGES
-- Challenge dates are calendar days in Boston, where every challenge so far is.
-- current_date is UTC, which would close entries at 7 pm Eastern on the last day.
create or replace function public.challenge_today()
returns date
language sql
stable
set search_path to 'public'
as $$
    select (now() at time zone 'America/New_York')::date
$$;

grant execute on function public.challenge_today() to anon, authenticated, service_role;


-- 3. WHICH PHASE A CHALLENGE IS IN
-- Returns 'upcoming', 'entry', 'voting' or 'closed' (null if there is no such challenge).
-- Matches getChallengePhase in src/utils/challenge-dates.ts.
create or replace function public.challenge_phase(p_challenge_id text)
returns text
language sql
stable
set search_path to 'public'
as $$
    select case
        when public.challenge_today() < c.start_at then 'upcoming'
        when public.challenge_today() <= c.end_at then 'entry'
        when public.challenge_today() <= c.voting_end_at then 'voting'
        else 'closed'
    end
    from public.challenges c
    where c.id = p_challenge_id
$$;

grant execute on function public.challenge_phase(text) to anon, authenticated, service_role;


-- 4. DEFAULT VOTING PERIOD
-- An app build that doesn't know about voting_end_at yet still creates working challenges:
-- they get the same three days of voting as the existing ones.
create or replace function public.set_default_voting_end_at()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
    if new.voting_end_at is null then
        new.voting_end_at := new.end_at + 3;
    end if;
    return new;
end;
$$;

create trigger set_default_voting_end_at
    before insert on public.challenges
    for each row execute function public.set_default_voting_end_at();


-- 5. EDIT RULES
-- Adds: the entry end date is locked once entries have closed, the voting end date is
-- locked once voting has closed, and voting must end after entries do.
-- Also switches "today" from UTC to challenge_today(), so edits follow the same days as the app.
create or replace function public.validate_challenge_edit()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
    today date := public.challenge_today();
begin
    if new.id is distinct from old.id
       or new.created_at is distinct from old.created_at
       or new.radius_m is distinct from old.radius_m
       or new.media_type is distinct from old.media_type
       or new.price_cents is distinct from old.price_cents
       or (old.creator_account_id is not null and new.creator_account_id is distinct from old.creator_account_id) then
        raise exception 'Challenge identity, creator, radius, media type and entry fee cannot be changed.';
    end if;

    if new.title is distinct from old.title and char_length(trim(new.title)) not between 1 and 80 then
        raise exception 'Title must be 1 to 80 characters.';
    end if;
    if new.description is distinct from old.description
       and (new.description is null or char_length(trim(new.description)) not between 1 and 500) then
        raise exception 'Description must be 1 to 500 characters.';
    end if;

    if new.end_at is distinct from old.end_at then
        if old.end_at < today then
            raise exception 'The entry end date cannot change after entries have closed.';
        end if;
        if new.end_at <= today then
            raise exception 'The end date must be after today.';
        end if;
    end if;
    if new.start_at is distinct from old.start_at then
        if old.start_at <= today then
            raise exception 'The start date cannot change after the challenge has begun.';
        end if;
        if new.start_at < today then
            raise exception 'The start date cannot be in the past.';
        end if;
    end if;
    if (new.start_at is distinct from old.start_at or new.end_at is distinct from old.end_at)
       and new.end_at < new.start_at then
        raise exception 'The end date cannot be before the start date.';
    end if;

    if new.voting_end_at is distinct from old.voting_end_at then
        if old.voting_end_at < today then
            raise exception 'The voting end date cannot change after voting has closed.';
        end if;
        if new.voting_end_at < today then
            raise exception 'The voting end date cannot be in the past.';
        end if;
    end if;
    if (new.end_at is distinct from old.end_at or new.voting_end_at is distinct from old.voting_end_at)
       and new.voting_end_at <= new.end_at then
        raise exception 'Voting must end after the entry end date.';
    end if;

    if new.latitude is distinct from old.latitude or new.longitude is distinct from old.longitude then
        if old.start_at <= today then
            raise exception 'The location cannot change after the challenge has begun.';
        end if;
        if not (new.latitude between -90 and 90 and new.longitude between -180 and 180) then
            raise exception 'Choose valid latitude and longitude coordinates.';
        end if;
    end if;
    return new;
end;
$$;


-- 6. SUBMISSIONS ONLY DURING ENTRY
drop policy "users insert their own submissions" on public.submissions;
create policy "users insert their own submissions"
    on public.submissions for insert
    to authenticated
    with check (
        account_id = public.current_account_id()
        and public.has_challenge_access(challenge_id, public.current_account_id())
        and public.challenge_phase(challenge_id) = 'entry'
    );


-- 7. VOTES ONLY DURING VOTING
-- Casting, moving and taking back a vote are all locked outside voting,
-- so nobody votes while entries are still coming in, and results can't change once closed.
drop policy "users insert their own votes" on public.votes;
create policy "users insert their own votes"
    on public.votes for insert
    to authenticated
    with check (
        account_id = public.current_account_id()
        and public.challenge_phase(challenge_id) = 'voting'
    );

drop policy "users update their own votes" on public.votes;
create policy "users update their own votes"
    on public.votes for update
    to authenticated
    using (
        account_id = public.current_account_id()
        and public.challenge_phase(challenge_id) = 'voting'
    )
    with check (
        account_id = public.current_account_id()
        and public.challenge_phase(challenge_id) = 'voting'
    );

drop policy "users delete their own votes" on public.votes;
create policy "users delete their own votes"
    on public.votes for delete
    to authenticated
    using (
        account_id = public.current_account_id()
        and public.challenge_phase(challenge_id) = 'voting'
    );
