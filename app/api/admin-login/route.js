import { NextResponse } from 'next/server';
import { createAdminToken } from '@/lib/security';
import { getDB } from '@/lib/db';
import crypto from 'crypto';

// 登录失败次数限制（IP维度）
const loginAttempts = new Map();

function checkLoginAttempts(ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15分钟窗口
  const maxAttempts = 10; // 最多10次失败
  
  if (!loginAttempts.has(ip)) {
    loginAttempts.set(ip, { count: 0, firstTime: now, lockUntil: 0 });
  }
  
  const record = loginAttempts.get(ip);
  
  // 如果被锁定
  if (record.lockUntil > now) {
    const remaining = Math.ceil((record.lockUntil - now) / 1000);
    return { allowed: false, remaining };
  }
  
  // 重置窗口
  if (now - record.firstTime > windowMs) {
    record.count = 0;
    record.firstTime = now;
  }
  
  if (record.count >= maxAttempts) {
    record.lockUntil = now + 15 * 60 * 1000; // 锁定15分钟
    return { allowed: false, remaining: 900 };
  }
  
  return { allowed: true };
}

function recordFailedLogin(ip) {
  const record = loginAttempts.get(ip);
  if (record) {
    record.count++;
  }
}

function recordSuccessfulLogin(ip) {
  loginAttempts.delete(ip);
}

// 清理过期记录
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of loginAttempts.entries()) {
    if (record.lockUntil < now && now - record.firstTime > 30 * 60 * 1000) {
      loginAttempts.delete(ip);
    }
  }
}, 10 * 60 * 1000);

export async function POST(req) {
  try {
    // 获取客户端IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') || 
               'unknown';
    
    // 检查登录尝试次数
    const check = checkLoginAttempts(ip);
    if (!check.allowed) {
      return NextResponse.json({ 
        success: false, 
        message: `登录失败次数过多，请${check.remaining}秒后再试` 
      }, { status: 429 });
    }

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

    // 常量时间比较，防止时序攻击
    const inputBuf = Buffer.from(password);
    const passBuf = Buffer.from(adminPassword);
    
    if (inputBuf.length !== passBuf.length || !crypto.timingSafeEqual(inputBuf, passBuf)) {
      recordFailedLogin(ip);
      return NextResponse.json({ success: false, message: '密码错误' }, { status: 401 });
    }

    recordSuccessfulLogin(ip);
    const token = createAdminToken();
    return NextResponse.json({ success: true, token });
  } catch (err) {
    console.error('登录失败:', err);
    return NextResponse.json({ success: false, message: '登录失败' }, { status: 500 });
  }
}
