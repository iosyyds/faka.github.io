-- 修复商品表字段长度限制
-- 在Supabase SQL编辑器中执行以下语句

-- 将商品详情字段改为text类型（支持无限长度）
ALTER TABLE products ALTER COLUMN detail TYPE text;

-- 将商品简介字段改为text类型
ALTER TABLE products ALTER COLUMN description TYPE text;

-- 将商品图片字段改为text类型（支持多张图片URL）
ALTER TABLE products ALTER COLUMN image TYPE text;
ALTER TABLE products ALTER COLUMN images TYPE text;

-- 将自定义标签字段改为text类型
ALTER TABLE products ALTER COLUMN tag TYPE text;

-- 验证修改结果
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('detail', 'description', 'image', 'images', 'tag');
