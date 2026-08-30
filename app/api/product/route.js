import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const db = getDB();
    const { data, error } = await db.supabase
      .from('products')
      .insert({
        name: body.name,
        description: body.description || body.desc || '',
        price: parseFloat(body.price),
        original_price: body.original_price ? parseFloat(body.original_price) : null,
        category: body.category || '全部',
        stock: parseInt(body.stock) || 0,
        image: body.image || '',
        tag: body.tag || '',
        detail: body.detail || '',
        sort: parseInt(body.sort) || 0,
        status: body.status || 'active',
        sales: 0
      })
      .select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, product: data[0], id: data[0].id });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
