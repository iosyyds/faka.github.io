import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET(req) {
  try {
    const db = getDB();
    const products = await db.getProducts();
    const safeProducts = products.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      image: p.image || '',
      tag: p.tag || '',
      category: p.category || '全部',
      price: p.price,
      original_price: p.original_price || 0,
      stock: p.stock,
      sales: p.sales || 0
    }));
    return NextResponse.json({ success: true, products: safeProducts });
  } catch (err) {
    console.error('获取商品列表失败:', err);
    return NextResponse.json({ success: false, message: '获取商品列表失败' }, { status: 500 });
  }
}
