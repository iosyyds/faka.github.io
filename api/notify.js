const { getDB } = require('../lib/db');
const Alipay = require('../lib/alipay');
const { success, error } = require('../lib/security');

/**
 * POST /api/notify
 * 支付宝异步回调通知
 *
 * 【安全要点 - 核心防线】
 * 1. 严格验证支付宝 RSA2 签名（防伪造回调）
 * 2. 验证 app_id 与配置一致（防其他应用回调）
 * 3. 验证交易状态为 TRADE_SUCCESS（防未支付回调）
 * 4. 验证回调金额 === 订单金额（防0元购/改价攻击）
 * 5. 订单状态幂等校验：只有 pending 才能变 paid（防重复发卡）
 * 6. 卡密消费在状态更新之后，确保只有支付成功才发卡
 */
module.exports = async (req, res) => {
    // 支付宝回调返回的是纯文本，不是JSON
    res.setHeader('Content-Type', 'text/plain;charset=utf-8');

    if (req.method !== 'POST') {
        res.status(405).send('fail');
        return;
    }

    try {
        // 解析支付宝表单数据
        const params = await parseFormBody(req);

        console.log('收到支付宝回调:', JSON.stringify({
            out_trade_no: params.out_trade_no,
            trade_no: params.trade_no,
            trade_status: params.trade_status,
            total_amount: params.total_amount,
            app_id: params.app_id
        }));

        // ========== 安全校验1：验证签名 ==========
        const alipay = new Alipay({
            appId: process.env.ALIPAY_APP_ID,
            privateKey: process.env.ALIPAY_PRIVATE_KEY,
            publicKey: process.env.ALIPAY_PUBLIC_KEY,
            notifyUrl: process.env.ALIPAY_NOTIFY_URL
        });

        const signValid = alipay.verify(params);
        if (!signValid) {
            console.error('回调签名验证失败:', params.out_trade_no);
            res.status(400).send('fail');
            return;
        }

        // ========== 安全校验2：验证 app_id ==========
        if (params.app_id && params.app_id !== process.env.ALIPAY_APP_ID) {
            console.error(`回调 app_id 不匹配: 收到 ${params.app_id}, 期望 ${process.env.ALIPAY_APP_ID}`);
            res.status(400).send('fail');
            return;
        }

        // ========== 安全校验3：验证交易状态 ==========
        if (params.trade_status !== 'TRADE_SUCCESS') {
            // 非成功状态（如WAIT_BUYER_PAY），忽略但返回success避免支付宝重试
            console.log(`交易状态非成功: ${params.trade_status}, 订单: ${params.out_trade_no}`);
            res.send('success');
            return;
        }

        const orderNo = params.out_trade_no;
        const alipayTradeNo = params.trade_no;
        const totalAmount = parseFloat(params.total_amount);

        // ========== 安全校验4：查询订单并验证金额 ==========
        const db = getDB();
        const order = await db.getOrderByNo(orderNo);

        if (!order) {
            console.error('回调订单不存在:', orderNo);
            res.status(404).send('fail');
            return;
        }

        // 金额严格比对（防止0元购、改价攻击）
        if (Math.abs(totalAmount - order.amount) > 0.001) {
            console.error(`回调金额不匹配! 订单: ${orderNo}, 订单金额: ${order.amount}, 回调金额: ${totalAmount}`);
            res.status(400).send('fail');
            return;
        }

        // ========== 安全校验5：订单状态幂等校验 ==========
        if (order.status === 'paid') {
            // 已经处理过，直接返回success（幂等）
            console.log('订单已支付，跳过重复处理:', orderNo);
            res.send('success');
            return;
        }

        if (order.status !== 'pending') {
            console.error(`订单状态异常: ${orderNo}, 状态: ${order.status}`);
            res.status(400).send('fail');
            return;
        }

        // ========== 核心：标记订单已支付 + 发放卡密 ==========
        // markOrderPaid 内部使用条件更新（只更新pending状态），保证原子性和幂等
        const updatedOrder = await db.markOrderPaid(orderNo, alipayTradeNo);

        if (!updatedOrder) {
            // 并发情况下可能被其他请求先处理了，再次查询确认
            const recheck = await db.getOrderByNo(orderNo);
            if (recheck && recheck.status === 'paid') {
                console.log('订单已被并发处理:', orderNo);
                res.send('success');
                return;
            }
            console.error('订单状态更新失败:', orderNo);
            res.status(500).send('fail');
            return;
        }

        // 订单状态更新成功后，消费卡密
        try {
            await db.consumeCards(order.product_id, order.quantity, updatedOrder.id);
            console.log(`卡密发放成功: 订单 ${orderNo}, 数量 ${order.quantity}`);
        } catch (cardErr) {
            // 卡密发放失败（如库存不足），记录日志但不回滚支付状态
            // 这种情况需要人工处理，因为用户已经付钱了
            console.error(`卡密发放失败! 订单: ${orderNo}, 错误:`, cardErr);
            // 仍然返回success，避免支付宝重复回调，但需要人工补卡
        }

        // 必须返回纯文本 "success"，支付宝才会认为回调成功
        res.send('success');

    } catch (err) {
        console.error('支付宝回调处理异常:', err);
        res.status(500).send('fail');
    }
};

/**
 * 解析 application/x-www-form-urlencoded 请求体
 */
function parseFormBody(req) {
    return new Promise((resolve, reject) => {
        // Vercel 可能已经解析了 body
        if (req.body && typeof req.body === 'object') {
            resolve(req.body);
            return;
        }

        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const params = {};
                const pairs = body.split('&');
                for (const pair of pairs) {
                    const [key, value] = pair.split('=');
                    if (key) {
                        params[decodeURIComponent(key)] = decodeURIComponent(value || '');
                    }
                }
                resolve(params);
            } catch (e) {
                reject(e);
            }
        });
        req.on('error', reject);
    });
}
