import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyAdminToken } from '@/lib/security';

export async function POST(request) {
  try {
    // 验证管理员权限
    const auth = request.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { product_id, cards } = body;
    if (!product_id || !cards || !Array.isArray(cards) || cards.length === 0) {
      return NextResponse.json({ error: '参数错误' }, { status: 400 });
    }
    const db = getDB();
    const cardRows = cards.map(content => ({
      product_id: parseInt(product_id),
      card_content: content,
      status: 'available'
    }));
    const { data, error } = await db.client
      .from('cards')
      .insert(cardRows)
      .select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 更新商品库存（先查询当前库存，再累加）
    const { data: product } = await db.client
      .from('products')
      .select('stock')
      .eq('id', parseInt(product_id))
      .single();
    const currentStock = product?.stock || 0;
    await db.client
      .from('products')
      .update({ stock: currentStock + cards.length })
      .eq('id', parseInt(product_id));

    return NextResponse.json({ success: true, imported: cards.length });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
