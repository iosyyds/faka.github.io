-- ============================================
-- 同步商品库存（根据cards表实际可用卡密数量更新products.stock）
-- 执行一次即可，之后系统会自动维护stock字段
-- ============================================

-- 更新每个商品的库存为实际可用卡密数量
UPDATE products p
SET stock = (
    SELECT COUNT(*) 
    FROM cards c 
    WHERE c.product_id = p.id 
    AND c.status = 'available'
);

-- 验证结果
SELECT p.id, p.name, p.stock as "数据库stock", 
       (SELECT COUNT(*) FROM cards c WHERE c.product_id = p.id AND c.status = 'available') as "实际可用卡密"
FROM products p
ORDER BY p.id;
