-- ============================================================
-- 02b-lock-table.sql — ⚠️ خطوة قفل الجدول (تغيّر صلاحيات). لا تشغّلها إلا بعد:
--   1) تشغيل 02a-create-rpc.sql بنجاح،
--   2) تفعيل useRpc في التطبيق ونشره، والتأكد (SB.rpcMode() === 'rpc') أن المزامنة تعمل عبر الدوال على جهازيك،
--   3) أخذ نسخة احتياطية: Dashboard → Database → Backups (أو تصدير جدول spaces).
-- تأثيرها: أي قراءة/كتابة مباشرة على الجدول من مفتاح anon تُرفض. النسخ القديمة من التطبيق (قبل useRpc) تتوقف مزامنتها
-- حتى تُحدَّث — بياناتها المحلية تبقى سليمة.
-- التراجع: 02c-rollback.sql
-- ============================================================

-- إسقاط كل السياسات الحالية على spaces (أسماؤها غير معروفة مسبقاً)
do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'spaces' loop
    execute format('drop policy %I on public.spaces', r.policyname);
  end loop;
end $$;

alter table public.spaces enable row level security;      -- بدون أي سياسة = لا وصول مباشر
revoke all on table public.spaces from anon, authenticated;

-- التحقق (يجب أن يرجع RLS مفعّلاً وبلا أي privilege لـ anon):
select relrowsecurity from pg_class where oid = 'public.spaces'::regclass;
select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and table_name = 'spaces' and grantee in ('anon','authenticated');
