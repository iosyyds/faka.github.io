const { getDB } = require('../lib/db');
const {
    getCorsHeaders, success, error,
    parseBody, verifyAdminToken, extractToken
} = require('../lib/security');

/**
 * 管理卡密 API
 * POST /api/admin-cards - 批量添加卡密
 *
 * 请求体格式：
 * {
 *   productId: "xxx",
 *   cards: [
 *     { type: "卡号密码", content: "卡号|密码" },
 *     { type: "激活码", content: "XXXX-XXXX-XXXX" }
 *   ]
 * }
 *
 * 也支持纯文本批量导入（每行一个卡密）：
 * {
 *   productId: "xxx",
 *   rawText: "卡密1\n卡密2\n卡密3",
 *   cardType: "default"
 * }
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

    if (req.method !== 'POST') {
        return error(res, 'Method not allowed', 405);
    }

    try {
        const body = await parseBody(req);
        const { productId } = body;

        if (!productId) {
            return error(res, '缺少商品ID');
        }

        let cards = [];

        // 支持两种格式：结构化数组 或 纯文本
        if (body.cards && Array.isArray(body.cards)) {
            cards = body.cards.filter(c => c.content && c.content.trim());
        } else if (body.rawText) {
            const lines = body.rawText.split('\n').filter(line => line.trim());
            const cardType = body.cardType || 'default';
            cards = lines.map(line => ({
                type: cardType,
                content: line.trim()
            }));
        }

        if (cards.length === 0) {
            return error(res, '没有有效的卡密数据');
        }

        // 限制单次导入数量
        if (cards.length > 500) {
            return error(res, '单次导入不能超过500条');
        }

        const db = getDB();

        // 验证商品存在
        const product = await db.getProductById(productId);
        if (!product) {
            return error(res, '商品不存在');
        }

        const result = await db.addCards(productId, cards);

        return success(res, {
            inserted: result.length,
            message: `成功导入 ${result.length} 条卡密`
        });

    } catch (err) {
        console.error('添加卡密失败:', err);
        return error(res, err.message || '添加卡密失败', 500);
    }
};
