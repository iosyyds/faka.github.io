import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

/**
 * 支付回调统一入口
 *  - 支付宝：POST form 表单（application/x-www-form-urlencoded）
 *  - 微信支付：POST JSON（Content-Type: application/json，带验签头）
 */
export async function POST(req) {
  const rawBody = await req.text();
  const contentType = req.headers.get('content-type') || '';

  // ========== 微信支付回调（JSON） ==========
  if (contentType.includes('application/json')) {
    return handleWechatNotify(req, rawBody);
  }

  // ========== 支付宝回调（form 表单） ==========
  return handleAlipayNotify(req);
}

// ===== 微信支付回调处理 =====
async function handleWechatNotify(req, rawBody) {
  try {
    const body = JSON.parse(rawBody);
    const headers = Object.fromEntries(req.headers.entries());

    const WechatPay = (await import('@/lib/wechatpay')).default;
    const wechatPay = new WechatPay({
      appId: process.env.WXPAY_APP_ID,
      mchId: process.env.WXPAY_MCH_ID,
      serialNo: process.env.WXPAY_SERIAL_NO,
      privateKey: process.env.WXPAY_PRIVATE_KEY,
      apiV3Key: process.env.WXPAY_API_V3_KEY,
      notifyUrl: process.env.WXPAY_NOTIFY_URL
    });

    // 1. 验证签名（用微信支付平台证书）
    const valid = await wechatPay.verifyNotify(headers, rawBody);
    if (!valid) {
      console.error('微信支付回调签名验证失败');
      return NextResponse.json({ code: 'FAIL', message: '签名错误' }, { status: 401 });
    }

    // 2. 解密交易数据
    const transaction = await wechatPay.handleNotify(headers, body);
    if (!transaction) {
      // 非支付成功事件，直接应答成功
      return NextResponse.json({ code: 'SUCCESS', message: '成功' });
    }

    const outTradeNo = transaction.out_trade_no;
    const tradeNo = transaction.transaction_id;
    const totalFee = transaction.amount ? transaction.amount.total : 0; // 单位：分

    if (!outTradeNo) {
      return NextResponse.json({ code: 'FAIL', message: '缺少订单号' }, { status: 400 });
    }

    // 3. 更新订单
    const db = getDB();
    const order = await db.getOrderByNo(outTradeNo);
    if (order && order.status === 'pending') {
      // 验证金额（单位转换为元）
      const paidAmount = Number((totalFee / 100).toFixed(2));
      if (Math.abs(paidAmount - parseFloat(order.amount)) > 0.001) {
        console.error('微信回调金额不匹配:', outTradeNo, paidAmount, order.amount);
        return NextResponse.json({ code: 'FAIL', message: '金额不匹配' }, { status: 400 });
      }
      const updated = await db.markOrderPaid(outTradeNo, tradeNo);
      if (updated) {
        await deliverCards(db, updated, outTradeNo);
      }
    }

    return NextResponse.json({ code: 'SUCCESS', message: '成功' });
  } catch (err) {
    console.error('微信支付回调处理失败:', err);
    return NextResponse.json({ code: 'FAIL', message: '处理失败' }, { status: 500 });
  }
}

// ===== 支付宝回调处理 =====
async function handleAlipayNotify(req) {
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
          await deliverCards(db, updated, out_trade_no);
        }
      }
    }
    return new NextResponse('success');
  } catch (err) {
    console.error('支付宝回调处理失败:', err);
    return new NextResponse('fail', { status: 500 });
  }
}

// ===== 公共：发卡 + 发邮件 =====
async function deliverCards(db, order, orderNo) {
  let cards = [];
  try {
    await db.consumeCards(order.product_id, order.quantity, order.id);
    console.log('回调发卡成功:', orderNo);
    const cardResult = await db.getCardsByOrderId(order.id);
    cards = cardResult || [];
  } catch (cardErr) {
    console.error('回调发卡失败:', orderNo, cardErr);
  }

  // 发送卡密邮件
  try {
    const { sendCardEmail } = await import('@/lib/email');
    const email = order.remark ? order.remark.replace('联系方式: ', '') : '';
    if (email) {
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
      } catch (cfgErr) {
        console.warn('获取SMTP配置失败，使用环境变量:', cfgErr.message);
      }

      await sendCardEmail({
        to: email,
        siteName: smtpConfig.fromName || '甜甜发卡',
        orderNo: orderNo,
        productName: order.product_name,
        quantity: order.quantity,
        amount: order.amount,
        cards: cards,
        email: email
      }, smtpConfig);
      console.log('卡密邮件已发送:', orderNo, email);
    }
  } catch (emailErr) {
    console.error('卡密邮件发送失败:', orderNo, emailErr.message);
  }
}
