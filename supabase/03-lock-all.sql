-- ============================================================
-- 03-lock-all.sql — القفل النهائي (spaces + تخزين الملفات). جاهز للتشغيل بـ Supabase SQL Editor.
-- الحالة قبل التشغيل (تحقّقت منها): دوال get_space/put_space/peek_space/list_course_files موجودة ومُختبرة،
--   وتطبيق الإصدار 106 المنشور يستخدمها (rpcMode = 'rpc') للقراءة والكتابة وسرد الملفات والرفع والحذف.
-- نسخة احتياطية جاهزة: public.spaces_backup_20261004 (78 صفاً، مقفلة).
-- الأثر: أي وصول مباشر لجدول spaces أو سرد/تعديل ملفات الـ bucket من مفتاح anon يُرفض.
--        نسخ التطبيق القديمة (≤105) تتوقف مزامنتها حتى تُحدَّث؛ بياناتها المحلية سليمة.
-- التراجع: 03-rollback.sql
-- ============================================================

-- 1) spaces: لا وصول مباشر (الدوال security definer فقط)
do $$ declare r record; begin
  for r in select policyname from pg_policies where schemaname='public' and tablename='spaces' loop
    execute format('drop policy %I on public.spaces', r.policyname);
  end loop;
end $$;
alter table public.spaces enable row level security;
revoke all on table public.spaces from anon, authenticated;

-- 2) storage.objects (bucket course-files): لا سرد (كان يكشف كل رموز المزامنة) ولا تعديل؛
--    الرفع والحذف فقط لمسارات بصيغة CODE/courses/ID/ملف. القراءة بالرابط المباشر تبقى (الـ bucket عام)، والسرد عبر list_course_files.
drop policy if exists "Public access" on storage.objects;
drop policy if exists "files_read" on storage.objects;
drop policy if exists "files_update" on storage.objects;
drop policy if exists "files_insert" on storage.objects;
drop policy if exists "files_delete" on storage.objects;
create policy "files_insert_scoped" on storage.objects for insert to public
  with check (bucket_id = 'course-files' and name ~ '^[A-Za-z0-9]{6,32}/courses/[A-Za-z0-9_-]{1,80}/[^/]+$');
create policy "files_delete_scoped" on storage.objects for delete to public
  using (bucket_id = 'course-files' and name ~ '^[A-Za-z0-9]{6,32}/courses/[A-Za-z0-9_-]{1,80}/[^/]+$');

-- تحقق:
select relrowsecurity from pg_class where oid = 'public.spaces'::regclass;
select grantee, privilege_type from information_schema.role_table_grants where table_schema='public' and table_name='spaces' and grantee in ('anon','authenticated');
select policyname, cmd from pg_policies where schemaname='storage' and tablename='objects';
