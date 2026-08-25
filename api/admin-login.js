const { getCorsHeaders, success, error, parseBody, verifyAdminPassword, createAdminToken } = require('../lib/security');

/**
 * POST /api/admin-login
 * 管理后台登录
 */
module.exports = async (req, res) => {
    const corsHeaders = getCorsHeaders(req);
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return error(res, 'Method not allowed', 405);
    }

    try {
        const body = await parseBody(req);
        const { password } = body;

        if (!password) {
            return error(res, '请输入密码');
        }

        if (!verifyAdminPassword(password)) {
            // 不提示具体是密码错误还是未配置，防止信息泄露
            return error(res, '登录失败', 401);
        }

        const token = createAdminToken();
        return success(res, { token });

    } catch (err) {
        console.error('登录失败:', err);
        return error(res, '登录失败', 500);
    }
};
