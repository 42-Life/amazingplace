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

-- Enforce edit rules on the server too, including when a form stays open overnight.
-- The entry fee is fixed at creation, like the radius and media type. Letting a creator
-- raise it afterwards would change the deal for everyone who already paid to get in.
-- (Keep comments out of the function body: the body must match the migration exactly,
-- or the next declarative sync re-creates the function for no reason.)
create or replace function public.validate_challenge_edit()
returns trigger
language plpgsql
set search_path to 'public'
as $$
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

    if new.end_at is distinct from old.end_at and new.end_at <= current_date then
        raise exception 'The end date must be after today.';
    end if;
    if new.start_at is distinct from old.start_at then
        if old.start_at <= current_date then
            raise exception 'The start date cannot change after the challenge has begun.';
        end if;
        if new.start_at < current_date then
            raise exception 'The start date cannot be in the past.';
        end if;
    end if;
    if (new.start_at is distinct from old.start_at or new.end_at is distinct from old.end_at)
       and new.end_at < new.start_at then
        raise exception 'The end date cannot be before the start date.';
    end if;

    if new.latitude is distinct from old.latitude or new.longitude is distinct from old.longitude then
        if old.start_at <= current_date then
            raise exception 'The location cannot change after the challenge has begun.';
        end if;
        if not (new.latitude between -90 and 90 and new.longitude between -180 and 180) then
            raise exception 'Choose valid latitude and longitude coordinates.';
        end if;
    end if;
    return new;
end;
$$;

-- May this account submit to this challenge?
-- True for a free challenge, for the creator of the challenge, and for anyone whose
-- entry fee has been confirmed paid by Stripe. Used by the submissions insert policy,
-- so the fee is enforced by the database and not only by the app's buttons.
--
-- security definer: the caller may not be allowed to read challenge_entries rows that
-- aren't theirs, but this function has to read them to answer the question.
create or replace function public.has_challenge_access(p_challenge_id text, p_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
    select p_account_id is not null and exists (
        select 1 from public.challenges c
        where c.id = p_challenge_id
          and (
              c.price_cents = 0
              or c.creator_account_id = p_account_id
              or exists (
                  select 1 from public.challenge_entries e
                  where e.challenge_id = c.id
                    and e.account_id = p_account_id
                    and e.status = 'paid'
              )
          )
    )
$$;

grant execute on function public.has_challenge_access(text, uuid) to authenticated, service_role;

-- A submission must match its challenge's media type (no photos in a video challenge, and vice versa).
create or replace function public.validate_submission_media_type()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
    challenge_media_type text;
begin
    select media_type into challenge_media_type from public.challenges where id = new.challenge_id;
    if challenge_media_type is not null and new.media_type is distinct from challenge_media_type then
        raise exception 'This challenge only accepts % submissions.', challenge_media_type;
    end if;
    return new;
end;
$$;

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

-- Editing a comment may only change its text.
-- Row level security can't compare old and new values, so a trigger does it.
-- It also stamps edited_at itself, so the app can't fake or skip the "edited" mark.
create or replace function public.validate_comment_update()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
    if new.id <> old.id
       or new.account_id <> old.account_id
       or new.submission_id <> old.submission_id
       or new.created_at <> old.created_at then
        raise exception 'Only a comment''s text can be changed.';
    end if;
    if new.body is distinct from old.body then
        new.edited_at := now();
    else
        new.edited_at := old.edited_at;
    end if;
    return new;
end;
$$;
