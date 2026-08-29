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
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    const body = await req.json();
    const { productId } = body;
    if (!productId) {
      return NextResponse.json({ success: false, message: '缺少商品ID' }, { status: 400 });
    }

    let cards = [];
    if (body.cards && Array.isArray(body.cards)) {
      cards = body.cards.filter(c => c.content && c.content.trim());
    } else if (body.rawText) {
      const lines = body.rawText.split('\n').filter(line => line.trim());
      const cardType = body.cardType || 'default';
      cards = lines.map(line => ({ type: cardType, content: line.trim() }));
    }

    if (cards.length === 0) {
      return NextResponse.json({ success: false, message: '没有有效的卡密数据' }, { status: 400 });
    }
    if (cards.length > 500) {
      return NextResponse.json({ success: false, message: '单次导入不能超过500条' }, { status: 400 });
    }

    const db = getDB();
    const product = await db.getProductById(productId);
    if (!product) {
      return NextResponse.json({ success: false, message: '商品不存在' }, { status: 404 });
    }

    const result = await db.addCards(productId, cards);
    return NextResponse.json({
      success: true,
      inserted: result.length,
      message: `成功导入 ${result.length} 条卡密`
    });
  } catch (err) {
    console.error('添加卡密失败:', err);
    return NextResponse.json({ success: false, message: err.message || '添加卡密失败' }, { status: 500 });
  }
}
