import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

// 简单的内存频率限制（IP维度）
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1分钟窗口
  const maxRequests = 20; // 每分钟最多20次
  
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, firstTime: now });
    return true;
  }
  
  const record = rateLimitMap.get(ip);
  if (now - record.firstTime > windowMs) {
    record.count = 1;
    record.firstTime = now;
    return true;
  }
  
  record.count++;
  if (record.count > maxRequests) {
    return false;
  }
  return true;
}

// 清理过期记录（每5分钟执行一次）
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now - record.firstTime > 5 * 60 * 1000) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export async function GET(req) {
  try {
    // 获取客户端IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') || 
               'unknown';
    
    // 频率限制检查
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ 
        success: false, 
        message: '查询过于频繁，请稍后再试' 
      }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const orderNo = searchParams.get('order_no') || searchParams.get('orderNo');
    const email = searchParams.get('email');

    if (!orderNo) {
      return NextResponse.json({ success: false, message: '缺少订单号' }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ success: false, message: '请输入邮箱地址' }, { status: 400 });
    }

    // 验证邮箱格式
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, message: '邮箱格式不正确' }, { status: 400 });
    }

    const db = getDB();
    let order = await db.getOrderByNo(orderNo);
    if (!order) {
      return NextResponse.json({ success: false, message: '订单不存在' }, { status: 404 });
    }

    // 验证邮箱是否匹配（安全关键：防止凭订单号遍历查卡密）
    const orderEmail = order.remark ? order.remark.replace('联系方式: ', '') : '';
    if (orderEmail.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ 
        success: false, 
        message: '订单号与邮箱不匹配，请确认后重试' 
      }, { status: 403 });
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
                  const { sendCardEmail } = await import('@/lib/email');
                  if (orderEmail) {
                    let smtpConfig = {};
                    try {
                      const settings = await db.getSettings();
                      smtpConfig = {
                        host: settings.smtp_host,
                        port: settings.smtp_port,
                        user: settings.smtp_user,
                        pass: settings.smtp_pass,
                        from: settings.smtp_user,
                        fromName: settings.smtp_from_name || settings.site_name || '甜甜发卡',
                      };
                    } catch (cfgErr) {}
                    await sendCardEmail({
                      to: orderEmail,
                      siteName: smtpConfig.fromName || '甜甜发卡',
                      orderNo: orderNo,
                      productName: order.product_name,
                      quantity: order.quantity,
                      amount: order.amount,
                      cards: cards,
                      email: orderEmail
                    }, smtpConfig);
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
      email: orderEmail
    };

    // 只有已支付订单才返回卡密
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
