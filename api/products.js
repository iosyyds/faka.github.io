const { getDB } = require('../lib/db');
const { getCorsHeaders, success, error } = require('../lib/security');

/**
 * GET /api/products
 * 获取商品列表（含实时库存）
 */
module.exports = async (req, res) => {
    // CORS
    const corsHeaders = getCorsHeaders(req);
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return error(res, 'Method not allowed', 405);
    }

    try {
        const db = getDB();
        const products = await db.getProducts();

        // 只返回前端需要的字段，不暴露内部ID等敏感信息
        const safeProducts = products.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            category: p.category || '全部',
            price: p.price,
            stock: p.stock
        }));

        return success(res, { products: safeProducts });
    } catch (err) {
        console.error('获取商品列表失败:', err);
        return error(res, '获取商品列表失败', 500);
    }
};
