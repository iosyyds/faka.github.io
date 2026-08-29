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
    const productId = searchParams.get('productId');
    const status = searchParams.get('status');

    if (!productId) {
      return NextResponse.json({ success: false, message: '缺少商品ID' }, { status: 400 });
    }

    const db = getDB();
    const cards = await db.getCardsByProductId(productId, status, 200);
    const stats = await db.getCardStats(productId);
    return NextResponse.json({ success: true, cards, stats });
  } catch (err) {
    console.error('获取卡密失败:', err);
    return NextResponse.json({ success: false, message: err.message || '操作失败' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const token = getAuthToken(req);
    if (!verifyAdminToken(token)) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    const body = await req.json();
    const { action, cardId, productId } = body;
    const db = getDB();

    if (action === 'delete') {
      if (!cardId) return NextResponse.json({ success: false, message: '缺少卡密ID' }, { status: 400 });
      await db.deleteCard(cardId);
      return NextResponse.json({ success: true, message: '卡密已删除' });
    }

    if (action === 'clear_available') {
      if (!productId) return NextResponse.json({ success: false, message: '缺少商品ID' }, { status: 400 });
      const cards = await db.getCardsByProductId(productId, 'available', 500);
      for (const card of cards) {
        await db.deleteCard(card.id);
      }
      return NextResponse.json({ success: true, message: `已清空 ${cards.length} 条未使用卡密` });
    }

    return NextResponse.json({ success: false, message: '不支持的操作类型' }, { status: 400 });
  } catch (err) {
    console.error('卡密管理失败:', err);
    return NextResponse.json({ success: false, message: err.message || '操作失败' }, { status: 500 });
  }
}
