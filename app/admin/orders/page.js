'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '../admin.css';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api';
const menuItems = [
  { key: 'dashboard', label: '数据概览', icon: '📊', path: '/admin' },
  { key: 'products', label: '商品管理', icon: '📦', path: '/admin/products' },
  { key: 'cards', label: '卡密管理', icon: '🔑', path: '/admin/cards' },
  { key: 'orders', label: '订单管理', icon: '📋', path: '/admin/orders' },
  { key: 'settings', label: '系统设置', icon: '⚙️', path: '/admin/settings' },
];

export default function Orders() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) { router.push('/admin/login'); return; }
    setAuthed(true);
    loadOrders();
  }, [router]);

  const loadOrders = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const url = filter === 'all' ? `${API_BASE}/orders` : `${API_BASE}/orders?status=${filter}`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' });
      const data = await res.json();
      setOrders(data.orders || data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const markPaid = async (id) => {
    if (!confirm('确定标记为已支付吗？')) return;
    try {
      const token = localStorage.getItem('admin_token');
      await fetch(`${API_BASE}/order/${id}/pay`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      loadOrders();
    } catch (e) { alert('操作失败'); }
  };

  const handleLogout = () => { localStorage.removeItem('admin_token'); router.push('/admin/login'); };
  if (!authed) return null;
  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  return (
    <div className="admin-v2"><div className="admin-v2-layout">
      <aside className="admin-v2-sidebar">
        <div className="admin-v2-logo"><div className="admin-v2-logo-icon">甜</div><div><div className="admin-v2-logo-text">甜甜发卡</div><div className="admin-v2-logo-sub">管理后台</div></div></div>
        <nav className="admin-v2-menu">{menuItems.map(item => (<div key={item.key} className={`admin-v2-menu-item ${item.key === 'orders' ? 'active' : ''}`} onClick={() => router.push(item.path)}><span className="admin-v2-menu-icon">{item.icon}</span><span>{item.label}</span></div>))}</nav>
        <div className="admin-v2-sidebar-footer"><button className="admin-v2-logout-btn" onClick={handleLogout}>退出登录</button></div>
      </aside>
      <div className="admin-v2-main">
        <header className="admin-v2-header">
          <h1 className="admin-v2-header-title">订单管理</h1>
          <div className="admin-v2-header-actions">
            {['all', 'pending', 'paid'].map(s => (<button key={s} className={`admin-v2-btn admin-v2-btn-sm ${filter === s ? 'admin-v2-btn-primary' : 'admin-v2-btn-secondary'}`} onClick={() => { setFilter(s); setTimeout(loadOrders, 0); }}>{s === 'all' ? '全部' : s === 'pending' ? '待支付' : '已支付'}</button>))}
          </div>
        </header>
        <div className="admin-v2-content">
          <div className="admin-v2-card">
            <div className="admin-v2-table-wrap">
              <table className="admin-v2-table">
                <thead><tr><th>订单号</th><th>商品</th><th>邮箱</th><th>数量</th><th>金额</th><th>状态</th><th>时间</th><th>操作</th></tr></thead>
                <tbody>
                  {filtered.map(o => (<tr key={o.id}>
                    <td className="admin-v2-mono">{o.order_no || o.id}</td>
                    <td>{o.product_name}</td>
                    <td>{o.email || o.contact || '-'}</td>
                    <td>{o.quantity || 1}</td>
                    <td className="admin-v2-price">¥{o.amount || o.total}</td>
                    <td><span className={`admin-v2-badge ${o.status === 'paid' ? 'admin-v2-badge-success' : 'admin-v2-badge-warning'}`}>{o.status === 'paid' ? '已支付' : '待支付'}</span></td>
                    <td style={{fontSize: '12px', color: '#94a3b8'}}>{o.created_at ? new Date(o.created_at).toLocaleString() : '-'}</td>
                    <td>{o.status !== 'paid' && <button className="admin-v2-btn admin-v2-btn-sm admin-v2-btn-secondary" onClick={() => markPaid(o.id)}>标记已付</button>}</td>
                  </tr>))}
                  {filtered.length === 0 && !loading && <tr><td colSpan="8"><div className="admin-v2-empty"><div className="admin-v2-empty-icon">📋</div><div className="admin-v2-empty-text">暂无订单</div></div></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <nav className="admin-v2-mobile-nav">{menuItems.map(item => (<div key={item.key} className={`admin-v2-mobile-nav-item ${item.key === 'orders' ? 'active' : ''}`} onClick={() => router.push(item.path)}><span className="admin-v2-mobile-nav-icon">{item.icon}</span><span className="admin-v2-mobile-nav-label">{item.label.replace('管理', '')}</span></div>))}</nav>
    </div></div>
  );
}
