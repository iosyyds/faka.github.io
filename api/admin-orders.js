const { getDB } = require('../lib/db');
const {
    getCorsHeaders, success, error,
    verifyAdminToken, extractToken
} = require('../lib/security');

/**
 * GET /api/admin-orders
 * 获取订单列表（管理后台）
 * 支持参数：limit, status
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

    if (req.method !== 'GET') {
        return error(res, 'Method not allowed', 405);
    }

    try {
        const db = getDB();
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
        const status = req.query.status || null;
        const orders = await db.getOrders(limit, status);
        return success(res, { orders });
    } catch (err) {
        console.error('获取订单列表失败:', err);
        return error(res, '获取订单列表失败', 500);
    }
};
