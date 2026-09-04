import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const db = getDB();
    
    // 直接查询订单，不做N+1查询
    let query = db.client
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    
    if (status) query = query.eq('status', status);
    
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(
      { orders: data, data },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (e) {
    console.error('获取订单失败:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
