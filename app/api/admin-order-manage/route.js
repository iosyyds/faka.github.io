import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyAdminToken } from '@/lib/security';

function getAuthToken(req) {
  const auth = req.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

export async function POST(req) {
  try {
    const token = getAuthToken(req);
    if (!verifyAdminToken(token)) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    const body = await req.json();
    const { action, orderId, remark } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, message: '缺少订单ID' }, { status: 400 });
    }

    const db = getDB();
    const order = await db.getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, message: '订单不存在' }, { status: 404 });
    }

    switch (action) {
      case 'mark_paid': {
        if (order.status !== 'pending') {
          return NextResponse.json({ success: false, message: '只有待支付订单才能标记为已支付' }, { status: 400 });
        }
        const updated = await db.manualMarkPaid(orderId);
        if (updated) {
          try {
            await db.consumeCards(order.product_id, order.quantity, updated.id);
          } catch (cardErr) {
            console.error('手动发卡失败:', cardErr);
            return NextResponse.json({ success: false, message: '订单状态已更新，但发卡失败：' + cardErr.message }, { status: 500 });
          }
        }
        return NextResponse.json({ success: true, message: '订单已标记为已支付并完成发卡' });
      }

      case 'mark_failed': {
        if (order.status !== 'pending') {
          return NextResponse.json({ success: false, message: '只有待支付订单才能标记为失败' }, { status: 400 });
        }
        await db.markOrderFailed(orderId);
        return NextResponse.json({ success: true, message: '订单已标记为失败' });
      }

      case 'delete': {
        await db.deleteOrder(orderId);
        return NextResponse.json({ success: true, message: '订单已删除' });
      }

      case 'update_remark': {
        await db.updateOrderRemark(orderId, remark || '');
        return NextResponse.json({ success: true, message: '备注已更新' });
      }

      default:
        return NextResponse.json({ success: false, message: '不支持的操作类型' }, { status: 400 });
    }
  } catch (err) {
    console.error('订单管理失败:', err);
    return NextResponse.json({ success: false, message: err.message || '操作失败' }, { status: 500 });
  }
}
