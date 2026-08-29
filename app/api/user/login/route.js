import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import crypto from 'crypto';

function hashPassword(password) {
  const salt = 'faka_shop_salt_2026';
  return crypto.createHash('sha256').update(salt + password).digest('hex');
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ success: false, message: '用户名和密码不能为空' }, { status: 400 });
    }

    const db = getDB();
    const user = await db.getUserByUsername(username);

    if (!user) {
      return NextResponse.json({ success: false, message: '用户不存在' }, { status: 401 });
    }

    if (user.status === 'disabled') {
      return NextResponse.json({ success: false, message: '账号已被禁用' }, { status: 403 });
    }

    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) {
      return NextResponse.json({ success: false, message: '密码错误' }, { status: 401 });
    }

    // 更新最后登录时间
    await db.updateUser(user.id, { last_login_at: new Date().toISOString() });

    // 生成token
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    return NextResponse.json({
      success: true,
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        balance: user.balance,
        email: user.email
      }
    });
  } catch (err) {
    console.error('登录失败:', err);
    return NextResponse.json({ success: false, message: err.message || '登录失败' }, { status: 500 });
  }
}
