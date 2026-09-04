'use client';
import { useState, useEffect } from 'react';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api' : '/api';

export default function Dashboard() {
  const [stats, setStats] = useState({ products: 0, orders: 0, paid: 0, revenue: 0, pending: 0 });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [prodRes, orderRes] = await Promise.all([
        fetch(`${API_BASE}/products?all=1`, { cache: 'no-store' }),
        fetch(`${API_BASE}/orders`, { cache: 'no-store' })
      ]);
      const prodData = await prodRes.json();
      const orderData = await orderRes.json();
      const prods = prodData.products || prodData.data || [];
      const ords = orderData.orders || orderData.data || [];
      const paid = ords.filter(o => o.status === 'paid' || o.status === 'completed');
      setOrders(ords);
      setStats({
        products: prods.length,
        orders: ords.length,
        paid: paid.length,
        revenue: paid.reduce((s, o) => s + (o.amount || o.total || 0), 0).toFixed(2),
        pending: ords.filter(o => o.status === 'pending').length
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) return <div style={{padding: '40px', textAlign: 'center', color: '#6b7280'}}>加载中...</div>;

  return (
    <div style={{padding: '24px'}}>
      <h1 style={{fontSize: '22px', fontWeight: 700, marginBottom: '20px', color: '#111827'}}>数据概览</h1>
      <div className="stats-grid">
        {[
          {label: '商品总数', value: stats.products, bg: '#eff6ff', color: '#2563eb'},
          {label: '订单总数', value: stats.orders, bg: '#f0fdf4', color: '#059669'},
          {label: '待处理', value: stats.pending, bg: '#fffbeb', color: '#d97706'},
          {label: '总收入', value: '¥' + stats.revenue, bg: '#fef3c7', color: '#92400e'},
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-card-icon" style={{background: s.bg, color: s.color}}>{s.label.charAt(0)}</div>
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-value">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{marginTop: '20px'}}>
        <div className="card-header"><div className="card-title">最近订单</div></div>
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>订单号</th><th>商品</th><th className="hide-mobile">邮箱</th><th>金额</th><th>状态</th><th className="hide-mobile">时间</th></tr></thead>
            <tbody>
              {orders.slice(0, 8).map(o => (
                <tr key={o.id}>
                  <td style={{fontSize: '12px', fontFamily: 'monospace'}}>{o.order_no || o.id}</td>
                  <td>{o.product_name}</td>
                  <td className="hide-mobile">{o.email || o.contact || '-'}</td>
                  <td style={{color: '#dc2626', fontWeight: 600}}>¥{o.amount || o.total}</td>
                  <td><span className={`badge ${o.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>{o.status === 'paid' ? '已支付' : '待支付'}</span></td>
                  <td className="hide-mobile" style={{fontSize: '12px', color: '#9ca3af'}}>{o.created_at ? new Date(o.created_at).toLocaleString() : '-'}</td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan="6"><div style={{padding: '40px', textAlign: 'center', color: '#9ca3af'}}>暂无订单</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
