'use client';
import { useState, useEffect } from 'react';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api' : '/api';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    try {
      const url = filter === 'all' ? `${API_BASE}/orders` : `${API_BASE}/orders?status=${filter}`;
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      setOrders(data.orders || data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const markPaid = async (id) => {
    if (!confirm('确定标记为已支付吗？')) return;
    try {
      await fetch(`${API_BASE}/order/${id}/pay`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` } });
      loadOrders();
    } catch (e) { alert('操作失败'); }
  };

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  if (loading) return <div style={{padding: '40px', textAlign: 'center', color: '#6b7280'}}>加载中...</div>;

  return (
    <div style={{padding: '24px'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h1 style={{fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0}}>订单管理</h1>
        <div style={{display: 'flex', gap: '8px'}}>
          {['all', 'pending', 'paid'].map(s => (
            <button key={s} onClick={() => { setFilter(s); setTimeout(loadOrders, 0); }} style={{padding: '6px 14px', background: filter === s ? '#2563eb' : '#f3f4f6', color: filter === s ? 'white' : '#374151', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px'}}>
              {s === 'all' ? '全部' : s === 'pending' ? '待支付' : '已支付'}
            </button>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>订单号</th><th>商品</th><th className="hide-mobile">邮箱</th><th>数量</th><th>金额</th><th>状态</th><th className="hide-mobile">时间</th><th>操作</th></tr></thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id}>
                  <td style={{fontSize: '12px', fontFamily: 'monospace'}}>{o.order_no || o.id}</td>
                  <td>{o.product_name}</td>
                  <td className="hide-mobile">{o.email || o.contact || '-'}</td>
                  <td>{o.quantity || 1}</td>
                  <td style={{color: '#dc2626', fontWeight: 600}}>¥{o.amount || o.total}</td>
                  <td><span className={`badge ${o.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>{o.status === 'paid' ? '已支付' : '待支付'}</span></td>
                  <td className="hide-mobile" style={{fontSize: '12px', color: '#9ca3af'}}>{o.created_at ? new Date(o.created_at).toLocaleString() : '-'}</td>
                  <td>{o.status !== 'paid' && <button onClick={() => markPaid(o.id)} style={{padding: '4px 10px', background: '#f0fdf4', color: '#059669', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px'}}>标记已付</button>}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="8"><div style={{padding: '40px', textAlign: 'center', color: '#9ca3af'}}>暂无订单</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
