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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 商品表索引
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

-- 订单表索引
CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- ========== 4. 行级安全（RLS）==========
-- 注意：使用 service_role key 访问时 RLS 不生效，
-- 但为了安全起见，建议启用 RLS 并禁用所有匿名访问

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 不创建任何允许匿名访问的策略
-- 所有数据访问通过 service_role key（后端服务）进行

-- ========== 5. 示例数据（可选，测试用）==========
-- 插入一个测试商品
-- INSERT INTO products (name, description, price) VALUES
-- ('测试商品-月卡', '这是一个测试商品，用于验证发卡流程', 9.90);

-- 插入测试卡密（需要先获取上面插入商品的ID）
-- INSERT INTO cards (product_id, card_type, card_content) VALUES
-- ('商品ID', '激活码', 'TEST-XXXX-XXXX-0001'),
-- ('商品ID', '激活码', 'TEST-XXXX-XXXX-0002');

-- ============================================
-- 执行完成后，请在 Supabase 后台：
-- 1. Settings -> API -> 复制 service_role key
-- 2. 将 service_role key 配置到 Vercel 环境变量 SUPABASE_SERVICE_KEY
-- 3. 将 Project URL 配置到 SUPABASE_URL
-- ============================================
