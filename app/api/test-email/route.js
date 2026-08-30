import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { sendCardEmail } from '@/lib/email';

export async function POST(request) {
  try {
    // 验证管理员权限
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { verifyAdminToken } = await import('@/lib/security');
    if (!verifyAdminToken(token)) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { test_email } = body;

    if (!test_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(test_email)) {
      return NextResponse.json({ error: '请输入有效的邮箱地址' }, { status: 400 });
    }

    // 从数据库获取SMTP配置
    const db = getDB();
    const settings = await db.getSettings();

    const smtpConfig = {
      host: settings.smtp_host,
      port: settings.smtp_port,
      user: settings.smtp_user,
      pass: settings.smtp_pass,
      from: settings.smtp_user,
      fromName: settings.smtp_from_name || settings.site_name || '甜甜发卡',
    };

    // 检查配置是否完整
    if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
      return NextResponse.json({ error: '请先完整配置SMTP信息（服务器、邮箱、授权码）' }, { status: 400 });
    }

    // 发送测试邮件
    const result = await sendCardEmail({
      to: test_email,
      siteName: smtpConfig.fromName,
      orderNo: 'TEST-' + Date.now(),
      productName: '邮件配置测试',
      quantity: 1,
      amount: '0.01',
      cards: [{ card_content: '这是一封测试邮件，证明您的SMTP配置已成功！' }],
      email: test_email,
    }, smtpConfig);

    if (result) {
      return NextResponse.json({ success: true, message: '测试邮件已发送，请查收' });
    } else {
      return NextResponse.json({ error: '邮件发送失败，请检查SMTP配置' }, { status: 500 });
    }
  } catch (error) {
    console.error('测试邮件发送失败:', error);
    return NextResponse.json({ error: '发送失败: ' + error.message }, { status: 500 });
  }
}
