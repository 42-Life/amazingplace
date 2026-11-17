-- Video challenges: each challenge is photo-only or video-only, and submissions must match.
-- Existing challenges and submissions become 'photo' through the column defaults.

alter table public.challenges add column media_type text not null default 'photo';
alter table public.challenges add constraint challenges_media_type_check
    check (media_type in ('photo', 'video'));

alter table public.submissions add column media_type text not null default 'photo';
alter table public.submissions add column duration_ms integer;
alter table public.submissions add constraint submissions_media_type_check
    check (media_type in ('photo', 'video'));
-- Videos must say how long they are (up to 30 s, plus a little slack for the recorder); photos have no length
alter table public.submissions add constraint submissions_duration_ms_check check (
    (media_type = 'photo' and duration_ms is null)
    or (media_type = 'video' and duration_ms is not null and duration_ms between 1 and 31000)
);

-- A challenge's media type can't change after it's created, since existing entries would no longer fit.
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
       or (old.creator_account_id is not null and new.creator_account_id is distinct from old.creator_account_id) then
        raise exception 'Challenge identity, creator, radius and media type cannot be changed.';
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

create trigger validate_submission_media_type
    before insert on public.submissions
    for each row execute function public.validate_submission_media_type();
