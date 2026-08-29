import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

function getUserIdFromToken(req) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const [userId] = decoded.split(':');
    return parseInt(userId, 10);
  } catch {
    return null;
  }
}

export async function GET(req) {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
    }

    const db = getDB();
    const orders = await db.getUserOrders(userId, 100);

    return NextResponse.json({ success: true, orders });
  } catch (err) {
    console.error('获取用户订单失败:', err);
    return NextResponse.json({ success: false, message: err.message || '获取失败' }, { status: 500 });
  }
}
