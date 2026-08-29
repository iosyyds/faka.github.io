import { NextResponse } from 'next/server';
import { verifyAdminPassword, createAdminToken } from '@/lib/security';

export async function POST(req) {
  try {
    const body = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ success: false, message: '请输入密码' }, { status: 400 });
    }

    if (!verifyAdminPassword(password)) {
      return NextResponse.json({ success: false, message: '密码错误' }, { status: 401 });
    }

    const token = createAdminToken();
    return NextResponse.json({ success: true, token });
  } catch (err) {
    console.error('登录失败:', err);
    return NextResponse.json({ success: false, message: '登录失败' }, { status: 500 });
  }
}
