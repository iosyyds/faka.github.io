-- ============================================
-- 甜甜发卡平台 - 数据库初始化脚本
-- 在Supabase SQL编辑器中执行
-- ============================================

-- 1. 商品表
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  detail TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  original_price DECIMAL(10,2),
  category VARCHAR(100) DEFAULT '全部',
  image TEXT,
  images TEXT,
  tag VARCHAR(100),
  stock INTEGER DEFAULT 0,
  sales INTEGER DEFAULT 0,
  sort INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 卡密表
CREATE TABLE IF NOT EXISTS cards (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  card_content TEXT NOT NULL,
  card_type VARCHAR(50) DEFAULT 'default',
  status VARCHAR(20) DEFAULT 'available', -- available/used/disabled
  order_id BIGINT,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 订单表
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  order_no VARCHAR(50) UNIQUE NOT NULL,
  product_id BIGINT NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending/paid/failed/refunded
  alipay_trade_no VARCHAR(100),
  remark TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 系统设置表
CREATE TABLE IF NOT EXISTS settings (
  id BIGSERIAL PRIMARY KEY,
  site_name VARCHAR(100) DEFAULT '甜甜发卡',
  site_description TEXT,
  site_logo TEXT,
  logo_text VARCHAR(10) DEFAULT '甜',
  favicon TEXT,
  banner_title VARCHAR(100),
  banner_subtitle VARCHAR(200),
  banner_tag1 VARCHAR(50),
  banner_tag2 VARCHAR(50),
  banner_tag3 VARCHAR(50),
  banner_image TEXT,
  footer_desc TEXT,
  footer_link1_text VARCHAR(50),
  footer_link1_url TEXT,
  footer_link2_text VARCHAR(50),
  footer_link2_url TEXT,
  footer_link3_text VARCHAR(50),
  footer_link3_url TEXT,
  icp_number VARCHAR(100),
  terms_content TEXT,
  privacy_content TEXT,
  admin_password VARCHAR(200),
  smtp_host VARCHAR(100),
  smtp_port INTEGER,
  smtp_user VARCHAR(100),
  smtp_pass VARCHAR(200),
  smtp_from_name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 索引优化
-- ============================================
CREATE INDEX IF NOT EXISTS idx_cards_product_status ON cards(product_id, status);
CREATE INDEX IF NOT EXISTS idx_cards_order ON cards(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- ============================================
-- 插入默认设置
-- ============================================
INSERT INTO settings (site_name, site_description, logo_text, banner_title, banner_subtitle, banner_tag1, banner_tag2, banner_tag3, footer_desc)
VALUES (
  '甜甜发卡',
  '24小时自动发卡平台，支付宝支付，自动秒发卡密',
  '甜',
  '虚拟商品·即拍即发',
  '支付宝多渠道支付，付款后自动秒发卡密',
  '自动秒发',
  '加密存储',
  '多渠道支付',
  '本站仅出售合规虚拟商品，下单即视为同意服务条款。'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 示例商品（可选，删除前请先添加卡密）
-- ============================================
-- INSERT INTO products (name, description, price, category, tag) VALUES
-- ('示例商品-会员月卡', '这是一个示例商品，购买后自动发卡密', 9.90, '会员账号', '热销'),
-- ('示例商品-软件授权', '软件激活码，永久使用', 29.90, '软件授权', '新品');

-- ============================================
-- 验证表是否创建成功
-- ============================================
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('products', 'cards', 'orders', 'settings');
