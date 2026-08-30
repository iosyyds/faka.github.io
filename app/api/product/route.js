import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyAdminToken } from '@/lib/security';

function getAuthToken(req) {
  const auth = req.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

export async function POST(request) {
  try {
    const token = getAuthToken(request);
    if (!verifyAdminToken(token)) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    const body = await request.json();
    const db = getDB();
    const { data, error } = await db.client
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
        sort: parseInt(body.sort) || parseInt(body.sort_order) || 0,
        sort_order: parseInt(body.sort) || parseInt(body.sort_order) || 0,
        status: body.status || 'active',
        is_active: (body.status || 'active') === 'active',
        sales: parseInt(body.sales) || 0
      })
      .select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, product: data[0], id: data[0].id });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
