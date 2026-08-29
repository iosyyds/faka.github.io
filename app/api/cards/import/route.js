import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { product_id, cards } = body;
    if (!product_id || !cards || !Array.isArray(cards) || cards.length === 0) {
      return NextResponse.json({ error: '参数错误' }, { status: 400 });
    }
    const db = getDB();
    const cardRows = cards.map(content => ({
      product_id: parseInt(product_id),
      card_content: content,
      status: 'unsold'
    }));
    const { data, error } = await db.supabase
      .from('cards')
      .insert(cardRows)
      .select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 更新商品库存
    await db.supabase
      .from('products')
      .update({ stock: db.supabase.raw(`stock + ${cards.length}`) })
      .eq('id', product_id);

    return NextResponse.json({ success: true, imported: cards.length });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
