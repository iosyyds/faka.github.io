import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyAdminToken } from '@/lib/security';

function getAuthToken(req) {
  const auth = req.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

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
    const cards = await db.getCardsByProductId(productId, 'available', 1000);
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
        tag: product.tag || '',
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

export async function PUT(request, { params }) {
  try {
    const token = getAuthToken(request);
    if (!verifyAdminToken(token)) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    const { id } = params;
    const body = await request.json();
    const db = getDB();
    const updates = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.desc !== undefined) updates.description = body.desc;
    if (body.price !== undefined) updates.price = parseFloat(body.price);
    if (body.original_price !== undefined) updates.original_price = body.original_price ? parseFloat(body.original_price) : null;
    if (body.category !== undefined) updates.category = body.category;
    if (body.stock !== undefined) updates.stock = parseInt(body.stock) || 0;
    if (body.image !== undefined) updates.image = body.image;
    if (body.tag !== undefined) updates.tag = body.tag;
    if (body.detail !== undefined) updates.detail = body.detail;
    if (body.sort !== undefined || body.sort_order !== undefined) {
      const sortVal = parseInt(body.sort) || parseInt(body.sort_order) || 0;
      updates.sort = sortVal;
      updates.sort_order = sortVal;
    }
    if (body.status !== undefined) {
      updates.status = body.status;
      updates.is_active = body.status === 'active';
    }
    if (body.is_active !== undefined) {
      updates.is_active = body.is_active;
      updates.status = body.is_active ? 'active' : 'inactive';
    }
    if (body.sales !== undefined) updates.sales = parseInt(body.sales) || 0;
    // 防止字段超长导致数据库报错
    if (updates.detail && updates.detail.length > 5000) {
      updates.detail = updates.detail.substring(0, 5000);
    }
    if (updates.description && updates.description.length > 1000) {
      updates.description = updates.description.substring(0, 1000);
    }
    
    const { data, error } = await db.client
      .from('products')
      .update(updates)
      .eq('id', parseInt(id))
      .select();
    if (error) {
      // 字段超长错误的友好提示
      if (error.message && error.message.includes('too long') || error.message && error.message.includes('varying')) {
        return NextResponse.json({ 
          error: '商品详情内容过长，请精简后再保存（建议不超过500字）。如需支持更长内容，请在Supabase中将detail字段改为text类型。' 
        }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, product: data[0] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const token = getAuthToken(request);
    if (!verifyAdminToken(token)) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    const { id } = params;
    const db = getDB();
    const { error } = await db.client
      .from('products')
      .delete()
      .eq('id', parseInt(id));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
