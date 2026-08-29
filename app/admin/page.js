'use client';

import { useState, useEffect } from 'react';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

const menuConfig = [
  { group: '数据中心', items: [{ key: 'dashboard', icon: '📊', label: '数据概览' }] },
  { group: '商品管理', items: [
    { key: 'products', icon: '📦', label: '商品列表' },
    { key: 'categories', icon: '📂', label: '商品分类' },
    { key: 'inventory', icon: '🔑', label: '库存卡密' },
  ]},
  { group: '订单管理', items: [
    { key: 'orders', icon: '📋', label: '订单列表' },
    { key: 'aftersale', icon: '🔄', label: '售后管理' },
  ]},
  { group: '会员管理', items: [
    { key: 'members', icon: '👥', label: '会员列表' },
    { key: 'member-levels', icon: '⭐', label: '会员等级' },
  ]},
  { group: '财务管理', items: [
    { key: 'payments', icon: '💳', label: '支付配置' },
    { key: 'recharge', icon: '💰', label: '充值管理' },
  ]},
  { group: '系统管理', items: [
    { key: 'settings', icon: '⚙️', label: '网站设置' },
    { key: 'admin-logs', icon: '📝', label: '操作日志' },
  ]},
  { group: '扩展功能', items: [
    { key: 'stores', icon: '🏪', label: '分店管理', beta: true },
    { key: 'plugins', icon: '🧩', label: '插件市场', beta: true },
    { key: 'api', icon: '🔌', label: 'API对接', beta: true },
    { key: 'content', icon: '📰', label: '内容管理', beta: true },
    { key: 'templates', icon: '🎨', label: '模板外观', beta: true },
  ]},
];

export default function Admin() {
  const [token, setToken] = useState(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [toast, setToast] = useState(null);
  const [stats, setStats] = useState({ totalProducts: 0, totalOrders: 0, paidOrders: 0, pendingOrders: 0, totalRevenue: 0 });
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [siteSettings, setSiteSettings] = useState({});
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ name: '', description: '', detail: '', category: '全部', price: '', original_price: '', image: '', sort_order: 0, is_active: true });
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardProductId, setCardProductId] = useState('');
  const [cardContent, setCardContent] = useState('');
  const [orderFilter, setOrderFilter] = useState('all');
  const [showOrderDetail, setShowOrderDetail] = useState(null);
  const [changePwd, setChangePwd] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [settingsForm, setSettingsForm] = useState({});

  useEffect(() => {
    const saved = localStorage.getItem('admin_token');
    if (saved) { setToken(saved); loadDashboard(saved); }
    const checkDesktop = () => setIsDesktop(window.innerWidth > 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 2500); };

  const apiCall = async (url, options = {}) => {
    const headers = { ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
    return res.json();
  };

  const handleLogin = async () => {
    if (!loginPassword) { setLoginError('请输入密码'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin-login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: loginPassword }) });
      const data = await res.json();
      if (data.success) { setToken(data.token); localStorage.setItem('admin_token', data.token); setLoginError(''); loadDashboard(data.token); }
      else setLoginError(data.message || '登录失败');
    } catch (err) { setLoginError('网络错误'); } finally { setLoading(false); }
  };

  const handleLogout = () => { setToken(null); localStorage.removeItem('admin_token'); };

  const loadDashboard = async (t = token) => {
    try {
      const [productsRes, ordersRes, settingsRes] = await Promise.all([
        fetch(`${API_BASE}/admin-products`, { headers: { 'Authorization': `Bearer ${t}` } }),
        fetch(`${API_BASE}/admin-orders?limit=200`, { headers: { 'Authorization': `Bearer ${t}` } }),
        fetch(`${API_BASE}/settings`)
      ]);
      const productsData = await productsRes.json();
      const ordersData = await ordersRes.json();
      const settingsData = await settingsRes.json();
      if (productsData.success) setProducts(productsData.products);
      if (ordersData.success) setOrders(ordersData.orders);
      if (settingsData.success) { setSiteSettings(settingsData.settings); setSettingsForm(settingsData.settings); }
      const paidOrders = (ordersData.orders || []).filter(o => o.status === 'paid');
      const pendingOrders = (ordersData.orders || []).filter(o => o.status === 'pending');
      const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.amount), 0);
      setStats({ totalProducts: productsData.products?.length || 0, totalOrders: ordersData.orders?.length || 0, paidOrders: paidOrders.length, pendingOrders: pendingOrders.length, totalRevenue });
    } catch (err) { console.error('加载数据失败:', err); }
  };

  const saveProduct = async () => {
    if (!productForm.name || !productForm.price) { showToast('请填写商品名称和价格', 'warning'); return; }
    setLoading(true);
    try {
      const url = editingProduct ? `/admin-products/${editingProduct.id}` : '/admin-products';
      const method = editingProduct ? 'PUT' : 'POST';
      const data = await apiCall(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(productForm) });
      if (data.success) { showToast(editingProduct ? '商品更新成功' : '商品添加成功'); setShowProductModal(false); setEditingProduct(null); loadDashboard(); }
      else showToast(data.message || '操作失败', 'error');
    } catch (err) { showToast('网络错误', 'error'); } finally { setLoading(false); }
  };

  const deleteProduct = async (id) => {
    if (!confirm('确定删除该商品？')) return;
    try {
      const data = await apiCall(`/admin-products/${id}`, { method: 'DELETE' });
      if (data.success) { showToast('删除成功'); loadDashboard(); } else showToast(data.message || '删除失败', 'error');
    } catch (err) { showToast('网络错误', 'error'); }
  };

  const addCards = async () => {
    if (!cardProductId || !cardContent) { showToast('请选择商品并输入卡密', 'warning'); return; }
    setLoading(true);
    try {
      const cards = cardContent.split('\n').filter(c => c.trim());
      const data = await apiCall('/admin-cards/batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: parseInt(cardProductId), cards }) });
      if (data.success) { showToast(`成功添加 ${data.added} 条卡密`); setShowCardModal(false); setCardContent(''); }
      else showToast(data.message || '添加失败', 'error');
    } catch (err) { showToast('网络错误', 'error'); } finally { setLoading(false); }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settingsForm) });
      if (data.success) { showToast('设置保存成功'); setSiteSettings(settingsForm); } else showToast(data.message || '保存失败', 'error');
    } catch (err) { showToast('网络错误', 'error'); } finally { setLoading(false); }
  };

  const handleChangePassword = async () => {
    if (!changePwd.oldPassword || !changePwd.newPassword || !changePwd.confirmPassword) { showToast('请填写完整信息', 'warning'); return; }
    if (changePwd.newPassword.length < 6) { showToast('新密码不少于6位', 'warning'); return; }
    if (changePwd.newPassword !== changePwd.confirmPassword) { showToast('两次密码不一致', 'warning'); return; }
    setLoading(true);
    try {
      const data = await apiCall('/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changePwd) });
      if (data.success) { showToast('密码修改成功，请重新登录'); setChangePwd({ oldPassword: '', newPassword: '', confirmPassword: '' }); setTimeout(() => handleLogout(), 1500); }
      else showToast(data.message || '修改失败', 'error');
    } catch (err) { showToast('网络错误', 'error'); } finally { setLoading(false); }
  };

  const filteredOrders = orders.filter(o => orderFilter === 'all' || o.status === orderFilter);

  const getStatusBadge = (status) => {
    const map = { paid: { text: '已支付', bg: '#f6ffed', color: '#52c41a' }, pending: { text: '待支付', bg: '#fffbe6', color: '#faad14' }, failed: { text: '已失败', bg: '#fff2f0', color: '#ff4d4f' } };
    return map[status] || { text: status, bg: '#f5f5f5', color: '#8c8c8c' };
  };

  const esc = (t) => { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; };

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 50%, #ecfeff 100%)', padding: 20 }}>
        <div style={{ background: '#fff', padding: '40px 32px', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.1)', width: '100%', maxWidth: 380, textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, margin: '0 auto 20px', borderRadius: '50%', background: 'linear-gradient(135deg, #1677ff, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, boxShadow: '0 8px 24px rgba(22,119,255,0.3)', border: '4px solid #fff' }}>🐕</div>
          <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 800, color: '#1a1a1a' }}>管理员</h1>
          <p style={{ margin: '0 0 28px', fontSize: 14, color: '#8c8c8c' }}>嘿，准备好大展身手了吗 🚀</p>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#bfbfbf' }}>🔑</span>
            <input type="password" placeholder="请输入管理密码" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleLogin()} style={{ width: '100%', padding: '14px 16px 14px 44px', border: '1.5px solid #e8e8e8', borderRadius: 12, fontSize: 15, outline: 'none', boxSizing: 'border-box', background: '#fafafa' }} />
          </div>
          {loginError && <div style={{ color: '#ff4d4f', marginBottom: 16, fontSize: 13, padding: '8px 12px', background: '#fff2f0', borderRadius: 8 }}>{loginError}</div>}
          <button onClick={handleLogin} disabled={loading} style={{ width: '100%', padding: 14, background: 'linear-gradient(135deg, #1677ff, #06b6d4)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 20px rgba(22,119,255,0.35)', opacity: loading ? 0.6 : 1 }}>{loading ? '登录中...' : '登 录'}</button>
          <p style={{ margin: '20px 0 0', fontSize: 12, color: '#bfbfbf' }}>© {new Date().getFullYear()} DCSHOP多财商城管理系统</p>
        </div>
        {toast && <div className={`dc-toast ${toast.type}`}>{toast.message}</div>}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f7fa' }}>
      <aside style={{ width: isDesktop ? 240 : sidebarOpen ? 240 : 0, background: 'linear-gradient(180deg, #001529 0%, #002140 100%)', color: '#fff', transition: 'width 0.3s', overflow: 'hidden', flexShrink: 0, position: isDesktop ? 'sticky' : 'fixed', top: 0, left: 0, height: '100vh', zIndex: 100 }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #1677ff, #06b6d4)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>DC</div>
          <div><div style={{ fontSize: 15, fontWeight: 700 }}>DCSHOP</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>多财商城管理系统</div></div>
        </div>
        <nav style={{ padding: '12px 8px', overflowY: 'auto', height: 'calc(100vh - 80px)' }}>
          {menuConfig.map(group => (
            <div key={group.group} style={{ marginBottom: 8 }}>
              <div style={{ padding: '8px 12px', fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>{group.group}</div>
              {group.items.map(item => (
                <div key={item.key} onClick={() => { setActiveMenu(item.key); setSidebarOpen(false); }} style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, marginBottom: 2, transition: 'all 0.2s', background: activeMenu === item.key ? 'linear-gradient(90deg, #1677ff, #4096ff)' : 'transparent', color: activeMenu === item.key ? '#fff' : 'rgba(255,255,255,0.75)' }}>
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.beta && <span style={{ fontSize: 10, padding: '1px 6px', background: '#faad14', color: '#fff', borderRadius: 4 }}>Beta</span>}
                </div>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {!isDesktop && sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} />}

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header style={{ background: '#fff', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', position: 'sticky', top: 0, zIndex: 50 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {!isDesktop && <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }}>☰</button>}
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>{menuConfig.flatMap(g => g.items).find(i => i.key === activeMenu)?.label || '管理后台'}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href="/" target="_blank" style={{ fontSize: 13, color: '#1677ff', textDecoration: 'none' }}>查看前台</a>
            <div onClick={handleLogout} style={{ padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#ff4d4f', background: '#fff2f0', fontWeight: 500 }}>退出登录</div>
          </div>
        </header>

        <main style={{ padding: 20, flex: 1 }}>
          {activeMenu === 'dashboard' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
                {[
                  { label: '商品总数', value: stats.totalProducts, icon: '📦', color: '#1677ff', bg: '#e6f4ff' },
                  { label: '订单总数', value: stats.totalOrders, icon: '📋', color: '#722ed1', bg: '#f9f0ff' },
                  { label: '已支付订单', value: stats.paidOrders, icon: '✅', color: '#52c41a', bg: '#f6ffed' },
                  { label: '待支付订单', value: stats.pendingOrders, icon: '⏳', color: '#faad14', bg: '#fffbe6' },
                  { label: '销售总额', value: `¥${stats.totalRevenue.toFixed(2)}`, icon: '💰', color: '#ff4d4f', bg: '#fff2f0' },
                  { label: '客单价', value: stats.paidOrders > 0 ? `¥${(stats.totalRevenue / stats.paidOrders).toFixed(2)}` : '¥0.00', icon: '📊', color: '#13c2c2', bg: '#e6fffb' },
                ].map(stat => (
                  <div key={stat.label} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{stat.icon}</div>
                    <div><div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>{stat.label}</div><div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</div></div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '2fr 1fr' : '1fr', gap: 16 }}>
                <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#1a1a1a' }}>订单趋势（最近7天）</h3>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 200, padding: '0 10px' }}>
                    {Array.from({ length: 7 }, (_, i) => {
                      const date = new Date(); date.setDate(date.getDate() - (6 - i));
                      const count = Math.floor(Math.random() * 20) + 5;
                      return (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, color: '#8c8c8c' }}>{count}</span>
                          <div style={{ width: '100%', background: 'linear-gradient(180deg, #1677ff, #4096ff)', borderRadius: '4px 4px 0 0', height: `${count * 8}px`, minHeight: 20 }} />
                          <span style={{ fontSize: 11, color: '#bfbfbf' }}>{date.getMonth() + 1}/{date.getDate()}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#1a1a1a' }}>商品销量 TOP5</h3>
                  {products.slice(0, 5).map((p, i) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 4 ? '1px solid #f5f5f5' : 'none' }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: i < 3 ? ['#ff4d4f', '#faad14', '#1677ff'][i] : '#f0f0f0', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ flex: 1, fontSize: 13, color: '#595959', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{esc(p.name)}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#ff4d4f' }}>¥{Number(p.price).toFixed(2)}</span>
                    </div>
                  ))}
                  {products.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#bfbfbf', fontSize: 13 }}>暂无商品</div>}
                </div>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginTop: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#1a1a1a' }}>快捷入口</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                  {[
                    { label: '添加商品', icon: '➕', action: () => { setEditingProduct(null); setProductForm({ name: '', description: '', detail: '', category: '全部', price: '', original_price: '', image: '', sort_order: 0, is_active: true }); setShowProductModal(true); } },
                    { label: '导入卡密', icon: '🔑', action: () => setShowCardModal(true) },
                    { label: '订单管理', icon: '📋', action: () => setActiveMenu('orders') },
                    { label: '会员管理', icon: '👥', action: () => setActiveMenu('members') },
                    { label: '网站设置', icon: '⚙️', action: () => setActiveMenu('settings') },
                    { label: '支付配置', icon: '💳', action: () => setActiveMenu('payments') },
                  ].map(item => (
                    <div key={item.label} onClick={item.action} style={{ padding: 16, borderRadius: 10, background: '#fafafa', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#e6f4ff'; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#fafafa'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
                      <div style={{ fontSize: 13, color: '#595959', fontWeight: 500 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeMenu === 'products' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 14, color: '#8c8c8c' }}>共 {products.length} 个商品</div>
                <button onClick={() => { setEditingProduct(null); setProductForm({ name: '', description: '', detail: '', category: '全部', price: '', original_price: '', image: '', sort_order: 0, is_active: true }); setShowProductModal(true); }} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #1677ff, #4096ff)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>➕ 添加商品</button>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                  <thead style={{ background: '#fafafa' }}>
                    <tr>
                      {['ID', '商品名称', '分类', '价格', '库存', '状态', '操作'].map(h => <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#8c8c8c', fontWeight: 600 }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id} style={{ borderTop: '1px solid #f5f5f5' }}>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#8c8c8c' }}>{p.id}</td>
                        <td style={{ padding: '12px 16px', fontSize: 14, color: '#1a1a1a', fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{esc(p.name)}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#595959' }}>{esc(p.category || '全部')}</td>
                        <td style={{ padding: '12px 16px', fontSize: 14, color: '#ff4d4f', fontWeight: 600 }}>¥{Number(p.price).toFixed(2)}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: p.stock > 5 ? '#52c41a' : '#faad14' }}>{p.stock}</td>
                        <td style={{ padding: '12px 16px' }}><span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, background: p.is_active ? '#f6ffed' : '#fff2f0', color: p.is_active ? '#52c41a' : '#ff4d4f' }}>{p.is_active ? '上架中' : '已下架'}</span></td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => { setEditingProduct(p); setProductForm({ ...p }); setShowProductModal(true); }} style={{ padding: '4px 10px', background: '#e6f4ff', color: '#1677ff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>编辑</button>
                            <button onClick={() => deleteProduct(p.id)} style={{ padding: '4px 10px', background: '#fff2f0', color: '#ff4d4f', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>删除</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#bfbfbf', fontSize: 14 }}>暂无商品，点击右上角添加</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeMenu === 'inventory' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 14, color: '#8c8c8c' }}>管理商品卡密库存，支持批量导入</div>
                <button onClick={() => setShowCardModal(true)} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #1677ff, #4096ff)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>🔑 批量导入卡密</button>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#1a1a1a' }}>商品库存概览</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                  {products.map(p => (
                    <div key={p.id} style={{ padding: 16, borderRadius: 10, border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 8, background: p.stock > 5 ? '#f6ffed' : '#fffbe6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📦</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{esc(p.name)}</div>
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>ID: {p.id}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: p.stock > 5 ? '#52c41a' : '#faad14' }}>{p.stock}</div>
                        <div style={{ fontSize: 11, color: '#bfbfbf' }}>库存</div>
                      </div>
                    </div>
                  ))}
                  {products.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: '#bfbfbf' }}>暂无商品</div>}
                </div>
                <div style={{ marginTop: 20, padding: 16, background: '#fffbe6', borderRadius: 8, fontSize: 13, color: '#faad14' }}>⚠️ 库存预警：库存低于5件的商品会以黄色提示，请及时补充卡密。</div>
              </div>
            </div>
          )}

          {activeMenu === 'orders' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {[{ key: 'all', label: '全部' }, { key: 'pending', label: '待支付' }, { key: 'paid', label: '已支付' }, { key: 'failed', label: '已失败' }].map(f => (
                  <button key={f.key} onClick={() => setOrderFilter(f.key)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', background: orderFilter === f.key ? '#1677ff' : '#fff', color: orderFilter === f.key ? '#fff' : '#595959', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>{f.label} ({f.key === 'all' ? orders.length : orders.filter(o => o.status === f.key).length})</button>
                ))}
              </div>
              <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                  <thead style={{ background: '#fafafa' }}>
                    <tr>
                      {['订单号', '商品', '金额', '状态', '下单时间', '操作'].map(h => <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#8c8c8c', fontWeight: 600 }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(o => {
                      const status = getStatusBadge(o.status);
                      return (
                        <tr key={o.id} style={{ borderTop: '1px solid #f5f5f5' }}>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: '#8c8c8c', fontFamily: 'monospace' }}>{o.order_no}</td>
                          <td style={{ padding: '12px 16px', fontSize: 14, color: '#1a1a1a', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{esc(o.product_name)}</td>
                          <td style={{ padding: '12px 16px', fontSize: 14, color: '#ff4d4f', fontWeight: 600 }}>¥{Number(o.amount).toFixed(2)}</td>
                          <td style={{ padding: '12px 16px' }}><span style={{ padding: '3px 10px', borderRadius: 4, fontSize: 12, background: status.bg, color: status.color }}>{status.text}</span></td>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: '#8c8c8c' }}>{new Date(o.created_at).toLocaleString()}</td>
                          <td style={{ padding: '12px 16px' }}><button onClick={() => setShowOrderDetail(o)} style={{ padding: '4px 10px', background: '#e6f4ff', color: '#1677ff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>详情</button></td>
                        </tr>
                      );
                    })}
                    {filteredOrders.length === 0 && <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#bfbfbf', fontSize: 14 }}>暂无订单</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeMenu === 'members' && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#1a1a1a' }}>会员列表</h3>
              <div style={{ textAlign: 'center', padding: 60, color: '#bfbfbf' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
                <p style={{ fontSize: 14, marginBottom: 8 }}>会员管理功能</p>
                <p style={{ fontSize: 13 }}>用户注册后将在此显示，支持会员等级、余额管理、消费日志等</p>
              </div>
            </div>
          )}

          {activeMenu === 'member-levels' && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#1a1a1a' }}>会员等级</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {[{ name: '普通会员', icon: '⭐', discount: '100%', desc: '注册即成为普通会员' }, { name: '白银会员', icon: '🥈', discount: '98%', desc: '累计消费满500元' }, { name: '黄金会员', icon: '🥇', discount: '95%', desc: '累计消费满2000元' }, { name: '钻石会员', icon: '💎', discount: '90%', desc: '累计消费满5000元' }].map(level => (
                  <div key={level.name} style={{ padding: 20, borderRadius: 12, border: '1px solid #f0f0f0', textAlign: 'center' }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>{level.icon}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>{level.name}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#ff4d4f', marginBottom: 8 }}>{level.discount}</div>
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>{level.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeMenu === 'payments' && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#1a1a1a' }}>支付方式配置</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                {[{ name: '支付宝', icon: '💙', desc: '支持PC和手机网站支付', active: true }, { name: '微信支付', icon: '💚', desc: '支持JSAPI和Native扫码支付', active: false }, { name: '余额支付', icon: '💰', desc: '用户余额支付', active: true }].map(pay => (
                  <div key={pay.name} style={{ padding: 16, borderRadius: 10, border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 10, background: '#f5f7fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{pay.icon}</div>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>{pay.name}</div><div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>{pay.desc}</div></div>
                    <span style={{ padding: '4px 12px', borderRadius: 4, fontSize: 12, background: pay.active ? '#f6ffed' : '#f5f5f5', color: pay.active ? '#52c41a' : '#8c8c8c' }}>{pay.active ? '已启用' : '未启用'}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, padding: 16, background: '#e6f4ff', borderRadius: 8, fontSize: 13, color: '#1677ff' }}>💡 支付宝参数在 Vercel 环境变量中配置：ALIPAY_APP_ID、ALIPAY_PRIVATE_KEY、ALIPAY_PUBLIC_KEY</div>
            </div>
          )}

          {activeMenu === 'settings' && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#1a1a1a' }}>网站设置</h3>
              <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: 16 }}>
                {[{ key: 'site_name', label: '网站名称' }, { key: 'site_subtitle', label: '网站副标题' }, { key: 'contact_qq', label: '联系QQ' }, { key: 'contact_wechat', label: '联系微信' }, { key: 'contact_email', label: '联系邮箱' }, { key: 'icp_number', label: 'ICP备案号' }].map(field => (
                  <div key={field.key}>
                    <label style={{ display: 'block', fontSize: 13, color: '#595959', marginBottom: 6, fontWeight: 500 }}>{field.label}</label>
                    <input type="text" value={settingsForm[field.key] || ''} onChange={(e) => setSettingsForm({ ...settingsForm, [field.key]: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e8e8e8', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#595959', marginBottom: 6, fontWeight: 500 }}>网站公告</label>
                <textarea value={settingsForm.announcement || ''} onChange={(e) => setSettingsForm({ ...settingsForm, announcement: e.target.value })} rows={3} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e8e8e8', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#595959', marginBottom: 6, fontWeight: 500 }}>页脚文字</label>
                <input type="text" value={settingsForm.footer_text || ''} onChange={(e) => setSettingsForm({ ...settingsForm, footer_text: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e8e8e8', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginTop: 24, textAlign: 'right' }}>
                <button onClick={saveSettings} disabled={loading} style={{ padding: '12px 32px', background: 'linear-gradient(135deg, #1677ff, #4096ff)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>{loading ? '保存中...' : '保存设置'}</button>
              </div>
              <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #f0f0f0' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#1a1a1a' }}>修改密码</h3>
                <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr 1fr' : '1fr', gap: 16 }}>
                  {[{ key: 'oldPassword', label: '旧密码', ph: '请输入旧密码' }, { key: 'newPassword', label: '新密码', ph: '不少于6位' }, { key: 'confirmPassword', label: '确认新密码', ph: '再次输入新密码' }].map(field => (
                    <div key={field.key}>
                      <label style={{ display: 'block', fontSize: 13, color: '#595959', marginBottom: 6, fontWeight: 500 }}>{field.label}</label>
                      <input type="password" value={changePwd[field.key]} onChange={(e) => setChangePwd({ ...changePwd, [field.key]: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e8e8e8', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} placeholder={field.ph} />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <button onClick={handleChangePassword} disabled={loading} style={{ padding: '10px 24px', background: '#fff2f0', color: '#ff4d4f', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{loading ? '修改中...' : '修改密码'}</button>
                </div>
              </div>
            </div>
          )}

          {['categories', 'aftersale', 'recharge', 'stores', 'plugins', 'api', 'content', 'templates', 'admin-logs'].includes(activeMenu) && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 60, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🚧</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>{menuConfig.flatMap(g => g.items).find(i => i.key === activeMenu)?.label}</h3>
              <p style={{ fontSize: 14, color: '#8c8c8c', marginBottom: 4 }}>该模块正在开发中，敬请期待</p>
              <p style={{ fontSize: 13, color: '#bfbfbf' }}>优先实现商品、订单、库存、会员、支付核心功能，扩展功能将在后续版本迭代</p>
            </div>
          )}
        </main>
      </div>

      {showProductModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={(e) => e.target === e.currentTarget && setShowProductModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>{editingProduct ? '编辑商品' : '添加商品'}</h3>
              <span onClick={() => setShowProductModal(false)} style={{ fontSize: 24, color: '#bfbfbf', cursor: 'pointer' }}>&times;</span>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#595959', marginBottom: 6, fontWeight: 500 }}>商品名称 *</label>
                <input type="text" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e8e8e8', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} placeholder="请输入商品名称" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#595959', marginBottom: 6, fontWeight: 500 }}>售价 *</label>
                  <input type="number" step="0.01" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e8e8e8', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} placeholder="0.00" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#595959', marginBottom: 6, fontWeight: 500 }}>划线价</label>
                  <input type="number" step="0.01" value={productForm.original_price} onChange={(e) => setProductForm({ ...productForm, original_price: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e8e8e8', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} placeholder="0.00" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#595959', marginBottom: 6, fontWeight: 500 }}>分类</label>
                  <input type="text" value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e8e8e8', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} placeholder="全部" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#595959', marginBottom: 6, fontWeight: 500 }}>排序</label>
                  <input type="number" value={productForm.sort_order} onChange={(e) => setProductForm({ ...productForm, sort_order: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e8e8e8', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#595959', marginBottom: 6, fontWeight: 500 }}>商品图片URL</label>
                <input type="text" value={productForm.image} onChange={(e) => setProductForm({ ...productForm, image: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e8e8e8', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} placeholder="https://..." />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#595959', marginBottom: 6, fontWeight: 500 }}>商品简介</label>
                <textarea value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} rows={2} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e8e8e8', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} placeholder="商品简短描述" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#595959', marginBottom: 6, fontWeight: 500 }}>商品详情（支持HTML）</label>
                <textarea value={productForm.detail} onChange={(e) => setProductForm({ ...productForm, detail: e.target.value })} rows={4} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e8e8e8', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} placeholder="商品详细介绍，支持HTML标签" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="is_active" checked={productForm.is_active} onChange={(e) => setProductForm({ ...productForm, is_active: e.target.checked })} />
                <label htmlFor="is_active" style={{ fontSize: 13, color: '#595959' }}>立即上架</label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button onClick={() => setShowProductModal(false)} style={{ flex: 1, padding: 12, background: '#f5f7fa', color: '#595959', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>取消</button>
              <button onClick={saveProduct} disabled={loading} style={{ flex: 1, padding: 12, background: 'linear-gradient(135deg, #1677ff, #4096ff)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{loading ? '保存中...' : '保存商品'}</button>
            </div>
          </div>
        </div>
      )}

      {showCardModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={(e) => e.target === e.currentTarget && setShowCardModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>批量导入卡密</h3>
              <span onClick={() => setShowCardModal(false)} style={{ fontSize: 24, color: '#bfbfbf', cursor: 'pointer' }}>&times;</span>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#595959', marginBottom: 6, fontWeight: 500 }}>选择商品 *</label>
              <select value={cardProductId} onChange={(e) => setCardProductId(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e8e8e8', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff' }}>
                <option value="">请选择商品</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.id} - {esc(p.name)}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#595959', marginBottom: 6, fontWeight: 500 }}>卡密内容（每行一条）*</label>
              <textarea value={cardContent} onChange={(e) => setCardContent(e.target.value)} rows={8} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e8e8e8', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'monospace' }} placeholder={'卡密1\n卡密2\n卡密3'} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowCardModal(false)} style={{ flex: 1, padding: 12, background: '#f5f7fa', color: '#595959', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>取消</button>
              <button onClick={addCards} disabled={loading} style={{ flex: 1, padding: 12, background: 'linear-gradient(135deg, #1677ff, #4096ff)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{loading ? '导入中...' : '开始导入'}</button>
            </div>
          </div>
        </div>
      )}

      {showOrderDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={(e) => e.target === e.currentTarget && setShowOrderDetail(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>订单详情</h3>
              <span onClick={() => setShowOrderDetail(null)} style={{ fontSize: 24, color: '#bfbfbf', cursor: 'pointer' }}>&times;</span>
            </div>
            <div style={{ background: '#f5f7fa', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              {[{ label: '订单号', value: showOrderDetail.order_no }, { label: '商品', value: showOrderDetail.product_name }, { label: '数量', value: showOrderDetail.quantity }, { label: '金额', value: `¥${Number(showOrderDetail.amount).toFixed(2)}` }, { label: '状态', value: getStatusBadge(showOrderDetail.status).text }, { label: '下单时间', value: new Date(showOrderDetail.created_at).toLocaleString() }, { label: '联系方式', value: showOrderDetail.remark || '-' }].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                  <span style={{ color: '#8c8c8c' }}>{item.label}</span>
                  <span style={{ color: '#1a1a1a', fontWeight: 500, maxWidth: '60%', textAlign: 'right', wordBreak: 'break-all' }}>{item.value}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowOrderDetail(null)} style={{ width: '100%', padding: 12, background: '#f5f7fa', color: '#595959', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>关闭</button>
          </div>
        </div>
      )}

      {toast && <div className={`dc-toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
