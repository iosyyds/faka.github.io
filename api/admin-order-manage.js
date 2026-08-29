const { getDB } = require('../lib/db');
const {
    getCorsHeaders, success, error,
    parseBody, verifyAdminToken, extractToken
} = require('../lib/security');

/**
 * 订单管理 API（管理员）
 * POST /api/admin-order-manage
 * body: { action: 'mark_paid'|'mark_failed'|'delete'|'update_remark', orderId, remark }
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

    if (req.method !== 'POST') {
        return error(res, 'Method not allowed', 405);
    }

    try {
        const body = await parseBody(req);
        const { action, orderId, remark } = body;

        if (!orderId) {
            return error(res, '缺少订单ID');
        }

        const db = getDB();
        const order = await db.getOrderById(orderId);
        if (!order) {
            return error(res, '订单不存在');
        }

        switch (action) {
            case 'mark_paid': {
                if (order.status !== 'pending') {
                    return error(res, '只有待支付订单才能标记为已支付');
                }
                const updated = await db.manualMarkPaid(orderId);
                if (updated) {
                    // 手动发卡
                    try {
                        await db.consumeCards(order.product_id, order.quantity, updated.id);
                    } catch (cardErr) {
                        console.error('手动发卡失败:', cardErr);
                        return error(res, '订单状态已更新，但发卡失败：' + cardErr.message);
                    }
                }
                return success(res, { message: '订单已标记为已支付并完成发卡' });
            }

            case 'mark_failed': {
                if (order.status !== 'pending') {
                    return error(res, '只有待支付订单才能标记为失败');
                }
                await db.markOrderFailed(orderId);
                return success(res, { message: '订单已标记为失败' });
            }

            case 'delete': {
                await db.deleteOrder(orderId);
                return success(res, { message: '订单已删除' });
            }

            case 'update_remark': {
                await db.updateOrderRemark(orderId, remark || '');
                return success(res, { message: '备注已更新' });
            }

            default:
                return error(res, '不支持的操作类型');
        }
    } catch (err) {
        console.error('订单管理操作失败:', err);
        return error(res, err.message || '操作失败', 500);
    }
};
