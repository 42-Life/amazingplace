-- Policies on Supabase's built-in storage tables.
-- The buckets themselves are rows of data, not schema, so they are created in migrations
-- (see 20261117120100_videos_bucket.sql) and don't belong here.

-- Videos bucket: users can only upload into, and delete from, their own folder: <auth user id>/<file>
create policy "users upload videos to their own folder"
    on storage.objects for insert to authenticated
    with check (bucket_id = 'videos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users delete their own videos"
    on storage.objects for delete to authenticated
    using (bucket_id = 'videos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Challenge preview photos: same rule, on the bucket a creator's preview photo goes into
-- (see 20261125120000_challenge_preview_photos.sql)
create policy "users upload previews to their own folder"
    on storage.objects for insert to authenticated
    with check (bucket_id = 'challenge-previews' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users delete their own previews"
    on storage.objects for delete to authenticated
    using (bucket_id = 'challenge-previews' and (storage.foldername(name))[1] = (select auth.uid())::text);
