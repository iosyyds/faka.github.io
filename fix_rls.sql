-- ============================================
-- 修复Supabase RLS策略
-- 使用service_role key时RLS会自动绕过，
-- 但如果配置有问题，禁用RLS可以确保正常运行
-- ============================================

-- 禁用所有表的RLS（使用service_role key时推荐）
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- 验证是否禁用成功
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('products', 'cards', 'orders', 'settings');
