'use client';
import { useState, useEffect } from 'react';
import Icon from '@/components/Icon';
import { useRouter } from 'next/navigation';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

const MENU = [
  { key: 'dashboard', label: '数据概览', icon: 'chart' },
  { key: 'products', label: '商品管理', icon: 'box' },
  { key: 'cards', label: '卡密管理', icon: 'key' },
  { key: 'orders', label: '订单管理', icon: 'file' },
  { key: 'settings', label: '系统设置', icon: 'settings' },
];

export default function Admin() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);

  const [stats, setStats] = useState({ products: 0, orders: 0, paid: 0, revenue: 0, pending: 0 });
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState({});
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBannerImage, setUploadingBannerImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ name: '', price: '', original_price: '', category: '', stock: 0, sales: 0, description: '', detail: '', image: '', tag: '', status: 'active' });

  const [showCardModal, setShowCardModal] = useState(false);
  const [cardProductId, setCardProductId] = useState('');
  const [cardContent, setCardContent] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);

  // 折叠面板状态
  const [collapsedSections, setCollapsedSections] = useState({
    settingsBasic: false,
    settingsBanner: true,
    settingsFooter: true,
    settingsContent: true,
    settingsEmail: true,
  });

  const toggleSection = (key) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    document.title = '甜甜发卡-后台管理';
    const token = localStorage.getItem('admin_token');
    if (token) { setAuthed(true); loadData(); }
    setAuthLoading(false);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.password) { alert('请输入密码'); return; }
    setLoginLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin-login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('admin_token', data.token);
        setAuthed(true); loadData();
      } else { alert(data.error || '登录失败'); }
    } catch (e) { alert('登录失败'); }
    finally { setLoginLoading(false); }
  };

  const handleLogout = () => { localStorage.removeItem('admin_token'); setAuthed(false); };

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, orderRes, setRes] = await Promise.all([
        fetch(`${API_BASE}/products?all=1`), fetch(`${API_BASE}/orders`), fetch(`${API_BASE}/settings`)
      ]);
      const prodData = await prodRes.json();
      const orderData = await orderRes.json();
      const setData = await setRes.json();
      const prods = prodData.products || prodData.data || [];
      const ords = orderData.orders || orderData.data || [];
      const sets = setData.settings || setData.data || {};
      setProducts(prods); setOrders(ords);
      setSettings(sets);
      // 同步favicon
      if (sets.site_logo) {
        let favicon = document.querySelector('link[rel="icon"]');
        if (!favicon) {
          favicon = document.createElement('link');
          favicon.rel = 'icon';
          document.head.appendChild(favicon);
        }
        favicon.href = sets.site_logo;
      }
      const paid = ords.filter(o => o.status === 'paid' || o.status === 'completed');
      setStats({
        products: prods.length, orders: ords.length, paid: paid.length,
        revenue: paid.reduce((s, o) => s + (o.amount || o.total || 0), 0).toFixed(2),
        pending: ords.filter(o => o.status === 'pending').length
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // 只加载商品数据（保存后刷新用）
  const loadProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/products?all=1`, { cache: 'no-store' });
      const data = await res.json();
      const prods = data.products || data.data || [];
      setProducts(prods);
      setStats(s => ({ ...s, products: prods.length }));
    } catch (e) { console.error('加载商品失败:', e); }
  };

  const saveProduct = async () => {
    if (!productForm.name || !productForm.price) { alert('请填写商品名称和价格'); return; }
    try {
      const url = editingProduct ? `${API_BASE}/product/${editingProduct.id}` : `${API_BASE}/product`;
      const method = editingProduct ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: JSON.stringify(productForm)
      });
      const data = await res.json();
      if (data.success || data.product || data.id) {
        alert('保存成功'); 
        setShowProductModal(false);
        // 只重新加载商品数据，不刷新整个页面，保持在当前页面
        await loadProducts();
      } else {
        const errMsg = data.error || data.message || '保存失败';
        if (res.status === 401) { alert('登录已过期，请重新登录'); localStorage.removeItem('admin_token'); router.push('/admin'); return; }
        alert(errMsg);
      }
    } catch (e) { alert('保存失败：' + (e.message || '')); }
  };

  const deleteProduct = async (id) => {
    if (!confirm('确定删除该商品？')) return;
    try {
      await fetch(`${API_BASE}/product/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` } });
      alert('删除成功'); loadData();
    } catch (e) { alert('删除失败'); }
  };

  const importCards = async () => {
    if (!cardProductId || !cardContent) { alert('请选择商品并输入卡密'); return; }
    const cards = cardContent.split('\n').filter(c => c.trim());
    try {
      const res = await fetch(`${API_BASE}/cards/import`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: JSON.stringify({ product_id: cardProductId, cards })
      });
      const data = await res.json();
      if (data.success || data.imported) {
        alert(`成功导入 ${data.imported || cards.length} 条卡密`);
        setShowCardModal(false); setCardContent(''); loadData();
      } else { alert(data.error || '导入失败'); }
    } catch (e) { alert('导入失败'); }
  };

  // 上传Logo
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/upload-logo`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setSettings({...settings, site_logo: data.logo_url});
        // 立即更新favicon
        let favicon = document.querySelector('link[rel="icon"]');
        if (!favicon) {
          favicon = document.createElement('link');
          favicon.rel = 'icon';
          document.head.appendChild(favicon);
        }
        favicon.href = data.logo_url;
        alert('Logo上传成功');
      } else {
        alert(data.message || '上传失败');
      }
    } catch (err) {
      alert('上传失败: ' + err.message);
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  // 上传横幅图片
  const handleBannerImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('图片不能超过2MB');
      return;
    }
    setUploadingBannerImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('admin_token') }
      });
      const data = await res.json();
      if (data.success || data.url) {
        setSettings({...settings, banner_image: data.url});
        alert('横幅图片上传成功');
      } else {
        alert('上传失败: ' + (data.error || '未知错误'));
      }
    } catch (err) {
      alert('上传失败: ' + err.message);
    } finally {
      setUploadingBannerImage(false);
      e.target.value = '';
    }
  };

  // 上传商品图片
  const handleProductImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/upload-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setProductForm({...productForm, image: data.url});
      } else {
        alert(data.message || '上传失败');
      }
    } catch (err) {
      alert('上传失败: ' + err.message);
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const saveSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        alert('保存成功');
      } else {
        const errMsg = data.error || data.message || '保存失败';
        if (res.status === 401) { alert('登录已过期，请重新登录'); localStorage.removeItem('admin_token'); router.push('/admin'); return; }
        alert(errMsg);
      }
    } catch (e) { alert('保存失败：' + (e.message || '')); }
  };

  const handleTestEmail = async () => {
    if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      alert('请输入有效的测试邮箱地址');
      return;
    }
    setTestingEmail(true);
    try {
      const res = await fetch(`${API_BASE}/test-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: JSON.stringify({ test_email: testEmail })
      });
      const data = await res.json();
      if (data.success) {
        alert('测试邮件已发送，请查收收件箱（可能在垃圾邮件中）');
      } else {
        alert(data.error || '发送失败，请检查SMTP配置');
      }
    } catch (e) {
      alert('发送失败: ' + e.message);
    } finally {
      setTestingEmail(false);
    }
  };

  const markPaid = async (id) => {
    if (!confirm('确定标记该订单为已支付？')) return;
    try {
      await fetch(`${API_BASE}/admin-order-manage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: JSON.stringify({ action: 'mark_paid', order_id: id })
      });
      alert('操作成功'); loadData();
    } catch (e) { alert('操作失败'); }
  };

  if (authLoading) return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc'}}><div style={{width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite'}}></div><style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style></div>;

  if (!authed) {
    return (
      <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '20px'}}>
        <div className="card animate-fade-in" style={{width: '100%', maxWidth: '400px'}}>
          <div className="card-body" style={{padding: '36px 32px'}}>
            <div style={{textAlign: 'center', marginBottom: '24px'}}>
              <div style={{width: '56px', height: '56px', margin: '0 auto 14px', background: '#2563eb', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '24px', fontWeight: 700}}>{settings.logo_text || '甜'}</div>
              <h1 style={{fontSize: '20px', fontWeight: 600, color: '#111827', marginBottom: '4px'}}>管理后台</h1>
              <p style={{fontSize: '13px', color: '#6b7280'}}>甜甜发卡管理系统</p>
            </div>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">用户名</label>
                <input type="text" className="form-input" value={loginForm.username} onChange={(e) => setLoginForm({...loginForm, username: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">密码</label>
                <input type="password" className="form-input" placeholder="请输入密码" value={loginForm.password} onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary btn-lg" style={{width: '100%'}} disabled={loginLoading}>
                {loginLoading ? '登录中...' : '登 录'}
              </button>
            </form>
            <div style={{marginTop: '14px', textAlign: 'center', fontSize: '12px', color: '#9ca3af'}}>默认账号：admin / admin123</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <div className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <div style={{width: '32px', height: '32px', background: '#2563eb', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '14px'}}>{settings.logo_text || '甜'}</div>
          管理后台
        </div>
        <div>
          {MENU.map((item) => (
            <div key={item.key} className={`admin-sidebar-item ${activeMenu === item.key ? 'active' : ''}`} onClick={() => router.push(item.path)}>
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
        <div style={{position: 'absolute', bottom: '20px', left: 0, right: 0, textAlign: 'center'}}>
          <button onClick={handleLogout} style={{background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '13px', padding: '8px 16px'}}>退出登录</button>
        </div>
      </div>

      <div className="admin-main">
        <div className="admin-header" style={{justifyContent: 'center'}}>
          <div className="admin-header-title">{MENU.find(m => m.key === activeMenu)?.label}</div>
        </div>

        <div className="admin-content">
          {activeMenu === 'dashboard' && (
            <div>
              <div className="stats-grid">
                {[
                  {label: '商品总数', value: stats.products, icon: 'box', bg: '#eff6ff', color: '#2563eb'},
                  {label: '订单总数', value: stats.orders, icon: 'file', bg: '#f0fdf4', color: '#059669'},
                  {label: '待处理', value: stats.pending, icon: 'alert', bg: '#fffbeb', color: '#d97706'},
                  {label: '总收入', value: '¥' + stats.revenue, icon: 'money', bg: '#fef3c7', color: '#92400e'},
                ].map((s, i) => (
                  <div key={i} className="stat-card animate-fade-in" style={{animationDelay: `${i * 0.03}s`}}>
                    <div className="stat-card-icon" style={{background: s.bg, color: s.color}}><Icon name={s.icon} size={20} /></div>
                    <div className="stat-card-label">{s.label}</div>
                    <div className="stat-card-value">{s.value}</div>
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">最近订单</div></div>
                <div className="table-wrapper">
                  <table className="table">
                    <thead><tr><th>订单号</th><th>商品</th><th className="hide-mobile">邮箱</th><th>金额</th><th>状态</th><th className="hide-mobile">时间</th></tr></thead>
                    <tbody>
                      {orders.slice(0, 8).map(o => (
                        <tr key={o.id}>
                          <td className="mono" style={{fontSize: '12px'}}>{o.order_no || o.id}</td>
                          <td>{o.product_name}</td>
                          <td className="hide-mobile">{o.email || o.contact || '-'}</td>
                          <td className="price-primary">¥{o.amount || o.total}</td>
                          <td><span className={`badge ${o.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>{o.status === 'paid' ? '已支付' : '待支付'}</span></td>
                          <td className="hide-mobile" style={{fontSize: '12px', color: '#9ca3af'}}>{o.created_at ? new Date(o.created_at).toLocaleString() : '-'}</td>
                        </tr>
                      ))}
                      {orders.length === 0 && <tr><td colSpan="6"><div className="empty"><div className="empty-text">暂无订单</div></div></td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeMenu === 'products' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">商品列表（{products.length}）</div>
                <button className="btn btn-primary btn-sm" onClick={() => { setEditingProduct(null); setProductForm({name: '', price: '', original_price: '', category: '', stock: 0, sales: 0, description: '', detail: '', image: '', tag: '', status: 'active'}); setShowProductModal(true); }}>➕ 添加商品</button>
              </div>
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>ID</th><th>商品名称</th><th className="hide-mobile">分类</th><th>价格</th><th>库存</th><th>状态</th><th>操作</th></tr></thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id}>
                        <td>{p.id}</td>
                        <td style={{fontWeight: 500, color: '#111827'}}>{p.name}</td>
                        <td className="hide-mobile">{p.category || '-'}</td>
                        <td className="price-primary">¥{p.price}</td>
                        <td>{p.stock}</td>
                        <td><span className={`badge ${(p.status === 'active' || p.is_active === true) ? 'badge-success' : 'badge-secondary'}`}>{(p.status === 'active' || p.is_active === true) ? '上架' : '下架'}</span></td>
                        <td>
                          <div style={{display: 'flex', gap: '6px'}}>
                            <button className="btn btn-secondary btn-sm" onClick={() => { setEditingProduct(p); setProductForm({name: p.name, price: p.price, original_price: p.original_price || '', category: p.category || '', stock: p.stock || 0, sales: p.sales || 0, description: p.description || '', detail: p.detail || '', image: p.image || '', tag: p.tag || '', status: (p.status || (p.is_active ? 'active' : 'inactive'))}); setShowProductModal(true); }}>编辑</button>
                            <button className="btn btn-danger btn-sm" onClick={() => deleteProduct(p.id)}>删除</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeMenu === 'cards' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">卡密库存</div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowCardModal(true)}>➕ 批量导入卡密</button>
              </div>
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>ID</th><th>商品名称</th><th className="hide-mobile">分类</th><th>价格</th><th>库存</th><th>操作</th></tr></thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id}>
                        <td>{p.id}</td>
                        <td style={{color: '#111827', fontWeight: 500}}>{p.name}</td>
                        <td className="hide-mobile">{p.category || '-'}</td>
                        <td className="price-primary">¥{p.price}</td>
                        <td><span className={`badge ${p.stock > 10 ? 'badge-success' : p.stock > 0 ? 'badge-warning' : 'badge-danger'}`}>{p.stock} 件</span></td>
                        <td><button className="btn btn-primary btn-sm" onClick={() => { setCardProductId(p.id); setShowCardModal(true); }}>导入卡密</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeMenu === 'orders' && (
            <div className="card">
              <div className="card-header"><div className="card-title">订单列表（{orders.length}）</div></div>
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>订单号</th><th>商品</th><th className="hide-mobile">邮箱</th><th>金额</th><th>状态</th><th className="hide-mobile">时间</th><th>操作</th></tr></thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id}>
                        <td className="mono" style={{fontSize: '12px'}}>{o.order_no || o.id}</td>
                        <td>{o.product_name}</td>
                        <td className="hide-mobile">{o.email || o.contact || '-'}</td>
                        <td className="price-primary">¥{o.amount || o.total}</td>
                        <td><span className={`badge ${o.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>{o.status === 'paid' ? '已支付' : '待支付'}</span></td>
                        <td className="hide-mobile" style={{fontSize: '12px', color: '#9ca3af'}}>{o.created_at ? new Date(o.created_at).toLocaleString() : '-'}</td>
                        <td>
                          {o.status !== 'paid' && <button className="btn btn-primary btn-sm" onClick={() => markPaid(o.id)}>标记已支付</button>}
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && <tr><td colSpan="7"><div className="empty"><div className="empty-text">暂无订单</div></div></td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeMenu === 'settings' && (
            <div className="card" style={{maxWidth: '700px'}}>
              <div className="card-header"><div className="card-title">系统设置</div></div>
              <div className="card-body">
                {/* 基础设置 - 折叠面板 */}
                <div className="collapsible-section">
                  <div className="collapsible-header" onClick={() => toggleSection('settingsBasic')}>
                    <div className="collapsible-title"><Icon name="home" size={16} style={{marginRight: '8px'}} /> 基础设置</div>
                    <span className={`collapsible-icon ${!collapsedSections.settingsBasic ? 'open' : ''}`}>▼</span>
                  </div>
                  {!collapsedSections.settingsBasic && (
                  <div className="collapsible-content">
                {/* 网站Logo上传 */}
                <div className="form-group" style={{marginBottom: '18px'}}>
                  <label className="form-label">网站Logo</label>
                  <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '12px',
                      border: '2px dashed #d1d5db',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      background: '#f9fafb',
                      flexShrink: 0
                    }}>
                      {settings.site_logo ? (
                        <img src={settings.site_logo} alt="Logo" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                      ) : (
                        <Icon name="image" size={24} style={{color: '#9ca3af'}} />
                      )}
                    </div>
                    <div style={{flex: 1}}>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                        onChange={handleLogoUpload}
                        style={{display: 'none'}}
                        id="logo-upload"
                      />
                      <label
                        htmlFor="logo-upload"
                        style={{
                          display: 'inline-block',
                          padding: '8px 16px',
                          background: '#2563eb',
                          color: '#fff',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          marginBottom: '8px'
                        }}
                      >
                        {uploadingLogo ? '上传中...' : (<><Icon name="upload" size={14} style={{marginRight: '6px'}} /> 上传Logo</>)}
                      </label>
                      <div style={{fontSize: '12px', color: '#9ca3af'}}>
                        支持PNG/JPG/GIF/WEBP/SVG，最大2MB
                      </div>
                      {settings.site_logo && (
                        <button
                          onClick={() => setSettings({...settings, site_logo: ''})}
                          style={{
                            display: 'block',
                            marginTop: '8px',
                            fontSize: '12px',
                            color: '#ef4444',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          移除Logo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">网站名称</label>
                  <input type="text" className="form-input" value={settings.site_name || ''} onChange={(e) => setSettings({...settings, site_name: e.target.value})} />
                </div>

                <div className="form-group">
                  <label className="form-label">Logo图标文字（无图片时显示）</label>
                  <input type="text" className="form-input" maxLength={2} value={settings.logo_text || ''} onChange={(e) => setSettings({...settings, logo_text: e.target.value})} placeholder="如：甜、N、VIP" />
                </div>
                  </div>
                )}
                </div>

                {/* 横幅配置 - 折叠面板 */}
                <div className="collapsible-section">
                  <div className="collapsible-header" onClick={() => toggleSection('settingsBanner')}>
                    <div className="collapsible-title"><Icon name="palette" size={16} style={{marginRight: '8px'}} /> 首页横幅配置</div>
                    <span className={`collapsible-icon ${!collapsedSections.settingsBanner ? 'open' : ''}`}>▼</span>
                  </div>
                  {!collapsedSections.settingsBanner && (
                  <div className="collapsible-content">
                <div style={{padding: '0', background: 'transparent', border: 'none', borderRadius: '0', marginBottom: '0'}}>
                  <div style={{fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', display: 'none'}}>
                    <Icon name="palette" size={16} style={{marginRight: '8px'}} /> 首页横幅配置
                  </div>
                  {/* 横幅右侧图片上传 */}
                  <div className="form-group" style={{marginBottom: '18px'}}>
                    <label className="form-label">横幅右侧图片</label>
                    <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                      <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '10px',
                        border: '2px dashed #d1d5db',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        background: '#f9fafb',
                        flexShrink: 0
                      }}>
                        {settings.banner_image ? (
                          <img src={settings.banner_image} alt="横幅图" style={{width: '100%', height: '100%', objectFit: 'contain'}} />
                        ) : (
                          <span style={{fontSize: '24px', color: '#9ca3af'}}>🌸</span>
                        )}
                      </div>
                      <div style={{flex: 1}}>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                          onChange={handleBannerImageUpload}
                          style={{display: 'none'}}
                          id="banner-image-upload"
                        />
                        <label
                          htmlFor="banner-image-upload"
                          style={{
                            display: 'inline-block',
                            padding: '8px 16px',
                            background: '#2563eb',
                            color: '#fff',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            marginBottom: '8px'
                          }}
                        >
                          {uploadingBannerImage ? '上传中...' : (<><Icon name="upload" size={14} style={{marginRight: '6px'}} /> 上传图片</>)}
                        </label>
                        <div style={{fontSize: '12px', color: '#9ca3af'}}>
                          建议尺寸100x100，支持PNG/JPG/GIF/WEBP/SVG
                        </div>
                        {settings.banner_image && (
                          <button
                            onClick={() => setSettings({...settings, banner_image: ''})}
                            style={{
                              display: 'block',
                              marginTop: '8px',
                              fontSize: '12px',
                              color: '#ef4444',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0
                            }}
                          >
                            移除图片
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">横幅标题</label>
                    <input type="text" className="form-input" value={settings.banner_title || ''} onChange={(e) => setSettings({...settings, banner_title: e.target.value})} placeholder="如：虚拟商品·即拍即发" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">横幅副标题</label>
                    <input type="text" className="form-input" value={settings.banner_subtitle || ''} onChange={(e) => setSettings({...settings, banner_subtitle: e.target.value})} placeholder="如：支付宝多渠道支付，付款后自动秒发卡密" />
                  </div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px'}}>
                    <div className="form-group">
                      <label className="form-label">标签1</label>
                      <input type="text" className="form-input" value={settings.banner_tag1 || ''} onChange={(e) => setSettings({...settings, banner_tag1: e.target.value})} placeholder="自动秒发" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">标签2</label>
                      <input type="text" className="form-input" value={settings.banner_tag2 || ''} onChange={(e) => setSettings({...settings, banner_tag2: e.target.value})} placeholder="加密存储" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">标签3</label>
                      <input type="text" className="form-input" value={settings.banner_tag3 || ''} onChange={(e) => setSettings({...settings, banner_tag3: e.target.value})} placeholder="多渠道支付" />
                    </div>
                  </div>
                </div>
                  </div>
                )}
                </div>

                {/* 邮件配置 - 折叠面板 */}
                <div className="collapsible-section">
                  <div className="collapsible-header" onClick={() => toggleSection('settingsEmail')}>
                    <div className="collapsible-title"><Icon name="mail" size={16} style={{marginRight: '8px'}} /> 邮件自动发送配置</div>
                    <span className={`collapsible-icon ${!collapsedSections.settingsEmail ? 'open' : ''}`}>▼</span>
                  </div>
                  {!collapsedSections.settingsEmail && (
                  <div className="collapsible-content">
                    <div style={{fontSize: '13px', color: '#6b7280', marginBottom: '16px', lineHeight: 1.6}}>
                      支付成功后系统自动发送卡密到用户邮箱。配置后点击保存即可生效。
                    </div>
                    <div className="form-group">
                      <label className="form-label">SMTP服务器地址</label>
                      <input type="text" className="form-input" value={settings.smtp_host || ''} onChange={(e) => setSettings({...settings, smtp_host: e.target.value})} placeholder="如：smtp.qq.com" />
                    </div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                      <div className="form-group">
                        <label className="form-label">端口</label>
                        <input type="number" className="form-input" value={settings.smtp_port || ''} onChange={(e) => setSettings({...settings, smtp_port: e.target.value})} placeholder="465" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">发件人名称</label>
                        <input type="text" className="form-input" value={settings.smtp_from_name || ''} onChange={(e) => setSettings({...settings, smtp_from_name: e.target.value})} placeholder="甜甜发卡" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">发件邮箱</label>
                      <input type="email" className="form-input" value={settings.smtp_user || ''} onChange={(e) => setSettings({...settings, smtp_user: e.target.value})} placeholder="your@qq.com" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">邮箱授权码/密码</label>
                      <input type="password" className="form-input" value={settings.smtp_pass || ''} onChange={(e) => setSettings({...settings, smtp_pass: e.target.value})} placeholder="QQ邮箱使用授权码，非登录密码" />
                    </div>
                    <div style={{fontSize: '12px', color: '#9ca3af', lineHeight: 1.6, marginTop: '8px'}}>
                      支持QQ邮箱、163邮箱、Gmail等SMTP服务。QQ邮箱需在设置中开启SMTP并获取授权码。端口465使用SSL，端口587使用TLS。
                    </div>
                    
                    {/* 测试发送 */}
                    <div style={{marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #e5e7eb'}}>
                      <div style={{fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '10px'}}><Icon name="test" size={14} style={{marginRight: '6px'}} /> 测试邮件发送</div>
                      <div style={{display: 'flex', gap: '8px'}}>
                        <input 
                          type="email" 
                          className="form-input" 
                          style={{flex: 1}}
                          value={testEmail} 
                          onChange={(e) => setTestEmail(e.target.value)} 
                          placeholder="输入测试邮箱地址" 
                        />
                        <button 
                          className="btn btn-secondary" 
                          style={{flexShrink: 0, whiteSpace: 'nowrap'}}
                          onClick={handleTestEmail}
                          disabled={testingEmail}
                        >
                          {testingEmail ? '发送中...' : '发送测试'}
                        </button>
                      </div>
                      <div style={{fontSize: '11px', color: '#9ca3af', marginTop: '6px'}}>
                        配置完成后点击保存，再输入邮箱测试发送是否正常
                      </div>
                    </div>
                  </div>
                  )}
                </div>

                <button className="btn btn-primary" onClick={saveSettings}><Icon name="save" size={14} style={{marginRight: '6px'}} /> 保存设置</button>
              </div>
            </div>
          )}

      {showProductModal && (
        <div className="modal-overlay">
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '560px'}}>
            <div className="modal-header product-modal-header">
              <div className="modal-title">{editingProduct ? '编辑商品' : '添加商品'}</div>
              <div className="product-modal-actions">
                <button className="btn btn-secondary btn-sm product-modal-cancel" onClick={() => setShowProductModal(false)}>取消</button>
                <button className="btn btn-primary btn-sm product-modal-save" onClick={saveProduct}>保存</button>
              </div>
            </div>
            <div className="modal-body modal-body-scroll">
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                <div className="form-group"><label className="form-label">商品名称 *</label><input type="text" className="form-input" value={productForm.name} onChange={(e) => setProductForm({...productForm, name: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">分类</label><input type="text" className="form-input" value={productForm.category} onChange={(e) => setProductForm({...productForm, category: e.target.value})} placeholder="如：会员、软件" /></div>
                <div className="form-group"><label className="form-label">售价 *</label><input type="number" step="0.01" className="form-input" value={productForm.price} onChange={(e) => setProductForm({...productForm, price: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">划线价</label><input type="number" step="0.01" className="form-input" value={productForm.original_price} onChange={(e) => setProductForm({...productForm, original_price: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">库存</label><input type="number" className="form-input" value={productForm.stock} onChange={(e) => setProductForm({...productForm, stock: parseInt(e.target.value) || 0})} /></div>
                <div className="form-group"><label className="form-label">销量（可手动修改）</label><input type="number" className="form-input" value={productForm.sales || 0} onChange={(e) => setProductForm({...productForm, sales: parseInt(e.target.value) || 0})} /></div>
                <div className="form-group"><label className="form-label">状态</label><select className="form-select" value={productForm.status} onChange={(e) => setProductForm({...productForm, status: e.target.value})}><option value="active">上架</option><option value="inactive">下架</option></select></div>
              </div>
              <div className="form-group">
                <label className="form-label">商品图片</label>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    overflow: 'hidden',
                    background: '#f9fafb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {productForm.image ? (
                      <img src={productForm.image} alt="商品图" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                    ) : (
                      <Icon name="image" size={24} style={{color: '#9ca3af'}} />
                    )}
                  </div>
                  <div style={{flex: 1}}>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                      onChange={handleProductImageUpload}
                      style={{display: 'none'}}
                      id="product-image-upload"
                    />
                    <label
                      htmlFor="product-image-upload"
                      style={{
                        display: 'inline-block',
                        padding: '6px 12px',
                        background: '#2563eb',
                        color: '#fff',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        marginBottom: '6px'
                      }}
                    >
                      {uploadingImage ? '上传中...' : (<><Icon name="upload" size={14} style={{marginRight: '6px'}} /> 上传图片</>)}
                    </label>
                    <div style={{fontSize: '11px', color: '#9ca3af'}}>支持PNG/JPG，最大2MB</div>
                  </div>
                </div>
              </div>
              <div className="form-group"><label className="form-label">自定义标签（如：热销、新品、限时）</label><input type="text" className="form-input" value={productForm.tag || ''} onChange={(e) => setProductForm({...productForm, tag: e.target.value})} placeholder="不填则不显示" maxLength={6} /></div>
              <div className="form-group"><label className="form-label">商品简介</label><textarea className="form-textarea" style={{minHeight: '60px'}} value={productForm.description} onChange={(e) => setProductForm({...productForm, description: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">商品详情（支持HTML）</label><textarea className="form-textarea" style={{minHeight: '80px'}} value={productForm.detail} onChange={(e) => setProductForm({...productForm, detail: e.target.value})} /></div>
            </div>
            <div className="modal-footer product-modal-footer" style={{display: 'none'}}>
              <button className="btn btn-secondary" onClick={() => setShowProductModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={saveProduct}>保存</button>
            </div>
          </div>
        </div>
      )}

      {showCardModal && (
        <div className="modal-overlay">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">批量导入卡密</div>
              <div className="modal-close" onClick={() => setShowCardModal(false)}>×</div>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">选择商品</label>
                <select className="form-select" value={cardProductId} onChange={(e) => setCardProductId(e.target.value)}>
                  <option value="">请选择商品</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}（库存：{p.stock}）</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">卡密内容（TXT每行一个，直接粘贴）</label>
                <textarea className="form-textarea" style={{minHeight: '180px', fontFamily: 'monospace', fontSize: '13px'}} placeholder={'卡号----密码\n卡号----密码\n...'} value={cardContent} onChange={(e) => setCardContent(e.target.value)} />
              </div>
              <div style={{fontSize: '13px', color: '#6b7280'}}>共 {cardContent.split('\n').filter(c => c.trim()).length} 条卡密</div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCardModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={importCards}>导入</button>
            </div>
          </div>
        </div>
      )}
        </div>

        {/* 移动端悬浮底部导航 */}
        <nav className="admin-mobile-nav">
          {MENU.map((item) => (
            <div key={item.key} className={`admin-mobile-nav-item ${activeMenu === item.key ? 'active' : ''}`} onClick={() => router.push(item.path)}>
              <div className="admin-mobile-nav-icon"><Icon name={item.icon} size={20} /></div>
              <div className="admin-mobile-nav-label">{item.label.replace('管理', '')}</div>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
