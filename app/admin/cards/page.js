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

export default function Cards() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [cards, setCards] = useState([]);
  const [importText, setImportText] = useState('');
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) { router.push('/admin/login'); return; }
    setAuthed(true);
    loadProducts();
  }, [router]);

  const loadProducts = async () => {
    const token = localStorage.getItem('admin_token');
    const res = await fetch(`${API_BASE}/products?all=1`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' });
    const data = await res.json();
    setProducts(data.products || data.data || []);
  };

  const loadCards = async () => {
    if (!selectedProduct) return;
    const token = localStorage.getItem('admin_token');
    const res = await fetch(`${API_BASE}/cards?product_id=${selectedProduct}`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' });
    const data = await res.json();
    setCards(data.cards || data.data || []);
  };

  const importCards = async () => {
    if (!selectedProduct) { alert('请先选择商品'); return; }
    if (!importText.trim()) { alert('请输入卡密内容'); return; }
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/cards/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ product_id: selectedProduct, cards: importText })
      });
      const data = await res.json();
      if (data.success) { alert(`成功导入 ${data.count || 0} 条卡密`); setImportText(''); loadCards(); }
      else alert(data.error || '导入失败');
    } catch (e) { alert('导入失败'); }
  };

  const handleLogout = () => { localStorage.removeItem('admin_token'); router.push('/admin/login'); };
  if (!authed) return null;

  return (
    <div className="admin-v2"><div className="admin-v2-layout">
      <aside className="admin-v2-sidebar">
        <div className="admin-v2-logo"><div className="admin-v2-logo-icon">甜</div><div><div className="admin-v2-logo-text">甜甜发卡</div><div className="admin-v2-logo-sub">管理后台</div></div></div>
        <nav className="admin-v2-menu">{menuItems.map(item => (<div key={item.key} className={`admin-v2-menu-item ${item.key === 'cards' ? 'active' : ''}`} onClick={() => router.push(item.path)}><span className="admin-v2-menu-icon">{item.icon}</span><span>{item.label}</span></div>))}</nav>
        <div className="admin-v2-sidebar-footer"><button className="admin-v2-logout-btn" onClick={handleLogout}>退出登录</button></div>
      </aside>
      <div className="admin-v2-main">
        <header className="admin-v2-header"><h1 className="admin-v2-header-title">卡密管理</h1></header>
        <div className="admin-v2-content">
          <div className="admin-v2-card" style={{marginBottom: '24px'}}>
            <div className="admin-v2-card-header"><div className="admin-v2-card-title">批量导入卡密</div></div>
            <div className="admin-v2-card-body">
              <div className="admin-v2-form-group"><label className="admin-v2-form-label">选择商品</label><select className="admin-v2-form-select" value={selectedProduct} onChange={(e) => { setSelectedProduct(e.target.value); setCards([]); }}><option value="">请选择商品</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div className="admin-v2-form-group"><label className="admin-v2-form-label">卡密内容（每行一个）</label><textarea className="admin-v2-form-textarea" style={{minHeight: '120px', fontFamily: 'monospace'}} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder={'卡号----密码\n卡号----密码\n...'} /></div>
              <div style={{fontSize: '13px', color: '#64748b', marginBottom: '16px'}}>共 {importText.split('\n').filter(c => c.trim()).length} 条卡密</div>
              <button className="admin-v2-btn admin-v2-btn-primary" onClick={importCards}>导入卡密</button>
            </div>
          </div>
          {selectedProduct && (
            <div className="admin-v2-card">
              <div className="admin-v2-card-header"><div className="admin-v2-card-title">卡密列表（{cards.length}）</div><button className="admin-v2-btn admin-v2-btn-sm admin-v2-btn-secondary" onClick={loadCards}>刷新</button></div>
              <div className="admin-v2-table-wrap">
                <table className="admin-v2-table">
                  <thead><tr><th>ID</th><th>卡密内容</th><th>状态</th><th>创建时间</th></tr></thead>
                  <tbody>
                    {cards.slice(0, 50).map(c => (<tr key={c.id}><td>{c.id}</td><td className="admin-v2-mono">{c.card_content || c.content}</td><td><span className={`admin-v2-badge ${c.status === 'available' ? 'admin-v2-badge-success' : 'admin-v2-badge-secondary'}`}>{c.status === 'available' ? '未售' : '已售'}</span></td><td style={{fontSize: '12px', color: '#94a3b8'}}>{c.created_at ? new Date(c.created_at).toLocaleString() : '-'}</td></tr>))}
                    {cards.length === 0 && <tr><td colSpan="4"><div className="admin-v2-empty"><div className="admin-v2-empty-icon">🔑</div><div className="admin-v2-empty-text">暂无卡密</div></div></td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
      <nav className="admin-v2-mobile-nav">{menuItems.map(item => (<div key={item.key} className={`admin-v2-mobile-nav-item ${item.key === 'cards' ? 'active' : ''}`} onClick={() => router.push(item.path)}><span className="admin-v2-mobile-nav-icon">{item.icon}</span><span className="admin-v2-mobile-nav-label">{item.label.replace('管理', '')}</span></div>))}</nav>
    </div></div>
  );
}
