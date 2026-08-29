import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const db = getDB();
    let query = db.supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 为每个订单查询卡密
    const ordersWithCards = await Promise.all(data.map(async (order) => {
      const { data: cards } = await db.supabase
        .from('cards')
        .select('card_content')
        .eq('order_id', order.id);
      return { ...order, cards: cards || [] };
    }));

    return NextResponse.json({ orders: ordersWithCards, data: ordersWithCards });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
