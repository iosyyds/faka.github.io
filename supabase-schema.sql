-- ============================================
-- 自动发卡商城 - Supabase 数据库建表脚本
-- 在 Supabase SQL Editor 中执行以下代码
-- 商品ID为自增数字（从1开始）
-- ============================================

-- 启用 UUID 扩展（订单ID仍使用UUID）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========== 订单号自增序列表 ==========
CREATE TABLE IF NOT EXISTS order_sequence (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 1. 商品表（ID为自增数字） ==========
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT DEFAULT '',
    category VARCHAR(50) DEFAULT '全部',
    price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 商品表索引
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_sort ON products(sort_order ASC);

-- ========== 2. 卡密表 ==========
CREATE TABLE IF NOT EXISTS cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    card_type VARCHAR(50) DEFAULT 'default',
    card_content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'used')),
    order_id UUID,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 卡密表索引
CREATE INDEX IF NOT EXISTS idx_cards_product_id ON cards(product_id);
CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status);
CREATE INDEX IF NOT EXISTS idx_cards_product_status ON cards(product_id, status);
CREATE INDEX IF NOT EXISTS idx_cards_order_id ON cards(order_id);

-- ========== 3. 订单表 ==========
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_no VARCHAR(30) NOT NULL UNIQUE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    product_name VARCHAR(200) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
    alipay_trade_no VARCHAR(64),
    buyer_email VARCHAR(100),
    contact VARCHAR(100) DEFAULT '',
    remark TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

-- 订单表索引
CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- ========== 4. 网站设置表 ==========
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入默认设置
INSERT INTO settings (setting_key, setting_value) VALUES
('site_name', '自动发卡商城'),
('site_subtitle', '24小时自动发货 · 扫码即购 · 秒发卡密'),
('site_description', '专业的自动发卡平台，支持支付宝扫码支付，24小时自动发货'),
('site_logo', ''),
('contact_qq', ''),
('contact_wechat', ''),
('contact_email', ''),
('announcement', '欢迎光临！本站24小时自动发货，支付成功后秒发卡密。'),
('footer_text', '© 2026 自动发卡商城 ·  Powered by Vercel + Supabase'),
('icp_number', ''),
('payment_tip', '请使用支付宝扫码支付，支付成功后将自动跳转'),
('stock_warning', '5'),
('admin_password', 'admin123')
ON CONFLICT (setting_key) DO NOTHING;

-- ========== 5. 行级安全（RLS）==========
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- 不创建任何允许匿名访问的策略
-- 所有数据访问通过 service_role key（后端服务）进行

-- ============================================
-- 从UUID商品ID迁移到数字ID的脚本
-- 如果你之前已经创建了表并有数据，请执行以下代码
-- 注意：请先备份数据！
-- ============================================
/*
-- 1. 删除旧的外键约束
ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_product_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_product_id_fkey;

-- 2. 修改商品表ID类型（需要先删除数据或备份）
-- 最简单的方式：清空旧数据，重新开始
TRUNCATE TABLE cards, orders, products RESTART IDENTITY CASCADE;

-- 3. 修改商品表ID为自增数字
ALTER TABLE products ALTER COLUMN id TYPE INTEGER USING (row_number() OVER (ORDER BY created_at));
CREATE SEQUENCE IF NOT EXISTS products_id_seq OWNED BY products.id;
SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));
ALTER TABLE products ALTER COLUMN id SET DEFAULT nextval('products_id_seq');

-- 4. 修改关联表字段类型
ALTER TABLE cards ALTER COLUMN product_id TYPE INTEGER USING product_id::text::integer;
ALTER TABLE orders ALTER COLUMN product_id TYPE INTEGER USING product_id::text::integer;

-- 5. 重新添加外键约束
ALTER TABLE cards ADD CONSTRAINT cards_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE orders ADD CONSTRAINT orders_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id);
*/
