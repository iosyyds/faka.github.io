const { getDB } = require('../lib/db');
const Alipay = require('../lib/alipay');
const { getCorsHeaders, success, error } = require('../lib/security');

/**
 * GET /api/query-order?orderNo=xxx
 * 查询订单状态
 *
 * 【安全要点】
 * 1. 只有 status === 'paid' 时才返回卡密内容
 * 2. pending/failed 状态不返回任何卡密信息
 * 3. 订单号不可预测（生成时已保证），防止遍历
 *
 * 【双保险机制】
 * 如果订单是 pending 状态，会主动调用支付宝查询接口（alipay.trade.query）确认支付状态。
 * 即使支付宝异步回调失败（如国内访问海外服务器被拦截），也能通过主动查询完成发卡。
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

        // 订单号格式校验
        if (!/^[A-Z0-9]{20,30}$/.test(orderNo)) {
            return error(res, '订单号格式错误');
        }

        const db = getDB();
        let order = await db.getOrderByNo(orderNo);

        if (!order) {
            return error(res, '订单不存在', 404);
        }

        // ========== 双保险：pending 状态主动查询支付宝 ==========
        if (order.status === 'pending') {
            try {
                // 检查支付宝是否已配置
                const alipayConfigured = process.env.ALIPAY_APP_ID &&
                    process.env.ALIPAY_APP_ID !== 'placeholder' &&
                    process.env.ALIPAY_PRIVATE_KEY &&
                    process.env.ALIPAY_PRIVATE_KEY !== 'placeholder';

                if (alipayConfigured) {
                    const alipay = new Alipay({
                        appId: process.env.ALIPAY_APP_ID,
                        privateKey: process.env.ALIPAY_PRIVATE_KEY,
                        publicKey: process.env.ALIPAY_PUBLIC_KEY,
                        notifyUrl: process.env.ALIPAY_NOTIFY_URL,
                        sandbox: process.env.ALIPAY_SANDBOX === 'true'
                    });

                    const queryResult = await alipay.query({ outTradeNo: orderNo });

                    // 如果支付宝那边已经支付成功
                    if (queryResult.tradeStatus === 'TRADE_SUCCESS') {
                        console.log(`主动查询发现订单已支付: ${orderNo}, 支付宝交易号: ${queryResult.tradeNo}`);

                        // 【安全校验】验证金额一致（防止0元购）
                        const alipayAmount = parseFloat(queryResult.totalAmount);
                        if (Math.abs(alipayAmount - order.amount) > 0.001) {
                            console.error(`主动查询金额不匹配! 订单: ${orderNo}, 订单金额: ${order.amount}, 支付宝金额: ${alipayAmount}`);
                            // 金额不匹配，不更新状态，返回pending
                        } else {
                            // 金额一致，更新订单状态为已支付 + 发放卡密
                            const updatedOrder = await db.markOrderPaid(orderNo, queryResult.tradeNo);
                            if (updatedOrder) {
                                try {
                                    await db.consumeCards(order.product_id, order.quantity, updatedOrder.id);
                                    console.log(`主动查询发卡成功: 订单 ${orderNo}, 数量 ${order.quantity}`);
                                } catch (cardErr) {
                                    console.error(`主动查询发卡失败! 订单: ${orderNo}`, cardErr);
                                }
                                // 重新查询订单获取最新状态
                                order = await db.getOrderByNo(orderNo);
                            }
                        }
                    }
                    // TRADE_CLOSED: 交易关闭，可以标记为failed
                    else if (queryResult.tradeStatus === 'TRADE_CLOSED') {
                        console.log(`主动查询发现交易已关闭: ${orderNo}`);
                        // 暂不自动标记failed，保持pending让用户可以重新支付
                    }
                    // WAIT_BUYER_PAY: 等待买家付款，保持pending
                }
            } catch (alipayErr) {
                // 主动查询失败（网络问题等），不影响原状态，记录日志即可
                console.warn(`主动查询支付宝订单失败（不影响订单状态）: ${orderNo}`, alipayErr.message);
            }
        }

        // ========== 构建返回数据 ==========
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
