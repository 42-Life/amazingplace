-- Comments: text that accounts leave under a submission.
-- No limit on how many: an account can comment on any submission, as often as it likes.
--
-- There is no challenge_id here. A comment belongs to a submission, and the submission
-- already says which challenge it is in, so storing it twice could only let the two disagree.
create table public.comments (
    id uuid not null default gen_random_uuid(),
    account_id uuid not null default public.current_account_id(),
    submission_id uuid not null,
    body text not null,
    created_at timestamptz not null default now(),
    -- When the text was last changed; null if it never was. Set by a trigger, not by the app.
    edited_at timestamptz,

    constraint comments_pkey primary key (id),
    constraint comments_account_id_fkey foreign key (account_id)
        references public.accounts (id) on delete cascade,
    -- Deleting a submission deletes its comments with it.
    constraint comments_submission_id_fkey foreign key (submission_id)
        references public.submissions (id) on delete cascade,
    -- No empty or whitespace-only comments, and nothing longer than 500 characters.
    constraint comments_body_check check (char_length(trim(body)) between 1 and 500)
);

-- Comments are always loaded per submission, oldest or newest first.
create index comments_submission_id_created_at_idx on public.comments (submission_id, created_at);
create index comments_account_id_idx on public.comments (account_id);

alter table public.comments enable row level security;

-- Anyone signed in can read comments.
create policy "Signed-in users can view comments"
    on public.comments for select
    to authenticated
    using (true);

-- Users can only comment as themselves.
create policy "users insert their own comments"
    on public.comments for insert
    to authenticated
    with check (account_id = public.current_account_id());

-- Users can delete their own comments.
create policy "users delete their own comments"
    on public.comments for delete
    to authenticated
    using (account_id = public.current_account_id());

-- Users can edit their own comments.
create policy "users update their own comments"
    on public.comments for update
    to authenticated
    using (account_id = public.current_account_id())
    with check (account_id = public.current_account_id());

-- Only the text may change. See validate_comment_update in functions.sql.
create trigger validate_comment_update
    before update on public.comments
    for each row execute function public.validate_comment_update();

-- Supabase gives anon and authenticated every privilege on a new table by default.
-- Take those back first, so the grant below is the whole list.
revoke all on table public.comments from anon, authenticated;
grant select, insert, update, delete on table public.comments to authenticated;
grant all on table public.comments to service_role;
