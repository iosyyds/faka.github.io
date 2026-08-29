-- ============================================
-- 自动发卡商城 - Supabase 数据库建表脚本
-- 在 Supabase SQL Editor 中执行以下代码
-- ============================================

-- 启用 UUID 扩展（如果尚未启用）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========== 1. 商品表 ==========
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT DEFAULT '',
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
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
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
    product_id UUID NOT NULL REFERENCES products(id),
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
('stock_warning', '5')
ON CONFLICT (setting_key) DO NOTHING;

-- ========== 5. 行级安全（RLS）==========
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- 不创建任何允许匿名访问的策略
-- 所有数据访问通过 service_role key（后端服务）进行

-- ============================================
-- 升级说明：如果是从旧版本升级，请执行以下 ALTER 语句
-- ============================================
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_email VARCHAR(100);
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS contact VARCHAR(100) DEFAULT '';
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS remark TEXT DEFAULT '';
-- CREATE TABLE IF NOT EXISTS settings (...);  -- 见上方建表语句
-- ============================================
