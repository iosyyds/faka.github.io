import nodemailer from 'nodemailer';

/**
 * 邮件发送工具
 * 支持SMTP发送，包含卡密发送模板
 */

// 创建邮件传输器
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass) {
    console.warn('SMTP未配置，邮件功能不可用');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: host,
    port: parseInt(port),
    secure: parseInt(port) === 465, // 465端口使用SSL
    auth: {
      user: user,
      pass: pass
    },
    from: from
  });

  return transporter;
}

/**
 * 卡密发送邮件模板
 * @param {Object} data - { siteName, orderNo, productName, quantity, amount, cards, email }
 * @returns {string} HTML邮件内容
 */
function buildCardEmailTemplate(data) {
  const { siteName, orderNo, productName, quantity, amount, cards, email } = data;
  const site = siteName || '甜甜发卡';

  const cardsHtml = (cards || []).map((card, index) => `
    <tr>
      <td style="padding: 10px 14px; border: 1px solid #e5e7eb; font-family: monospace; font-size: 13px; color: #1d4ed8; word-break: break-all;">
        ${index + 1}. ${card.card_content || card.content || card}
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${site} - 卡密发放通知</title>
</head>
<body style="margin: 0; padding: 0; background: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- 邮件头部 -->
    <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
      <h1 style="margin: 0; color: #fff; font-size: 22px; font-weight: 700;">${site}</h1>
      <p style="margin: 6px 0 0 0; color: rgba(255,255,255,0.85); font-size: 13px;">卡密发放通知</p>
    </div>

    <!-- 邮件内容 -->
    <div style="background: #fff; padding: 24px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <!-- 成功提示 -->
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="width: 56px; height: 56px; margin: 0 auto 12px; background: #d1fae5; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h2 style="margin: 0; font-size: 18px; color: #111827;">支付成功，卡密已发放</h2>
        <p style="margin: 6px 0 0 0; font-size: 13px; color: #6b7280;">感谢您的购买，请妥善保管以下卡密</p>
      </div>

      <!-- 订单信息 -->
      <div style="background: #f9fafb; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #6b7280; width: 80px;">订单号</td>
            <td style="padding: 6px 0; font-size: 13px; color: #111827; font-family: monospace;">${orderNo}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #6b7280;">商品名称</td>
            <td style="padding: 6px 0; font-size: 13px; color: #111827; font-weight: 500;">${productName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #6b7280;">购买数量</td>
            <td style="padding: 6px 0; font-size: 13px; color: #111827;">${quantity} 件</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #6b7280;">支付金额</td>
            <td style="padding: 6px 0; font-size: 15px; color: #dc2626; font-weight: 700;">¥${amount}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #6b7280;">接收邮箱</td>
            <td style="padding: 6px 0; font-size: 13px; color: #111827;">${email}</td>
          </tr>
        </table>
      </div>

      <!-- 卡密列表 -->
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #111827; font-weight: 600;">🎫 您的卡密（共 ${cards ? cards.length : 0} 条）</h3>
        <table style="width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden;">
          ${cardsHtml || '<tr><td style="padding: 14px; text-align: center; color: #9ca3af; font-size: 13px;">卡密将在发货后显示</td></tr>'}
        </table>
      </div>

      <!-- 使用说明 -->
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 14px; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 12px; color: #1e40af; line-height: 1.6;">
          <strong>使用说明：</strong><br>
          1. 请妥善保管卡密，泄露后无法找回<br>
          2. 卡密一经售出，非质量问题概不退换<br>
          3. 如有问题请联系客服
        </p>
      </div>

      <!-- 底部 -->
      <div style="text-align: center; padding-top: 16px; border-top: 1px solid #f3f4f6;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">本邮件由系统自动发送，请勿直接回复</p>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #9ca3af;">© ${new Date().getFullYear()} ${site}</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * 发送卡密邮件
 * @param {Object} data - { to, siteName, orderNo, productName, quantity, amount, cards, email }
 * @returns {Promise<boolean>}
 */
async function sendCardEmail(data) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('SMTP未配置，跳过邮件发送');
    return false;
  }

  try {
    const html = buildCardEmailTemplate(data);
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const siteName = data.siteName || '甜甜发卡';

    const info = await transporter.sendMail({
      from: `"${siteName}" <${from}>`,
      to: data.to || data.email,
      subject: `【${siteName}】卡密发放通知 - 订单${data.orderNo}`,
      html: html
    });

    console.log('邮件发送成功:', info.messageId);
    return true;
  } catch (err) {
    console.error('邮件发送失败:', err.message);
    return false;
  }
}

export {
  sendCardEmail,
  buildCardEmailTemplate,
  getTransporter
};
