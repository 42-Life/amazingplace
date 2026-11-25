-- Optional preview photo for a challenge: one picture the creator attaches when making it,
-- so the map card can show the spot before anyone opens the challenge.
-- Existing challenges have none (preview_path stays null).

alter table public.challenges add column preview_path text;

-- Storage bucket for those photos. Public like the photos bucket, so the card can show one
-- from its public link. Capped at 5 MiB and to the formats a phone's photo library hands back.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('challenge-previews', 'challenge-previews', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Users can only upload into, and delete from, their own folder: <auth user id>/<file>
create policy "users upload previews to their own folder"
    on storage.objects for insert to authenticated
    with check (bucket_id = 'challenge-previews' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users delete their own previews"
    on storage.objects for delete to authenticated
    using (bucket_id = 'challenge-previews' and (storage.foldername(name))[1] = (select auth.uid())::text);
