import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyAdminToken } from '@/lib/security';

function getAuthToken(req) {
  const auth = req.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

export async function GET(req) {
  try {
    const token = getAuthToken(req);
    if (!verifyAdminToken(token)) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit'), 10) || 50, 200);
    const status = searchParams.get('status') || null;

    const db = getDB();
    const orders = await db.getOrders(limit, status);
    return NextResponse.json({ success: true, orders });
  } catch (err) {
    console.error('获取订单失败:', err);
    return NextResponse.json({ success: false, message: '获取订单列表失败' }, { status: 500 });
  }
}
