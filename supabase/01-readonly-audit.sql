-- ============================================================
-- 01-readonly-audit.sql — استعلامات قراءة فقط (لا تغيّر أي شيء)
-- شغّلها في Supabase Dashboard → SQL Editor، وأرسل الناتج (بدون بيانات المستخدمين) قبل أي تغيير.
-- ============================================================

-- 1) هل RLS مفعّل على الجداول؟
select n.nspname as schema, c.relname as table, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r' and n.nspname in ('public','storage')
order by 1, 2;

-- 2) السياسات الحالية (جدول spaces وطبقة storage)
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename = 'spaces') or schemaname = 'storage'
order by schemaname, tablename, policyname;

-- 3) صلاحيات anon/authenticated على الجداول
select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where grantee in ('anon','authenticated') and table_schema in ('public','storage')
order by table_schema, table_name, grantee, privilege_type;

-- 4) أعمدة جدول spaces (للتأكد من البنية: code / data / updated_at ...)
select column_name, data_type, is_nullable, column_default
from information_schema.columns where table_schema = 'public' and table_name = 'spaces' order by ordinal_position;

-- 5) المفاتيح والقيود على spaces
select conname, contype, pg_get_constraintdef(oid) as definition from pg_constraint where conrelid = 'public.spaces'::regclass;

-- 6) إعدادات bucket الملفات (عام/خاص، حد الحجم، الأنواع المسموحة)
select id, name, public, file_size_limit, allowed_mime_types from storage.buckets;

-- 7) دوال public الموجودة (هل get_space/put_space/peek_space موجودة أصلاً؟)
select p.proname, pg_get_function_identity_arguments(p.oid) as args, p.prosecdef as security_definer
from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' order by 1;

-- 8) عدد الصفوف فقط (بدون عرض أي بيانات)
select count(*) as spaces_rows from public.spaces;
select bucket_id, count(*) as objects from storage.objects group by bucket_id;
