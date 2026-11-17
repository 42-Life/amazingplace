-- Storage bucket for video challenge submissions.
-- Public like the photos bucket, so the app can play videos from their public link.
-- Capped at 50 MiB and to the formats phones record: iOS saves .mov, Android saves .mp4.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', true, 52428800, array['video/mp4', 'video/quicktime'])
on conflict (id) do nothing;

-- Users can only upload into, and delete from, their own folder: <auth user id>/<file>
create policy "users upload videos to their own folder"
    on storage.objects for insert to authenticated
    with check (bucket_id = 'videos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users delete their own videos"
    on storage.objects for delete to authenticated
    using (bucket_id = 'videos' and (storage.foldername(name))[1] = (select auth.uid())::text);
