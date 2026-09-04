import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const includeAll = searchParams.get('all') === '1' || searchParams.get('include_inactive') === '1';
    
    const db = getDB();
    const products = await db.getProducts(includeAll);
    const safeProducts = products.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      detail: p.detail || '',
      image: p.image || '',
      images: p.images || '',
      tag: p.tag || '',
      category: p.category || '全部',
      price: p.price,
      original_price: p.original_price || 0,
      stock: p.stock !== undefined ? p.stock : 0,
      sales: p.sales || 0,
      sort: p.sort || 0,
      sort_order: p.sort_order || 0,
      status: p.status || (p.is_active ? 'active' : 'inactive'),
      is_active: p.is_active !== undefined ? p.is_active : (p.status === 'active'),
      created_at: p.created_at
    }));
    return NextResponse.json({ success: true, products: safeProducts });
  } catch (err) {
    console.error('获取商品列表失败:', err);
    return NextResponse.json({ success: false, message: err.message || '获取商品列表失败' }, { status: 500 });
  }
}
