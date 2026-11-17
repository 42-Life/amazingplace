-- Paid challenges: a creator can set an entry fee, and submitting to such a challenge
-- requires a Stripe payment that the stripe-webhook edge function has confirmed.
-- Existing challenges become free (price_cents = 0) through the column default.

alter table public.challenges add column price_cents integer not null default 0;
-- A challenge is either free (0) or costs between 0.50 and 1,000.00 USD.
-- The floor is Stripe's minimum charge for USD; anything under it is rejected by the API.
alter table public.challenges add constraint challenges_price_cents_check check (
    price_cents = 0 or price_cents between 50 and 100000
);

-- Maps an account to its Stripe customer, so someone entering a second paid challenge
-- sees the card they already used instead of typing it in again. Its own table, not a
-- column on `accounts`, because every signed-in user can read every row of `accounts`.
create table public.stripe_customers (
    account_id uuid not null,
    stripe_customer_id text not null,
    created_at timestamptz not null default now(),

    constraint stripe_customers_pkey primary key (account_id),
    constraint stripe_customers_account_id_fkey foreign key (account_id)
        references public.accounts (id) on delete cascade,
    constraint stripe_customers_stripe_customer_id_key unique (stripe_customer_id)
);

alter table public.stripe_customers enable row level security;
-- No policies at all: only the service role, which bypasses row level security, can touch it.
grant all on table public.stripe_customers to service_role;

-- One row per account per paid challenge: the record of that account buying its way in.
-- Only the Stripe edge functions write here, using the service role key. If the app could
-- insert or update these rows, anyone could mark themselves 'paid' and skip the fee.
create table public.challenge_entries (
    id uuid not null default gen_random_uuid(),
    account_id uuid not null,
    challenge_id text not null,
    stripe_payment_intent_id text,
    amount_cents integer not null,
    currency text not null default 'usd',
    status text not null default 'pending',
    created_at timestamptz not null default now(),
    paid_at timestamptz,

    constraint challenge_entries_pkey primary key (id),
    constraint challenge_entries_account_id_fkey foreign key (account_id)
        references public.accounts (id) on delete cascade,
    constraint challenge_entries_challenge_id_fkey foreign key (challenge_id)
        references public.challenges (id) on delete cascade,
    constraint challenge_entries_account_challenge_key unique (account_id, challenge_id),
    constraint challenge_entries_payment_intent_key unique (stripe_payment_intent_id),
    constraint challenge_entries_status_check check (status in ('pending', 'paid', 'failed', 'refunded')),
    constraint challenge_entries_amount_cents_check check (amount_cents >= 50),
    constraint challenge_entries_paid_at_check check (
        (status = 'paid' and paid_at is not null) or (status <> 'paid' and paid_at is null)
    )
);

alter table public.challenge_entries enable row level security;

create index challenge_entries_challenge_id_idx on public.challenge_entries (challenge_id);

create policy "users view their own entries"
    on public.challenge_entries for select
    to authenticated
    using (account_id = public.current_account_id());

-- Deliberately no insert, update or delete policy for authenticated users.

grant select on table public.challenge_entries to authenticated;
grant all on table public.challenge_entries to service_role;

-- May this account submit to this challenge?
-- True for a free challenge, for the creator, and for anyone whose fee Stripe has confirmed.
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

-- Paid challenges only accept submissions from people who paid (and from the creator).
-- Free challenges are unaffected: has_challenge_access returns true for them.
drop policy "users insert their own submissions" on public.submissions;
create policy "users insert their own submissions"
    on public.submissions for insert
    to authenticated
    with check (
        account_id = public.current_account_id()
        and public.has_challenge_access(challenge_id, public.current_account_id())
    );

-- The entry fee is fixed at creation, like the radius and media type. Letting a creator
-- raise it afterwards would change the deal for everyone who already paid to get in.
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
