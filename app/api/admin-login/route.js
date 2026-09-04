import { NextResponse } from 'next/server';
import { createAdminToken } from '@/lib/security';
import crypto from 'crypto';

// 登录失败次数限制（IP维度）
const loginAttempts = new Map();

function checkLoginAttempts(ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 20;
  
  if (!loginAttempts.has(ip)) {
    loginAttempts.set(ip, { count: 0, firstTime: now, lockUntil: 0 });
  }
  
  const record = loginAttempts.get(ip);
  
  if (record.lockUntil > now) {
    const remaining = Math.ceil((record.lockUntil - now) / 1000);
    return { allowed: false, remaining };
  }
  
  if (now - record.firstTime > windowMs) {
    record.count = 0;
    record.firstTime = now;
  }
  
  if (record.count >= maxAttempts) {
    record.lockUntil = now + 15 * 60 * 1000;
    return { allowed: false, remaining: 900 };
  }
  
  return { allowed: true };
}

function recordFailedLogin(ip) {
  const record = loginAttempts.get(ip);
  if (record) record.count++;
}

function recordSuccessfulLogin(ip) {
  loginAttempts.delete(ip);
}

export async function POST(req) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') || 'unknown';
    
    const check = checkLoginAttempts(ip);
    if (!check.allowed) {
      return NextResponse.json({ 
        success: false, 
        error: `登录失败次数过多，请${check.remaining}秒后再试` 
      }, { status: 429 });
    }

    const body = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ success: false, error: '请输入密码' }, { status: 400 });
    }

    // 直接用环境变量密码，不读数据库，避免数据库密码问题
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    // 常量时间比较
    const inputBuf = Buffer.from(password);
    const passBuf = Buffer.from(adminPassword);
    
    if (inputBuf.length !== passBuf.length || !crypto.timingSafeEqual(inputBuf, passBuf)) {
      recordFailedLogin(ip);
      return NextResponse.json({ success: false, error: '密码错误' }, { status: 401 });
    }

    recordSuccessfulLogin(ip);
    const token = createAdminToken();
    return NextResponse.json({ success: true, token });
  } catch (err) {
    console.error('登录失败:', err);
    return NextResponse.json({ success: false, error: '登录失败：' + err.message }, { status: 500 });
  }
}
