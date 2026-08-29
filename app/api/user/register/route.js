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
    const { username, password, email } = body;

    if (!username || !password) {
      return NextResponse.json({ success: false, message: '用户名和密码不能为空' }, { status: 400 });
    }

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json({ success: false, message: '用户名长度3-20位' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, message: '密码不少于6位' }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json({ success: false, message: '用户名只能是字母、数字或下划线' }, { status: 400 });
    }

    const db = getDB();

    // 检查用户名是否已存在
    const existing = await db.getUserByUsername(username);
    if (existing) {
      return NextResponse.json({ success: false, message: '用户名已被注册' }, { status: 400 });
    }

    // 创建用户
    const hashedPassword = hashPassword(password);
    const user = await db.createUser(username, hashedPassword, email || '');

    // 生成简单token
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    return NextResponse.json({
      success: true,
      message: '注册成功',
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
    console.error('注册失败:', err);
    return NextResponse.json({ success: false, message: err.message || '注册失败' }, { status: 500 });
  }
}
