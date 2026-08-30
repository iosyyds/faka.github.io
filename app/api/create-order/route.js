import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { generateOrderNo } from '@/lib/security';

export async function POST(req) {
  try {
    const body = await req.json();
    const productId = body.product_id || body.productId;
    const email = body.email || body.contact;
    const payMethod = body.pay_method || 'alipay';

    if (!productId) {
      return NextResponse.json({ success: false, message: '缺少商品ID' }, { status: 400 });
    }

    // 验证邮箱
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, message: '请输入有效的邮箱地址' }, { status: 400 });
    }

    let quantity = parseInt(body.quantity, 10);
    if (isNaN(quantity) || quantity < 1) quantity = 1;
    if (quantity > 10) {
      return NextResponse.json({ success: false, message: '单次购买不能超过10件' }, { status: 400 });
    }

    const db = getDB();

    // 获取商品
    const product = await db.getProductById(productId);
    if (!product) {
      return NextResponse.json({ success: false, message: '商品不存在' }, { status: 404 });
    }

    // 检查库存
    const productsWithStock = await db.getProducts();
    const productWithStock = productsWithStock.find(p => p.id === productId);
    const stock = productWithStock ? productWithStock.stock : 0;
    if (stock < quantity) {
      return NextResponse.json({ success: false, message: `库存不足，当前剩余 ${stock} 件` }, { status: 400 });
    }

    const amount = Number((product.price * quantity).toFixed(2));
    if (amount <= 0) {
      return NextResponse.json({ success: false, message: '商品价格异常，请联系客服' }, { status: 500 });
    }

    const orderNo = generateOrderNo();

    // 创建订单
    let order = await db.createOrder(orderNo, productId, product.name, quantity, amount, email, null);

    // 更新订单状态为已支付
    try {
      await db.supabase
        .from('orders')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', order.id);
      order = { ...order, status: 'paid' };
    } catch (e) {
      console.error('更新订单状态失败:', e);
    }

    // 自动发货：取出卡密
    let cards = [];
    try {
      const { data: availableCards, error } = await db.supabase
        .from('cards')
        .select('*')
        .eq('product_id', productId)
        .eq('status', 'unsold')
        .order('created_at', { ascending: true })
        .limit(quantity);

      if (error) console.error('查询卡密失败:', error);

      if (availableCards && availableCards.length > 0) {
        cards = availableCards.slice(0, quantity);
        // 更新卡密状态为已售
        const cardIds = cards.map(c => c.id);
        await db.supabase
          .from('cards')
          .update({ status: 'sold', order_id: order.id || orderNo, sold_at: new Date().toISOString() })
          .in('id', cardIds);

        // 更新商品库存
        const newStock = Math.max(0, stock - quantity);
        await db.supabase
          .from('products')
          .update({ stock: newStock, sales: (product.sales || 0) + quantity })
          .eq('id', productId);
      }
    } catch (e) {
      console.error('自动发货失败:', e);
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        order_no: order.order_no || orderNo,
        product_name: order.product_name || product.name,
        quantity: order.quantity || quantity,
        amount: order.amount || amount,
        status: 'paid',
        email: email,
        cards: cards.map(c => ({ card_content: c.card_content || c.content || c }))
      }
    });

  } catch (err) {
    console.error('创建订单失败:', err);
    return NextResponse.json({ success: false, message: err.message || '创建订单失败' }, { status: 500 });
  }
}
