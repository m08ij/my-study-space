-- ============================================================
-- 02a-create-rpc.sql — إضافات فقط (آمنة): تنشئ دوال الوصول إلى spaces. لا تحذف ولا تغيّر جدولاً ولا سياسة.
-- بعد تشغيلها يبقى التطبيق الحالي يعمل كما هو. الخطوة التالية: تفعيل useRpc في التطبيق ثم 02b-lock-table.sql.
-- لا تُنفَّذ تلقائياً — شغّلها بنفسك بعد مراجعة ناتج 01-readonly-audit.sql.
-- ============================================================

create or replace function public.get_space(p_code text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare r jsonb;
begin
  if p_code is null or upper(p_code) !~ '^[A-Z0-9]{6,32}$' then
    raise exception 'invalid code' using errcode = '22023';
  end if;
  select jsonb_build_object('data', s.data, 'updated_at', s.updated_at) into r
  from public.spaces s where s.code = upper(p_code) limit 1;
  return r;   -- null إذا لا يوجد صف
end $$;

create or replace function public.peek_space(p_code text)
returns timestamptz
language plpgsql
security definer
stable
set search_path = public
as $$
declare r timestamptz;
begin
  if p_code is null or upper(p_code) !~ '^[A-Z0-9]{6,32}$' then
    raise exception 'invalid code' using errcode = '22023';
  end if;
  select s.updated_at into r from public.spaces s where s.code = upper(p_code) limit 1;
  return r;
end $$;

create or replace function public.put_space(p_code text, p_data jsonb, p_updated_at timestamptz default now())
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_code is null or upper(p_code) !~ '^[A-Z0-9]{6,32}$' then
    raise exception 'invalid code' using errcode = '22023';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'invalid data' using errcode = '22023';
  end if;
  if pg_column_size(p_data) > 8000000 then
    raise exception 'data too large' using errcode = '54000';
  end if;
  insert into public.spaces (code, data, updated_at)
  values (upper(p_code), p_data, coalesce(p_updated_at, now()))
  on conflict (code) do update set data = excluded.data, updated_at = excluded.updated_at;
end $$;

-- الصلاحيات: تنفيذ الدوال فقط (وليس الجدول)
revoke all on function public.get_space(text) from public;
revoke all on function public.peek_space(text) from public;
revoke all on function public.put_space(text, jsonb, timestamptz) from public;
grant execute on function public.get_space(text) to anon, authenticated;
grant execute on function public.peek_space(text) to anon, authenticated;
grant execute on function public.put_space(text, jsonb, timestamptz) to anon, authenticated;

-- اختبار سريع (استبدل CODE بكود تجريبي، لا تستخدم كودك الحقيقي هنا):
-- select public.get_space('TESTCODE');
