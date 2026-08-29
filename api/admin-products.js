const { getDB } = require('../lib/db');
const {
    getCorsHeaders, success, error,
    parseBody, verifyAdminToken, extractToken
} = require('../lib/security');

/**
 * 管理商品 API
 * GET    /api/admin-products - 获取商品列表（含下架）
 * POST   /api/admin-products - 添加商品
 * PUT    /api/admin-products?id=xxx - 编辑商品
 * DELETE /api/admin-products?id=xxx - 删除商品
 */
module.exports = async (req, res) => {
    const corsHeaders = getCorsHeaders(req);
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const token = extractToken(req);
    if (!verifyAdminToken(token)) {
        return error(res, '未授权', 401);
    }

    const db = getDB();

    try {
        // GET：获取商品列表（含下架商品）
        if (req.method === 'GET') {
            const products = await db.getProducts(true);
            return success(res, { products });
        }

        // POST：添加商品
        if (req.method === 'POST') {
            const body = await parseBody(req);
            const { name, description, price, sort_order, category } = body;
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
                priceNum,
                parseInt(sort_order, 10) || 0,
                (category || '全部').trim()
            );
            return success(res, { product });
        }

        // PUT：编辑商品
        if (req.method === 'PUT') {
            const { id } = req.query;
            if (!id) return error(res, '缺少商品ID');
            const body = await parseBody(req);
            const updates = {};
            if (body.name !== undefined) updates.name = body.name.trim();
            if (body.description !== undefined) updates.description = body.description;
            if (body.price !== undefined) {
                const priceNum = parseFloat(body.price);
                if (isNaN(priceNum) || priceNum <= 0) {
                    return error(res, '价格必须大于0');
                }
                updates.price = priceNum;
            }
            if (body.sort_order !== undefined) updates.sort_order = parseInt(body.sort_order, 10) || 0;
            if (body.category !== undefined) updates.category = body.category || '全部';
            if (body.is_active !== undefined) updates.is_active = body.is_active;
            if (Object.keys(updates).length === 0) {
                return error(res, '没有需要更新的字段');
            }
            const product = await db.updateProduct(id, updates);
            return success(res, { product });
        }

        // DELETE：删除商品
        if (req.method === 'DELETE') {
            const { id } = req.query;
            if (!id) return error(res, '缺少商品ID');
            await db.deleteProduct(id);
            return success(res, { message: '商品已删除（关联卡密也会被删除）' });
        }

        return error(res, 'Method not allowed', 405);
    } catch (err) {
        console.error('管理商品失败:', err);
        return error(res, err.message || '操作失败', 500);
    }
};
