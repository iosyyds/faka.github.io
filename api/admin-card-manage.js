const { getDB } = require('../lib/db');
const {
    getCorsHeaders, success, error,
    parseBody, verifyAdminToken, extractToken
} = require('../lib/security');

/**
 * 卡密管理 API（管理员）
 * GET  /api/admin-card-manage?productId=xxx&status=available - 获取卡密列表
 * POST /api/admin-card-manage - 删除卡密
 * body: { action: 'delete', cardId }
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

    try {
        const db = getDB();

        if (req.method === 'GET') {
            const { productId, status } = req.query;
            if (!productId) {
                return error(res, '缺少商品ID');
            }
            const cards = await db.getCardsByProductId(productId, status, 200);
            const stats = await db.getCardStats(productId);
            return success(res, { cards, stats });
        }

        if (req.method === 'POST') {
            const body = await parseBody(req);
            const { action, cardId } = body;

            if (action === 'delete') {
                if (!cardId) return error(res, '缺少卡密ID');
                await db.deleteCard(cardId);
                return success(res, { message: '卡密已删除' });
            }

            if (action === 'clear_available') {
                const { productId } = body;
                if (!productId) return error(res, '缺少商品ID');
                const cards = await db.getCardsByProductId(productId, 'available', 500);
                for (const card of cards) {
                    await db.deleteCard(card.id);
                }
                return success(res, { message: `已清空 ${cards.length} 条未使用卡密` });
            }

            return error(res, '不支持的操作类型');
        }

        return error(res, 'Method not allowed', 405);
    } catch (err) {
        console.error('卡密管理操作失败:', err);
        return error(res, err.message || '操作失败', 500);
    }
};
