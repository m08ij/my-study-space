-- 01b-audit-single.sql — قراءة فقط. كل نتائج التدقيق بحقل JSON واحد (محرر Supabase يعرض نتيجة استعلام واحد فقط).
-- لا يعرض أي بيانات مستخدمين: بنية وسياسات وصلاحيات وأعداد فقط.
select jsonb_build_object(
  'rls', (select jsonb_agg(jsonb_build_object('table', n.nspname || '.' || c.relname, 'rls', c.relrowsecurity, 'forced', c.relforcerowsecurity))
          from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relkind = 'r' and n.nspname in ('public','storage')),
  'policies', (select jsonb_agg(jsonb_build_object('schema', schemaname, 'table', tablename, 'policy', policyname, 'permissive', permissive, 'roles', roles, 'cmd', cmd, 'using', qual, 'check', with_check))
          from pg_policies where (schemaname = 'public' and tablename = 'spaces') or schemaname = 'storage'),
  'grants', (select jsonb_agg(jsonb_build_object('table', table_schema || '.' || table_name, 'grantee', grantee, 'privilege', privilege_type))
          from information_schema.role_table_grants
          where grantee in ('anon','authenticated') and (table_schema = 'public' or (table_schema = 'storage' and table_name in ('objects','buckets')))),
  'spaces_columns', (select jsonb_agg(jsonb_build_object('col', column_name, 'type', data_type, 'nullable', is_nullable))
          from information_schema.columns where table_schema = 'public' and table_name = 'spaces'),
  'spaces_constraints', (select jsonb_agg(jsonb_build_object('name', conname, 'type', contype, 'def', pg_get_constraintdef(oid)))
          from pg_constraint where conrelid = 'public.spaces'::regclass),
  'buckets', (select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'public', public, 'size_limit', file_size_limit, 'mime', allowed_mime_types)) from storage.buckets),
  'public_functions', (select jsonb_agg(jsonb_build_object('name', p.proname, 'security_definer', p.prosecdef))
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'),
  'counts', jsonb_build_object(
          'spaces', (select count(*) from public.spaces),
          'objects_by_bucket', (select jsonb_agg(jsonb_build_object('bucket', bucket_id, 'objects', c)) from (select bucket_id, count(*) c from storage.objects group by 1) x))
) as audit;
