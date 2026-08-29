import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyAdminToken } from '@/lib/security';

function getAuthToken(req) {
  const auth = req.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

export async function POST(req) {
  try {
    const token = getAuthToken(req);
    if (!verifyAdminToken(token)) {
      return NextResponse.json({ success: false, message: '未授权或登录已过期，请重新登录' }, { status: 401 });
    }

    const body = await req.json();
    const { oldPassword, newPassword, confirmPassword } = body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ success: false, message: '请填写完整信息' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, message: '新密码不少于6位' }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ success: false, message: '两次输入的新密码不一致' }, { status: 400 });
    }

    // 验证旧密码
    let adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const db = getDB();
    const settings = await db.getSettings();
    if (settings.admin_password) {
      adminPassword = settings.admin_password;
    }

    if (oldPassword !== adminPassword) {
      return NextResponse.json({ success: false, message: '旧密码错误' }, { status: 400 });
    }

    // 更新密码到数据库
    await db.updateSettings({ admin_password: newPassword });

    return NextResponse.json({ success: true, message: '密码修改成功，请重新登录' });
  } catch (err) {
    console.error('修改密码失败:', err);
    return NextResponse.json({ success: false, message: err.message || '修改密码失败' }, { status: 500 });
  }
}
