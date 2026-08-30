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

    // 验证签名
    const Alipay = (await import('@/lib/alipay')).default;
    const alipay = new Alipay({
      appId: process.env.ALIPAY_APP_ID,
      privateKey: process.env.ALIPAY_PRIVATE_KEY,
      publicKey: process.env.ALIPAY_PUBLIC_KEY,
      notifyUrl: process.env.ALIPAY_NOTIFY_URL,
      sandbox: process.env.ALIPAY_SANDBOX === 'true'
    });
    const signValid = alipay.verify(params);
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
          let cards = [];
          try {
            await db.consumeCards(order.product_id, order.quantity, updated.id);
            console.log('回调发卡成功:', out_trade_no);
            // 获取卡密用于邮件
            const cardResult = await db.getCardsByOrderId(updated.id);
            cards = cardResult || [];
          } catch (cardErr) {
            console.error('回调发卡失败:', out_trade_no, cardErr);
          }

          // 发送卡密邮件
          try {
            const { sendCardEmail } = require('@/lib/email');
            const email = order.remark ? order.remark.replace('联系方式: ', '') : '';
            if (email) {
              await sendCardEmail({
                to: email,
                siteName: '甜甜发卡',
                orderNo: out_trade_no,
                productName: order.product_name,
                quantity: order.quantity,
                amount: order.amount,
                cards: cards,
                email: email
              });
              console.log('卡密邮件已发送:', out_trade_no, email);
            }
          } catch (emailErr) {
            console.error('卡密邮件发送失败:', out_trade_no, emailErr.message);
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
