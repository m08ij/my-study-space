-- ============================================================
-- 03-rollback.sql — يعيد الوصول المباشر كما كان قبل 03-lock-all.sql (وضع غير آمن؛ للتراجع المؤقت فقط)
-- ============================================================
grant select, insert, update, delete on table public.spaces to anon, authenticated;
create policy "spaces_open_rollback" on public.spaces for all to public using (true) with check (true);

drop policy if exists "files_insert_scoped" on storage.objects;
drop policy if exists "files_delete_scoped" on storage.objects;
create policy "files_read" on storage.objects for select to public using (bucket_id = 'course-files');
create policy "files_insert" on storage.objects for insert to public with check (bucket_id = 'course-files');
create policy "files_update" on storage.objects for update to public using (bucket_id = 'course-files');
create policy "files_delete" on storage.objects for delete to public using (bucket_id = 'course-files');
