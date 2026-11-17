-- Maps an account to its Stripe customer, so someone entering a second paid challenge
-- sees the card they already used instead of typing it in again.
--
-- This lives in its own table rather than as a column on `accounts` because every signed-in
-- user can read every row of `accounts`. A Stripe customer id is not a secret, but it is
-- not anyone else's business either, and a table with no policies keeps it that way.
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

-- No policies at all: only the service role, which bypasses row level security,
-- can read or write this table. That role only exists inside the edge functions.

grant all on table public.stripe_customers to service_role;
