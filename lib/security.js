const crypto = require('crypto');

/**
 * 安全工具模块
 */

/**
 * 生成不可预测的订单号
 * 格式：年月日时分秒 + 6位随机十六进制 + 4位随机数
 * 总长度24位，足够唯一且不可遍历
 */
function generateOrderNo() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6位十六进制
    const randomNum = Math.floor(1000 + Math.random() * 9000); // 4位数字
    return `${dateStr}${randomHex}${randomNum}`;
}

/**
 * 验证管理后台密码
 * 使用常量时间比较，防止时序攻击
 */
function verifyAdminPassword(input) {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) return false;
    if (!input) return false;

    const inputBuf = Buffer.from(input);
    const passBuf = Buffer.from(adminPassword);

    if (inputBuf.length !== passBuf.length) return false;
    return crypto.timingSafeEqual(inputBuf, passBuf);
}

/**
 * 简单的内存 Token 认证（管理后台）
 * 注意：Vercel Serverless 是无状态的，多实例下内存不共享
 * 生产环境建议用 JWT 或 Redis，这里用签名 Token 方案
 */
function createAdminToken() {
    const secret = process.env.ADMIN_PASSWORD || 'default-secret-change-me';
    const timestamp = Date.now();
    const payload = `${timestamp}`;
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return Buffer.from(`${payload}.${signature}`).toString('base64');
}

function verifyAdminToken(token) {
    if (!token) return false;
    try {
        const secret = process.env.ADMIN_PASSWORD || 'default-secret-change-me';
        const decoded = Buffer.from(token, 'base64').toString();
        const [timestamp, signature] = decoded.split('.');

        // Token 有效期 24 小时
        const age = Date.now() - parseInt(timestamp, 10);
        if (age > 24 * 60 * 60 * 1000) return false;

        const expected = crypto.createHmac('sha256', secret).update(timestamp).digest('hex');
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch (e) {
        return false;
    }
}

/**
 * 从请求中提取 Bearer Token
 */
function extractToken(req) {
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer ')) {
        return auth.slice(7);
    }
    return null;
}

/**
 * CORS 响应头
 * 只允许配置的域名访问
 */
function getCorsHeaders(req) {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());
    const origin = req.headers.origin || '';

    let allowOrigin = '';
    if (allowedOrigins.includes('*')) {
        allowOrigin = '*';
    } else if (allowedOrigins.includes(origin)) {
        allowOrigin = origin;
    }

    return {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
    };
}

/**
 * 统一 JSON 响应
 */
function jsonResponse(res, statusCode, body) {
    res.status(statusCode).json(body);
}

/**
 * 成功响应
 */
function success(res, data = {}) {
    jsonResponse(res, 200, { success: true, ...data });
}

/**
 * 错误响应
 */
function error(res, message, statusCode = 400) {
    jsonResponse(res, statusCode, { success: false, message });
}

/**
 * 解析请求体（兼容 Vercel Serverless）
 */
async function parseBody(req) {
    if (req.body) return req.body;
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch {
                resolve({});
            }
        });
    });
}

module.exports = {
    generateOrderNo,
    verifyAdminPassword,
    createAdminToken,
    verifyAdminToken,
    extractToken,
    getCorsHeaders,
    jsonResponse,
    success,
    error,
    parseBody
};
