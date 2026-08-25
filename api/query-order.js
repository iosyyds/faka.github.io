const { getDB } = require('../lib/db');
const { getCorsHeaders, success, error } = require('../lib/security');

/**
 * GET /api/query-order?orderNo=xxx
 * 查询订单状态
 *
 * 【安全要点】
 * 1. 只有 status === 'paid' 时才返回卡密内容
 * 2. pending/failed 状态不返回任何卡密信息
 * 3. 订单号不可预测（生成时已保证），防止遍历
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
        const { orderNo } = req.query;

        if (!orderNo) {
            return error(res, '缺少订单号');
        }

        // 订单号格式校验（防止SQL注入等，虽然Supabase参数化已防，但多一层）
        if (!/^[A-Z0-9]{20,30}$/.test(orderNo)) {
            return error(res, '订单号格式错误');
        }

        const db = getDB();
        const order = await db.getOrderByNo(orderNo);

        if (!order) {
            return error(res, '订单不存在', 404);
        }

        // 基础订单信息（所有状态都返回）
        const orderInfo = {
            order_no: order.order_no,
            product_name: order.product_name,
            quantity: order.quantity,
            amount: order.amount,
            status: order.status,
            created_at: order.created_at
        };

        // 【关键】只有已支付状态才返回卡密
        if (order.status === 'paid') {
            const cards = await db.getCardsByOrderId(order.id);
            orderInfo.cards = cards.map(c => ({
                card_type: c.card_type,
                card_content: c.card_content
            }));
            orderInfo.paid_at = order.paid_at;
        }

        return success(res, { order: orderInfo });

    } catch (err) {
        console.error('查询订单失败:', err);
        return error(res, '查询订单失败', 500);
    }
};
