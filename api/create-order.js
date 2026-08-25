const { getDB } = require('../lib/db');
const Alipay = require('../lib/alipay');
const {
    getCorsHeaders, success, error,
    parseBody, generateOrderNo
} = require('../lib/security');

/**
 * POST /api/create-order
 * 创建订单
 *
 * 【安全要点】
 * 1. 价格、商品名全部从数据库读取，前端传的价格/名称直接忽略
 * 2. 库存校验在服务端完成
 * 3. 订单号不可预测（时间戳+随机串）
 * 4. 数量限制（防止恶意超大数量）
 */
module.exports = async (req, res) => {
    // CORS
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
        const { productId } = body;

        // 参数校验
        if (!productId) {
            return error(res, '缺少商品ID');
        }

        // 数量校验：限制1-10件，防止恶意请求
        let quantity = parseInt(body.quantity, 10);
        if (isNaN(quantity) || quantity < 1) {
            quantity = 1;
        }
        if (quantity > 10) {
            return error(res, '单次购买不能超过10件');
        }

        const db = getDB();

        // 从数据库读取商品信息（价格、名称以此为准，不信任前端）
        const product = await db.getProductById(productId);
        if (!product) {
            return error(res, '商品不存在');
        }

        // 校验库存（从数据库实时统计可用卡密）
        const productsWithStock = await db.getProducts();
        const productWithStock = productsWithStock.find(p => p.id === productId);
        const stock = productWithStock ? productWithStock.stock : 0;

        if (stock < quantity) {
            return error(res, `库存不足，当前剩余 ${stock} 件`);
        }

        // 计算金额（服务端计算，不信任前端）
        const amount = Number((product.price * quantity).toFixed(2));

        // 金额合理性校验（防止数据库价格被篡改为0）
        if (amount <= 0) {
            console.error(`商品 ${productId} 价格异常: ${product.price}`);
            return error(res, '商品价格异常，请联系客服');
        }

        // 生成不可预测的订单号
        const orderNo = generateOrderNo();

        // 创建订单（状态：pending）
        const order = await db.createOrder(
            orderNo,
            productId,
            product.name,  // 商品名从数据库取
            quantity,
            amount          // 金额服务端计算
        );

        // 检查支付宝是否已配置
        if (!process.env.ALIPAY_APP_ID || process.env.ALIPAY_APP_ID === 'placeholder' ||
            !process.env.ALIPAY_PRIVATE_KEY || process.env.ALIPAY_PRIVATE_KEY === 'placeholder' ||
            !process.env.ALIPAY_PUBLIC_KEY || process.env.ALIPAY_PUBLIC_KEY === 'placeholder') {
            return error(res, '支付宝支付尚未配置，请联系管理员在 Vercel 环境变量中设置 ALIPAY_APP_ID、ALIPAY_PRIVATE_KEY、ALIPAY_PUBLIC_KEY');
        }

        // 调用支付宝预下单（生成扫码支付二维码）
        const alipay = new Alipay({
            appId: process.env.ALIPAY_APP_ID,
            privateKey: process.env.ALIPAY_PRIVATE_KEY,
            publicKey: process.env.ALIPAY_PUBLIC_KEY,
            notifyUrl: process.env.ALIPAY_NOTIFY_URL,
            sandbox: process.env.ALIPAY_SANDBOX === 'true'
        });

        const payResult = await alipay.precreate({
            outTradeNo: orderNo,
            totalAmount: amount,
            subject: `${product.name} x${quantity}`,
            body: product.description || ''
        });

        return success(res, {
            order: {
                order_no: order.order_no,
                product_name: order.product_name,
                quantity: order.quantity,
                amount: order.amount,
                status: order.status
            },
            qrCode: payResult.qrCode
        });

    } catch (err) {
        console.error('创建订单失败:', err);
        return error(res, err.message || '创建订单失败', 500);
    }
};
