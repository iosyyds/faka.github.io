import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const orderNo = searchParams.get('order_no') || searchParams.get('orderNo');
    const email = searchParams.get('email');

    if (!orderNo) {
      return NextResponse.json({ success: false, message: '缺少订单号' }, { status: 400 });
    }

    const db = getDB();
    let order = await db.getOrderByNo(orderNo);
    if (!order) {
      return NextResponse.json({ success: false, message: '订单不存在' }, { status: 404 });
    }

    // 双保险：pending状态主动查询支付宝
    if (order.status === 'pending') {
      try {
        const alipayConfigured = process.env.ALIPAY_APP_ID &&
            process.env.ALIPAY_APP_ID !== 'placeholder' &&
            process.env.ALIPAY_PRIVATE_KEY &&
            process.env.ALIPAY_PRIVATE_KEY !== 'placeholder';
        if (alipayConfigured) {
          const Alipay = (await import('@/lib/alipay')).default;
          const alipay = new Alipay({
            appId: process.env.ALIPAY_APP_ID,
            privateKey: process.env.ALIPAY_PRIVATE_KEY,
            publicKey: process.env.ALIPAY_PUBLIC_KEY,
            notifyUrl: process.env.ALIPAY_NOTIFY_URL,
            sandbox: process.env.ALIPAY_SANDBOX === 'true'
          });
          const queryResult = await alipay.query({ outTradeNo: orderNo });
          if (queryResult.tradeStatus === 'TRADE_SUCCESS') {
            const alipayAmount = parseFloat(queryResult.totalAmount);
            if (Math.abs(alipayAmount - order.amount) > 0.001) {
              console.error(`金额不匹配! 订单: ${orderNo}`);
            } else {
              const updatedOrder = await db.markOrderPaid(orderNo, queryResult.tradeNo);
              if (updatedOrder) {
                let cards = [];
                try {
                  await db.consumeCards(order.product_id, order.quantity, updatedOrder.id);
                  const cardResult = await db.getCardsByOrderId(updatedOrder.id);
                  cards = cardResult || [];
                } catch (cardErr) {
                  console.error('发卡失败:', cardErr);
                }
                // 发送卡密邮件
                try {
                  const { sendCardEmail } = require('@/lib/email');
                  const email = order.remark ? order.remark.replace('联系方式: ', '') : '';
                  if (email) {
                    await sendCardEmail({
                      to: email,
                      siteName: '甜甜发卡',
                      orderNo: orderNo,
                      productName: order.product_name,
                      quantity: order.quantity,
                      amount: order.amount,
                      cards: cards,
                      email: email
                    });
                    console.log('卡密邮件已发送:', orderNo, email);
                  }
                } catch (emailErr) {
                  console.error('卡密邮件发送失败:', orderNo, emailErr.message);
                }
                order = await db.getOrderByNo(orderNo);
              }
            }
          }
        }
      } catch (alipayErr) {
        console.warn('主动查询失败:', alipayErr.message);
      }
    }

    const orderInfo = {
      id: order.id,
      order_no: order.order_no,
      product_name: order.product_name,
      quantity: order.quantity,
      amount: order.amount,
      status: order.status,
      created_at: order.created_at,
      email: order.remark ? order.remark.replace('联系方式: ', '') : ''
    };

    if (order.status === 'paid') {
      try {
        const cards = await db.getCardsByOrderId(order.id);
        orderInfo.cards = (cards || []).map(c => ({
          card_type: c.card_type,
          card_content: c.card_content || c.content
        }));
      } catch (e) {
        orderInfo.cards = [];
      }
      orderInfo.paid_at = order.paid_at;
    }

    return NextResponse.json({ success: true, order: orderInfo, data: orderInfo });
  } catch (err) {
    console.error('查询订单失败:', err);
    return NextResponse.json({ success: false, message: '查询订单失败' }, { status: 500 });
  }
}
