-- ============================================================
-- 04-storage-own-folder.sql — إصلاح حذف الملفات بعد القفل، بدون إعادة السرد المفتوح.
-- المشكلة: حذف التخزين يتطلب صلاحية SELECT على الصف، وقد أُسقطت سياسة القراءة بالقفل، فصار الحذف «ينجح» دون حذف فعلي.
-- الحل: التطبيق يرسل ترويسة x-space-code برمز المستخدم، والسياسات تسمح بقراءة/حذف/رفع ملفات مجلد ذلك الرمز فقط.
--   - من لا يرسل الترويسة (أو يرسل رمزاً آخر) لا يرى ولا يحذف شيئاً، ولا يستطيع سرد مجلدات الرموز الأخرى.
--   - إن لم يمرّر خادم التخزين الترويسة للسياسة فالنتيجة تبقى «لا وصول» (آمن بالافتراض).
-- قابل للتراجع: يُسقط سياسات هذا الملف ويُرجع files_delete_scoped (أسفل الملف).
-- ============================================================

create or replace function public.req_space_code() returns text
language sql stable as $$
  select upper(nullif(nullif(current_setting('request.headers', true), '')::json ->> 'x-space-code', ''))
$$;
grant execute on function public.req_space_code() to anon, authenticated;

drop policy if exists "files_select_own" on storage.objects;
drop policy if exists "files_delete_scoped" on storage.objects;
drop policy if exists "files_delete_own" on storage.objects;
drop policy if exists "files_insert_scoped" on storage.objects;
drop policy if exists "files_insert_own" on storage.objects;

create policy "files_select_own" on storage.objects for select to public
  using (bucket_id = 'course-files' and public.req_space_code() ~ '^[A-Z0-9]{6,32}$'
         and left(name, length(public.req_space_code()) + 1) = public.req_space_code() || '/');

create policy "files_delete_own" on storage.objects for delete to public
  using (bucket_id = 'course-files' and public.req_space_code() ~ '^[A-Z0-9]{6,32}$'
         and left(name, length(public.req_space_code()) + 1) = public.req_space_code() || '/');

create policy "files_insert_own" on storage.objects for insert to public
  with check (bucket_id = 'course-files' and name ~ '^[A-Za-z0-9]{6,32}/courses/[A-Za-z0-9_-]{1,80}/[^/]+$'
              and public.req_space_code() ~ '^[A-Z0-9]{6,32}$'
              and left(name, length(public.req_space_code()) + 1) = public.req_space_code() || '/');

-- تحقق:
select policyname, cmd from pg_policies where schemaname = 'storage' and tablename = 'objects' order by 1;

-- ===== تراجع (شغّله فقط إن أردت العودة لحالة 03-lock-all) =====
-- drop policy if exists "files_select_own" on storage.objects;
-- drop policy if exists "files_delete_own" on storage.objects;
-- drop policy if exists "files_insert_own" on storage.objects;
-- create policy "files_insert_scoped" on storage.objects for insert to public with check (bucket_id = 'course-files' and name ~ '^[A-Za-z0-9]{6,32}/courses/[A-Za-z0-9_-]{1,80}/[^/]+$');
-- create policy "files_delete_scoped" on storage.objects for delete to public using (bucket_id = 'course-files' and name ~ '^[A-Za-z0-9]{6,32}/courses/[A-Za-z0-9_-]{1,80}/[^/]+$');
