const { getDB } = require('../lib/db');
const {
    getCorsHeaders, success, error,
    parseBody, verifyAdminToken, extractToken
} = require('../lib/security');

/**
 * 网站设置 API
 * GET  /api/settings - 获取网站设置（公开）
 * POST /api/settings - 更新网站设置（需管理员权限）
 */
module.exports = async (req, res) => {
    const corsHeaders = getCorsHeaders(req);
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const db = getDB();

    try {
        // GET：公开获取设置
        if (req.method === 'GET') {
            const settings = await db.getSettings();
            // 只返回前台需要的字段，不暴露敏感信息
            const publicSettings = {
                site_name: settings.site_name || '自动发卡商城',
                site_subtitle: settings.site_subtitle || '',
                site_description: settings.site_description || '',
                site_logo: settings.site_logo || '',
                contact_qq: settings.contact_qq || '',
                contact_wechat: settings.contact_wechat || '',
                contact_email: settings.contact_email || '',
                announcement: settings.announcement || '',
                footer_text: settings.footer_text || '',
                icp_number: settings.icp_number || '',
                payment_tip: settings.payment_tip || '请使用支付宝扫码支付，支付成功后将自动跳转'
            };
            return success(res, { settings: publicSettings });
        }

        // POST：更新设置（需管理员权限）
        if (req.method === 'POST') {
            const token = extractToken(req);
            if (!verifyAdminToken(token)) {
                return error(res, '未授权', 401);
            }
            const body = await parseBody(req);
            const allowedKeys = [
                'site_name', 'site_subtitle', 'site_description', 'site_logo',
                'contact_qq', 'contact_wechat', 'contact_email',
                'announcement', 'footer_text', 'icp_number', 'payment_tip', 'stock_warning'
            ];
            const updates = {};
            for (const key of allowedKeys) {
                if (body[key] !== undefined) {
                    updates[key] = String(body[key]);
                }
            }
            if (Object.keys(updates).length === 0) {
                return error(res, '没有需要更新的设置项');
            }
            await db.updateSettings(updates);
            return success(res, { message: '设置已更新' });
        }

        return error(res, 'Method not allowed', 405);
    } catch (err) {
        console.error('设置操作失败:', err);
        return error(res, err.message || '操作失败', 500);
    }
};
