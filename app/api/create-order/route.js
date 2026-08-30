import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { generateOrderNo } from '@/lib/security';

export async function POST(req) {
  try {
    const body = await req.json();
    const productId = body.product_id || body.productId;
    const email = body.email || body.contact;
    const payMethod = body.pay_method || 'alipay';

    if (!productId) {
      return NextResponse.json({ success: false, message: '缺少商品ID' }, { status: 400 });
    }

    // 验证邮箱
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, message: '请输入有效的邮箱地址' }, { status: 400 });
    }

    let quantity = parseInt(body.quantity, 10);
    if (isNaN(quantity) || quantity < 1) quantity = 1;
    if (quantity > 10) {
      return NextResponse.json({ success: false, message: '单次购买不能超过10件' }, { status: 400 });
    }

    const db = getDB();

    // 获取商品
    const product = await db.getProductById(productId);
    if (!product) {
      return NextResponse.json({ success: false, message: '商品不存在' }, { status: 404 });
    }

    // 检查库存
    const productsWithStock = await db.getProducts();
    const productWithStock = productsWithStock.find(p => p.id === productId);
    const stock = productWithStock ? productWithStock.stock : 0;
    if (stock < quantity) {
      return NextResponse.json({ success: false, message: `库存不足，当前剩余 ${stock} 件` }, { status: 400 });
    }

    const amount = Number((product.price * quantity).toFixed(2));
    if (amount <= 0) {
      return NextResponse.json({ success: false, message: '商品价格异常，请联系客服' }, { status: 500 });
    }

    const orderNo = generateOrderNo();

    // 创建订单（待支付状态）
    const order = await db.createOrder(orderNo, productId, product.name, quantity, amount, email, null);

    // 检查支付宝是否配置
    const alipayConfigured = process.env.ALIPAY_APP_ID && process.env.ALIPAY_APP_ID !== 'placeholder' &&
      process.env.ALIPAY_PRIVATE_KEY && process.env.ALIPAY_PRIVATE_KEY !== 'placeholder' &&
      process.env.ALIPAY_PUBLIC_KEY && process.env.ALIPAY_PUBLIC_KEY !== 'placeholder';

    if (!alipayConfigured) {
      // 未配置支付宝，返回提示
      return NextResponse.json({
        success: false,
        message: '支付尚未配置，请联系管理员配置支付宝支付',
        order: {
          id: order.id,
          order_no: orderNo,
          product_name: product.name,
          quantity,
          amount,
          status: 'pending'
        }
      }, { status: 500 });
    }

    // 调用支付宝预下单，生成支付二维码
    const Alipay = (await import('@/lib/alipay')).default;
    const alipay = new Alipay({
      appId: process.env.ALIPAY_APP_ID,
      privateKey: process.env.ALIPAY_PRIVATE_KEY,
      publicKey: process.env.ALIPAY_PUBLIC_KEY,
      notifyUrl: process.env.ALIPAY_NOTIFY_URL || (process.env.NEXT_PUBLIC_SITE_URL || '') + '/api/notify',
      sandbox: process.env.ALIPAY_SANDBOX === 'true'
    });

    const payResult = await alipay.precreate({
      outTradeNo: orderNo,
      totalAmount: amount,
      subject: `${product.name} x${quantity}`,
      body: product.description || ''
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        order_no: orderNo,
        product_name: product.name,
        quantity,
        amount,
        status: 'pending',
        email
      },
      qr_code: payResult.qrCode,
      trade_no: payResult.tradeNo
    });

  } catch (err) {
    console.error('创建订单失败:', err);
    return NextResponse.json({ success: false, message: err.message || '创建订单失败' }, { status: 500 });
  }
}
