-- ============================================================
-- 02c-rollback.sql — يرجّع الوصول المباشر لجدول spaces كما كان (مفتوح) إذا حصلت مشكلة بعد 02b.
-- ملاحظة: هذا يعيد الوضع غير الآمن الأصلي؛ استخدمه فقط للتراجع المؤقت.
-- ============================================================
grant select, insert, update on table public.spaces to anon, authenticated;
create policy "spaces_open_rollback" on public.spaces for all to anon, authenticated using (true) with check (true);
-- (اختياري) لإبقاء RLS مفعّلاً مع السياسة المفتوحة لا شيء إضافي مطلوب.
