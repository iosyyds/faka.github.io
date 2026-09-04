'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '../admin.css';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api' : '/api';

const menuItems = [
  { key: 'dashboard', label: '数据概览', icon: '📊', path: '/admin' },
  { key: 'products', label: '商品管理', icon: '📦', path: '/admin/products' },
  { key: 'cards', label: '卡密管理', icon: '🔑', path: '/admin/cards' },
  { key: 'orders', label: '订单管理', icon: '📋', path: '/admin/orders' },
  { key: 'settings', label: '系统设置', icon: '⚙️', path: '/admin/settings' },
];

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ products: 0, orders: 0, paid: 0, revenue: 0, pending: 0 });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) { router.push('/admin/login'); return; }
    setAuthed(true);
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const [prodRes, orderRes] = await Promise.all([
        fetch(`${API_BASE}/products?all=1`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' }),
        fetch(`${API_BASE}/orders`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' })
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

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    router.push('/admin/login');
  };

  if (!authed) return null;
  if (loading) return <div className="admin-v2"><div style={{padding: '60px', textAlign: 'center', color: '#64748b'}}>加载中...</div></div>;

  return (
    <div className="admin-v2">
      <div className="admin-v2-layout">
        {/* 侧边栏 */}
        <aside className="admin-v2-sidebar">
          <div className="admin-v2-logo">
            <div className="admin-v2-logo-icon">甜</div>
            <div>
              <div className="admin-v2-logo-text">甜甜发卡</div>
              <div className="admin-v2-logo-sub">管理后台</div>
            </div>
          </div>
          <nav className="admin-v2-menu">
            {menuItems.map(item => (
              <div key={item.key} className={`admin-v2-menu-item ${item.key === 'dashboard' ? 'active' : ''}`} onClick={() => router.push(item.path)}>
                <span className="admin-v2-menu-icon">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </nav>
          <div className="admin-v2-sidebar-footer">
            <button className="admin-v2-logout-btn" onClick={handleLogout}>退出登录</button>
          </div>
        </aside>

        {/* 主内容区 */}
        <div className="admin-v2-main">
          <header className="admin-v2-header">
            <h1 className="admin-v2-header-title">数据概览</h1>
          </header>
          <div className="admin-v2-content">
            {/* 统计卡片 */}
            <div className="admin-v2-stats">
              <div className="admin-v2-stat-card">
                <div className="admin-v2-stat-icon" style={{background: '#dbeafe', color: '#2563eb'}}>📦</div>
                <div className="admin-v2-stat-label">商品总数</div>
                <div className="admin-v2-stat-value">{stats.products}</div>
              </div>
              <div className="admin-v2-stat-card">
                <div className="admin-v2-stat-icon" style={{background: '#dcfce7', color: '#16a34a'}}>📋</div>
                <div className="admin-v2-stat-label">订单总数</div>
                <div className="admin-v2-stat-value">{stats.orders}</div>
              </div>
              <div className="admin-v2-stat-card">
                <div className="admin-v2-stat-icon" style={{background: '#fef9c3', color: '#ca8a04'}}>⏳</div>
                <div className="admin-v2-stat-label">待处理</div>
                <div className="admin-v2-stat-value">{stats.pending}</div>
              </div>
              <div className="admin-v2-stat-card">
                <div className="admin-v2-stat-icon" style={{background: '#fef3c7', color: '#92400e'}}>💰</div>
                <div className="admin-v2-stat-label">总收入</div>
                <div className="admin-v2-stat-value">¥{stats.revenue}</div>
              </div>
            </div>

            {/* 最近订单 */}
            <div className="admin-v2-card">
              <div className="admin-v2-card-header">
                <div className="admin-v2-card-title">最近订单</div>
              </div>
              <div className="admin-v2-table-wrap">
                <table className="admin-v2-table">
                  <thead>
                    <tr>
                      <th>订单号</th>
                      <th>商品</th>
                      <th>邮箱</th>
                      <th>金额</th>
                      <th>状态</th>
                      <th>时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 8).map(o => (
                      <tr key={o.id}>
                        <td className="admin-v2-mono">{o.order_no || o.id}</td>
                        <td>{o.product_name}</td>
                        <td>{o.email || o.contact || '-'}</td>
                        <td className="admin-v2-price">¥{o.amount || o.total}</td>
                        <td><span className={`admin-v2-badge ${o.status === 'paid' ? 'admin-v2-badge-success' : 'admin-v2-badge-warning'}`}>{o.status === 'paid' ? '已支付' : '待支付'}</span></td>
                        <td style={{fontSize: '12px', color: '#94a3b8'}}>{o.created_at ? new Date(o.created_at).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr><td colSpan="6"><div className="admin-v2-empty"><div className="admin-v2-empty-icon">📭</div><div className="admin-v2-empty-text">暂无订单</div></div></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* 移动端底部导航 */}
        <nav className="admin-v2-mobile-nav">
          {menuItems.map(item => (
            <div key={item.key} className={`admin-v2-mobile-nav-item ${item.key === 'dashboard' ? 'active' : ''}`} onClick={() => router.push(item.path)}>
              <span className="admin-v2-mobile-nav-icon">{item.icon}</span>
              <span className="admin-v2-mobile-nav-label">{item.label.replace('管理', '')}</span>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
