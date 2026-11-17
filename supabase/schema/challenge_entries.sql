-- One row per account per paid challenge: the record of that account buying its way in.
-- Free challenges (price_cents = 0) never get a row; nobody has to pay to enter them.
--
-- Nothing in the app writes here. Only the Stripe edge functions do, using the service role
-- key, which bypasses row level security. That is the whole point: if the app could insert
-- or update these rows, anyone could mark themselves 'paid' from their phone and skip the fee.
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
    -- One attempt per person per challenge, reused as they retry: a second card attempt
    -- updates the same row rather than littering the table with abandoned 'pending' rows
    constraint challenge_entries_account_challenge_key unique (account_id, challenge_id),
    constraint challenge_entries_payment_intent_key unique (stripe_payment_intent_id),
    -- 'refunded' is set by the webhook when a charge is refunded or a dispute is lost,
    -- so the money going back also takes the access back
    constraint challenge_entries_status_check check (status in ('pending', 'paid', 'failed', 'refunded')),
    constraint challenge_entries_amount_cents_check check (amount_cents >= 50),
    -- 'paid' is the only status that means money arrived, so it's the only one with a time
    constraint challenge_entries_paid_at_check check (
        (status = 'paid' and paid_at is not null) or (status <> 'paid' and paid_at is null)
    )
);

alter table public.challenge_entries enable row level security;

create index challenge_entries_challenge_id_idx on public.challenge_entries (challenge_id);

-- Users may read their own entries, which is how the app knows to show
-- "Enter challenge" instead of "Pay 5.00 to enter". Reading is all they may do.
create policy "users view their own entries"
    on public.challenge_entries for select
    to authenticated
    using (account_id = public.current_account_id());

-- Deliberately no insert, update or delete policy for authenticated users.

grant select on table public.challenge_entries to authenticated;
grant all on table public.challenge_entries to service_role;
