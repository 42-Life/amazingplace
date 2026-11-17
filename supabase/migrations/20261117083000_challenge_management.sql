-- Preserve existing challenges without guessing their creator.
alter table public.challenges add column creator_account_id uuid;
alter table public.challenges alter column creator_account_id set default public.current_account_id();
alter table public.challenges add constraint challenges_creator_account_id_fkey
    foreign key (creator_account_id) references public.accounts (id) on delete cascade;
create index challenges_creator_account_id_idx on public.challenges (creator_account_id);

drop policy "Enable insert for authenticated users only" on public.challenges;
create policy "Enable insert for authenticated users only"
    on public.challenges for insert to authenticated
    with check (creator_account_id = public.current_account_id());

-- Enforce edit rules on the server too, including when a form stays open overnight.
create or replace function public.validate_challenge_edit()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
    if new.id is distinct from old.id
       or new.created_at is distinct from old.created_at
       or new.radius_m is distinct from old.radius_m
       or (old.creator_account_id is not null and new.creator_account_id is distinct from old.creator_account_id) then
        raise exception 'Challenge identity, creator and radius cannot be changed.';
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

