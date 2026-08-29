import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const params = {};
    for (const [key, value] of formData.entries()) {
      params[key] = value;
    }

    const { out_trade_no, trade_status, trade_no, total_amount } = params;

    if (!out_trade_no) {
      return new NextResponse('fail', { status: 400 });
    }

    // 验证签名（简化版，生产环境建议完整验证）
    const Alipay = (await import('@/lib/alipay')).default;
    const alipay = new Alipay({
      appId: process.env.ALIPAY_APP_ID,
      privateKey: process.env.ALIPAY_PRIVATE_KEY,
      publicKey: process.env.ALIPAY_PUBLIC_KEY,
      notifyUrl: process.env.ALIPAY_NOTIFY_URL,
      sandbox: process.env.ALIPAY_SANDBOX === 'true'
    });

    const signValid = alipay.verifyNotify(params);
    if (!signValid) {
      console.error('支付宝回调签名验证失败:', out_trade_no);
      return new NextResponse('fail', { status: 400 });
    }

    if (trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED') {
      const db = getDB();
      const order = await db.getOrderByNo(out_trade_no);

      if (order && order.status === 'pending') {
        // 验证金额
        if (Math.abs(parseFloat(total_amount) - parseFloat(order.amount)) > 0.001) {
          console.error('回调金额不匹配:', out_trade_no, total_amount, order.amount);
          return new NextResponse('fail', { status: 400 });
        }

        const updated = await db.markOrderPaid(out_trade_no, trade_no);
        if (updated) {
          try {
            await db.consumeCards(order.product_id, order.quantity, updated.id);
            console.log('回调发卡成功:', out_trade_no);
          } catch (cardErr) {
            console.error('回调发卡失败:', out_trade_no, cardErr);
          }
        }
      }
    }

    return new NextResponse('success');
  } catch (err) {
    console.error('支付宝回调处理失败:', err);
    return new NextResponse('fail', { status: 500 });
  }
}
