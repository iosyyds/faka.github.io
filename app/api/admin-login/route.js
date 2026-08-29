import { NextResponse } from 'next/server';
import { createAdminToken } from '@/lib/security';
import { getDB } from '@/lib/db';

export async function POST(req) {
  try {
    const body = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ success: false, message: '请输入密码' }, { status: 400 });
    }

    // 优先从数据库读取密码，没有则用环境变量
    let adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    try {
      const db = getDB();
      const settings = await db.getSettings();
      if (settings.admin_password) {
        adminPassword = settings.admin_password;
      }
    } catch (dbErr) {
      console.warn('读取数据库密码失败，使用环境变量密码:', dbErr.message);
    }

    if (password !== adminPassword) {
      return NextResponse.json({ success: false, message: '密码错误' }, { status: 401 });
    }

    const token = createAdminToken();
    return NextResponse.json({ success: true, token });
  } catch (err) {
    console.error('登录失败:', err);
    return NextResponse.json({ success: false, message: '登录失败' }, { status: 500 });
  }
}
