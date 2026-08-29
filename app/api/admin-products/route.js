import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyAdminToken } from '@/lib/security';

function getAuthToken(req) {
  const auth = req.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

export async function GET(req) {
  try {
    const token = getAuthToken(req);
    if (!verifyAdminToken(token)) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }
    const db = getDB();
    const products = await db.getProducts(true);
    return NextResponse.json({ success: true, products });
  } catch (err) {
    console.error('获取商品失败:', err);
    return NextResponse.json({ success: false, message: '操作失败' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const token = getAuthToken(req);
    if (!verifyAdminToken(token)) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }
    const body = await req.json();
    const { name, description, price, sort_order, category } = body;
    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: '商品名称不能为空' }, { status: 400 });
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      return NextResponse.json({ success: false, message: '价格必须大于0' }, { status: 400 });
    }
    const db = getDB();
    const product = await db.addProduct(
      name.trim(),
      (description || '').trim(),
      priceNum,
      parseInt(sort_order, 10) || 0,
      (category || '全部').trim()
    );
    return NextResponse.json({ success: true, product });
  } catch (err) {
    console.error('添加商品失败:', err);
    return NextResponse.json({ success: false, message: err.message || '操作失败' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const token = getAuthToken(req);
    if (!verifyAdminToken(token)) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: '缺少商品ID' }, { status: 400 });

    const body = await req.json();
    const updates = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined) updates.description = body.description;
    if (body.price !== undefined) {
      const priceNum = parseFloat(body.price);
      if (isNaN(priceNum) || priceNum <= 0) {
        return NextResponse.json({ success: false, message: '价格必须大于0' }, { status: 400 });
      }
      updates.price = priceNum;
    }
    if (body.sort_order !== undefined) updates.sort_order = parseInt(body.sort_order, 10) || 0;
    if (body.category !== undefined) updates.category = body.category || '全部';
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, message: '没有需要更新的字段' }, { status: 400 });
    }

    const db = getDB();
    const product = await db.updateProduct(id, updates);
    return NextResponse.json({ success: true, product });
  } catch (err) {
    console.error('更新商品失败:', err);
    return NextResponse.json({ success: false, message: err.message || '操作失败' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const token = getAuthToken(req);
    if (!verifyAdminToken(token)) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: '缺少商品ID' }, { status: 400 });

    const db = getDB();
    await db.deleteProduct(id);
    return NextResponse.json({ success: true, message: '商品已删除' });
  } catch (err) {
    console.error('删除商品失败:', err);
    return NextResponse.json({ success: false, message: err.message || '操作失败' }, { status: 500 });
  }
}
