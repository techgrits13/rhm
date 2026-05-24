-- =========================================================================
-- SUPER IMPORTANT: STORAGE BUCKET ROW-LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- First, ensure the buckets actually exist if they haven't been created manually yet
insert into storage.buckets (id, name, public) 
values 
  ('breaking-news', 'breaking-news', true),
  ('tracks', 'tracks', true),
  ('covers', 'covers', true)
on conflict (id) do nothing;

-- 1. Allow EVERYONE to read (download) the files from these buckets
create policy "Allow Public READ access" 
on storage.objects for select
using ( bucket_id in ('breaking-news', 'tracks', 'covers') );

-- 2. Allow Admin/App to INSERT (upload) new files into these buckets
-- Warning: Because you are handling admin auth locally without Supabase Auth,
-- we must temporarily allow public inserts so your app's Anon Key can upload files.
create policy "Allow Public INSERT access" 
on storage.objects for insert
with check ( bucket_id in ('breaking-news', 'tracks', 'covers') );

-- 3. Allow Admin/App to UPDATE/OVERWRITE files
create policy "Allow Public UPDATE access" 
on storage.objects for update
using ( bucket_id in ('breaking-news', 'tracks', 'covers') );

-- 4. Allow Admin/App to DELETE files
create policy "Allow Public DELETE access" 
on storage.objects for delete
using ( bucket_id in ('breaking-news', 'tracks', 'covers') );
