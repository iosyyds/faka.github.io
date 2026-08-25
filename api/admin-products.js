const { getDB } = require('../lib/db');
const {
    getCorsHeaders, success, error,
    parseBody, verifyAdminToken, extractToken
} = require('../lib/security');

/**
 * 管理商品 API
 * GET  /api/admin-products - 获取商品列表
 * POST /api/admin-products - 添加商品
 */
module.exports = async (req, res) => {
    const corsHeaders = getCorsHeaders(req);
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 鉴权
    const token = extractToken(req);
    if (!verifyAdminToken(token)) {
        return error(res, '未授权', 401);
    }

    const db = getDB();

    try {
        if (req.method === 'GET') {
            const products = await db.getProducts();
            return success(res, { products });
        }

        if (req.method === 'POST') {
            const body = await parseBody(req);
            const { name, description, price } = body;

            if (!name || !name.trim()) {
                return error(res, '商品名称不能为空');
            }

            const priceNum = parseFloat(price);
            if (isNaN(priceNum) || priceNum <= 0) {
                return error(res, '价格必须大于0');
            }

            const product = await db.addProduct(
                name.trim(),
                (description || '').trim(),
                priceNum
            );

            return success(res, { product });
        }

        return error(res, 'Method not allowed', 405);

    } catch (err) {
        console.error('管理商品失败:', err);
        return error(res, err.message || '操作失败', 500);
    }
};
