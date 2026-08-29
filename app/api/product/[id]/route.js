import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET(req, { params }) {
  try {
    const { id } = params;
    const productId = parseInt(id, 10);

    if (isNaN(productId)) {
      return NextResponse.json({ success: false, message: '无效的商品ID' }, { status: 400 });
    }

    const db = getDB();
    const products = await db.getProducts();
    const product = products.find(p => p.id === productId);

    if (!product) {
      return NextResponse.json({ success: false, message: '商品不存在' }, { status: 404 });
    }

    // 计算库存
    const cards = await db.getAvailableCards(productId);
    const stock = cards.length;

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        detail: product.detail || '',
        images: product.images || '',
        image: product.image || '',
        category: product.category || '全部',
        price: product.price,
        original_price: product.original_price || 0,
        sales: product.sales || 0,
        stock,
        created_at: product.created_at
      }
    });
  } catch (err) {
    console.error('获取商品详情失败:', err);
    return NextResponse.json({ success: false, message: err.message || '获取失败' }, { status: 500 });
  }
}
