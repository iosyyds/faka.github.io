import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyAdminToken, extractToken, generateOrderNo } from '@/lib/security';

export async function POST(req) {
  try {
    const body = await req.json();
    const { productId, contact } = body;

    if (!productId) {
      return NextResponse.json({ success: false, message: '缺少商品ID' }, { status: 400 });
    }

    const contactClean = (contact || '').trim().substring(0, 100);
    if (contactClean.length < 5) {
      return NextResponse.json({ success: false, message: '联系方式不少于5位' }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9]+$/.test(contactClean)) {
      return NextResponse.json({ success: false, message: '联系方式只能是数字或字母' }, { status: 400 });
    }

    let quantity = parseInt(body.quantity, 10);
    if (isNaN(quantity) || quantity < 1) quantity = 1;
    if (quantity > 10) {
      return NextResponse.json({ success: false, message: '单次购买不能超过10件' }, { status: 400 });
    }

    const db = getDB();
    const product = await db.getProductById(productId);
    if (!product) {
      return NextResponse.json({ success: false, message: '商品不存在' }, { status: 404 });
    }

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
    const order = await db.createOrder(orderNo, productId, product.name, quantity, amount, contactClean, userId);

    if (!process.env.ALIPAY_APP_ID || process.env.ALIPAY_APP_ID === 'placeholder' ||
        !process.env.ALIPAY_PRIVATE_KEY || process.env.ALIPAY_PRIVATE_KEY === 'placeholder' ||
        !process.env.ALIPAY_PUBLIC_KEY || process.env.ALIPAY_PUBLIC_KEY === 'placeholder') {
      return NextResponse.json({ success: false, message: '支付宝支付尚未配置' }, { status: 500 });
    }

    const Alipay = (await import('@/lib/alipay')).default;
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

    return NextResponse.json({
      success: true,
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
    return NextResponse.json({ success: false, message: err.message || '创建订单失败' }, { status: 500 });
  }
}
