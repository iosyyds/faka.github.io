'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const menuItems = [
  { key: 'dashboard', label: '数据概览', path: '/admin' },
  { key: 'products', label: '商品管理', path: '/admin/products' },
  { key: 'cards', label: '卡密管理', path: '/admin/cards' },
  { key: 'orders', label: '订单管理', path: '/admin/orders' },
  { key: 'settings', label: '系统设置', path: '/admin/settings' },
];

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    setAuthed(true);
    setLoading(false);
  }, [router]);

  if (loading) return <div style={{padding: '40px', textAlign: 'center', color: '#6b7280'}}>加载中...</div>;
  if (!authed) return null;

  const currentKey = pathname === '/admin' || pathname === '/admin/' ? 'dashboard' : pathname.split('/')[2] || 'dashboard';

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <div className="admin-sidebar-logo-icon">甜</div>
          <span>甜甜发卡后台</span>
        </div>
        <nav className="admin-sidebar-menu">
          {menuItems.map(item => (
            <div
              key={item.key}
              className={`admin-sidebar-item ${currentKey === item.key ? 'active' : ''}`}
              onClick={() => router.push(item.path)}
            >
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <button onClick={() => { localStorage.removeItem('admin_token'); router.push('/admin/login'); }} style={{background:'none',border:'none',color:'#6b7280',cursor:'pointer',fontSize:'13px'}}>退出登录</button>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
      <nav className="admin-mobile-nav">
        {menuItems.map(item => (
          <div
            key={item.key}
            className={`admin-mobile-nav-item ${currentKey === item.key ? 'active' : ''}`}
            onClick={() => router.push(item.path)}
          >
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
    </div>
  );
}
