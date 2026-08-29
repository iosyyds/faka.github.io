import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyAdminToken } from '@/lib/security';

function getAuthToken(req) {
  const auth = req.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

export async function GET() {
  try {
    const db = getDB();
    const settings = await db.getSettings();
    const publicSettings = {
      site_name: settings.site_name || '自动发卡商城',
      site_subtitle: settings.site_subtitle || '',
      site_description: settings.site_description || '',
      site_logo: settings.site_logo || '',
      contact_qq: settings.contact_qq || '',
      contact_wechat: settings.contact_wechat || '',
      contact_email: settings.contact_email || '',
      announcement: settings.announcement || '',
      footer_text: settings.footer_text || '',
      icp_number: settings.icp_number || '',
      payment_tip: settings.payment_tip || '请使用支付宝扫码支付，支付成功后将自动跳转'
    };
    return NextResponse.json({ success: true, settings: publicSettings });
  } catch (err) {
    console.error('获取设置失败:', err);
    return NextResponse.json({ success: false, message: '获取设置失败' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const token = getAuthToken(req);
    if (!verifyAdminToken(token)) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    const body = await req.json();
    const allowedKeys = [
      'site_name', 'site_subtitle', 'site_description', 'site_logo',
      'contact_qq', 'contact_wechat', 'contact_email',
      'announcement', 'footer_text', 'icp_number', 'payment_tip', 'stock_warning'
    ];
    const updates = {};
    for (const key of allowedKeys) {
      if (body[key] !== undefined) updates[key] = String(body[key]);
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, message: '没有需要更新的设置项' }, { status: 400 });
    }

    const db = getDB();
    await db.updateSettings(updates);
    return NextResponse.json({ success: true, message: '设置已更新' });
  } catch (err) {
    console.error('更新设置失败:', err);
    return NextResponse.json({ success: false, message: err.message || '操作失败' }, { status: 500 });
  }
}
