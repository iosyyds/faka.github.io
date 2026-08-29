'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

const MENU = [
  { group: '数据中心', items: [
    { key: 'dashboard', label: '仪表盘', icon: '📊' },
  ]},
  { group: '商品管理', items: [
    { key: 'products', label: '商品管理', icon: '📦' },
    { key: 'cards', label: '卡密库存', icon: '🔑' },
    { key: 'categories', label: '商品分类', icon: '🏷️' },
  ]},
  { group: '订单管理', items: [
    { key: 'orders', label: '订单管理', icon: '🧾' },
  ]},
  { group: '客户管理', items: [
    { key: 'customers', label: '客户列表', icon: '👥' },
  ]},
  { group: '系统管理', items: [
    { key: 'settings', label: '网站设置', icon: '⚙️' },
    { key: 'password', label: '修改密码', icon: '🔒' },
  ]},
];

export default function Admin() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 登录表单
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);

  // 数据
  const [stats, setStats] = useState({ products: 0, orders: 0, paid: 0, pending: 0, revenue: 0, customers: 0 });
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);

  // 商品编辑弹窗
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '', price: '', original_price: '', category: '', stock: 0,
    description: '', detail: '', image: '', sort: 0, status: 'active'
  });

  // 卡密导入弹窗
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardProductId, setCardProductId] = useState('');
  const [cardContent, setCardContent] = useState('');

  // 订单详情弹窗
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // 修改密码
  const [pwdForm, setPwdForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

  // 订单筛选
  const [orderFilter, setOrderFilter] = useState('all');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      setAuthed(true);
      loadData();
    }
    setAuthLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.password) { alert('请输入密码'); return; }
    setLoginLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('admin_token', data.token);
        setAuthed(true);
        loadData();
      } else {
        alert(data.error || '登录失败');
      }
    } catch (err) {
      alert('登录失败');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setAuthed(false);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, orderRes, setRes, userRes] = await Promise.all([
        fetch(`${API_BASE}/products`),
        fetch(`${API_BASE}/orders`),
        fetch(`${API_BASE}/settings`),
        fetch(`${API_BASE}/users`)
      ]);
      const prodData = await prodRes.json();
      const orderData = await orderRes.json();
      const setData = await setRes.json();
      const userData = await userRes.json();

      const prods = prodData.products || prodData.data || [];
      const ords = orderData.orders || orderData.data || [];
      const users = userData.users || userData.data || [];

      setProducts(prods);
      setOrders(ords);
      setCustomers(users);
      setSettings(setData.settings || setData.data || {});

      const paidOrders = ords.filter(o => o.status === 'paid' || o.status === 'completed');
      setStats({
        products: prods.length,
        orders: ords.length,
        paid: paidOrders.length,
        pending: ords.filter(o => o.status === 'pending').length,
        revenue: paidOrders.reduce((s, o) => s + (o.amount || o.total || 0), 0).toFixed(2),
        customers: users.length
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 商品操作
  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm({ name: '', price: '', original_price: '', category: '', stock: 0, description: '', detail: '', image: '', sort: 0, status: 'active' });
    setShowProductModal(true);
  };

  const openEditProduct = (p) => {
    setEditingProduct(p);
    setProductForm({
      name: p.name || '', price: p.price || '', original_price: p.original_price || '',
      category: p.category || '', stock: p.stock || 0, description: p.description || p.desc || '',
      detail: p.detail || '', image: p.image || '', sort: p.sort || 0, status: p.status || 'active'
    });
    setShowProductModal(true);
  };

  const saveProduct = async () => {
    if (!productForm.name || !productForm.price) { alert('请填写商品名称和价格'); return; }
    try {
      const url = editingProduct ? `${API_BASE}/product/${editingProduct.id}` : `${API_BASE}/product`;
      const method = editingProduct ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: JSON.stringify(productForm)
      });
      const data = await res.json();
      if (data.success || data.product || data.id) {
        alert('保存成功');
        setShowProductModal(false);
        loadData();
      } else {
        alert(data.error || '保存失败');
      }
    } catch (e) {
      alert('保存失败');
    }
  };

  const deleteProduct = async (id) => {
    if (!confirm('确定删除该商品？')) return;
    try {
      await fetch(`${API_BASE}/product/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` } });
      alert('删除成功');
      loadData();
    } catch (e) { alert('删除失败'); }
  };

  // 卡密导入
  const importCards = async () => {
    if (!cardProductId || !cardContent) { alert('请选择商品并输入卡密'); return; }
    const cards = cardContent.split('\n').filter(c => c.trim());
    try {
      const res = await fetch(`${API_BASE}/cards/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: JSON.stringify({ product_id: cardProductId, cards })
      });
      const data = await res.json();
      if (data.success || data.imported) {
        alert(`成功导入 ${data.imported || cards.length} 条卡密`);
        setShowCardModal(false);
        setCardContent('');
        loadData();
      } else {
        alert(data.error || '导入失败');
      }
    } catch (e) { alert('导入失败'); }
  };

  // 保存设置
  const saveSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) alert('保存成功');
      else alert(data.error || '保存失败');
    } catch (e) { alert('保存失败'); }
  };

  // 修改密码
  const changePassword = async () => {
    if (!pwdForm.oldPassword || !pwdForm.newPassword) { alert('请填写完整'); return; }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) { alert('两次密码不一致'); return; }
    if (pwdForm.newPassword.length < 6) { alert('新密码至少6位'); return; }
    try {
      const res = await fetch(`${API_BASE}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: JSON.stringify(pwdForm)
      });
      const data = await res.json();
      if (data.success) {
        alert('密码修改成功');
        setPwdForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        alert(data.error || '修改失败');
      }
    } catch (e) { alert('修改失败'); }
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: { text: '待支付', class: 'badge-warning' },
      paid: { text: '已支付', class: 'badge-success' },
      completed: { text: '已完成', class: 'badge-success' },
      failed: { text: '已失败', class: 'badge-danger' },
      active: { text: '上架中', class: 'badge-success' },
      inactive: { text: '已下架', class: 'badge-secondary' }
    };
    const s = map[status] || { text: status, class: 'badge-secondary' };
    return <span className={`badge ${s.class}`}>{s.text}</span>;
  };

  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'all') return true;
    return o.status === orderFilter;
  });

  if (authLoading) {
    return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}><div className="spinner"></div></div>;
  }

  // 登录页
  if (!authed) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        padding: '20px'
      }}>
        <div className="card" style={{width: '100%', maxWidth: '400px'}}>
          <div style={{padding: '32px', textAlign: 'center'}}>
            <div style={{
              width: '64px', height: '64px',
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              borderRadius: '16px',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '28px', fontWeight: 800, marginBottom: '16px'
            }}>N</div>
            <h1 style={{fontSize: '22px', fontWeight: 700, marginBottom: '4px'}}>后台管理</h1>
            <p style={{fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px'}}>Nova Key 管理系统</p>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">用户名</label>
                <input type="text" className="form-input" value={loginForm.username}
                  onChange={(e) => setLoginForm({...loginForm, username: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">密码</label>
                <input type="password" className="form-input" placeholder="请输入密码"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary btn-lg" style={{width: '100%'}} disabled={loginLoading}>
                {loginLoading ? '登录中...' : '登 录'}
              </button>
            </form>
            <div style={{marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)'}}>
              默认账号：admin / admin123
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* 侧边栏 */}
      <div className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-logo">
          <div style={{
            width: '36px', height: '36px',
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: '14px'
          }}>N</div>
          Nova Key
        </div>
        <div className="admin-sidebar-menu">
          {MENU.map((group, gi) => (
            <div key={gi} className="admin-sidebar-group">
              <div className="admin-sidebar-group-title">{group.group}</div>
              {group.items.map((item) => (
                <div
                  key={item.key}
                  className={`admin-sidebar-item ${activeMenu === item.key ? 'active' : ''}`}
                  onClick={() => { setActiveMenu(item.key); setSidebarOpen(false); }}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 主内容 */}
      <div className="admin-main">
        <div className="admin-header">
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <button
              className="btn btn-secondary btn-sm"
              style={{display: 'none'}}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              ☰
            </button>
            <div className="admin-header-title">
              {MENU.flatMap(g => g.items).find(i => i.key === activeMenu)?.label}
            </div>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <button className="btn btn-secondary btn-sm" onClick={() => router.push('/')}>查看前台</button>
            <button className="btn btn-danger btn-sm" onClick={handleLogout}>退出</button>
          </div>
        </div>

        <div className="admin-content">
          {/* 仪表盘 */}
          {activeMenu === 'dashboard' && (
            <div>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-card-icon" style={{background:'#ede9fe',color:'#7c3aed'}}>📦</div>
                  <div className="stat-card-label">商品总数</div>
                  <div className="stat-card-value">{stats.products}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-icon" style={{background:'#dbeafe',color:'#2563eb'}}>🧾</div>
                  <div className="stat-card-label">订单总数</div>
                  <div className="stat-card-value">{stats.orders}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-icon" style={{background:'#d1fae5',color:'#059669'}}>✅</div>
                  <div className="stat-card-label">已支付</div>
                  <div className="stat-card-value">{stats.paid}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-icon" style={{background:'#fef3c7',color:'#d97706'}}>⏳</div>
                  <div className="stat-card-label">待支付</div>
                  <div className="stat-card-value">{stats.pending}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-icon" style={{background:'#fee2e2',color:'#dc2626'}}>💰</div>
                  <div className="stat-card-label">总收入</div>
                  <div className="stat-card-value">¥{stats.revenue}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-icon" style={{background:'#fce7f3',color:'#db2777'}}>👥</div>
                  <div className="stat-card-label">注册用户</div>
                  <div className="stat-card-value">{stats.customers}</div>
                </div>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px'}}>
                <div className="card">
                  <div className="card-header"><div className="card-title">最近订单</div></div>
                  <div className="table-wrapper">
                    <table className="table">
                      <thead><tr><th>订单号</th><th>商品</th><th>金额</th><th>状态</th></tr></thead>
                      <tbody>
                        {orders.slice(0, 5).map(o => (
                          <tr key={o.id}>
                            <td style={{fontFamily:'monospace',fontSize:'12px'}}>{o.order_no || o.id}</td>
                            <td>{o.product_name}</td>
                            <td style={{color:'var(--danger)',fontWeight:600}}>¥{o.amount || o.total}</td>
                            <td>{getStatusBadge(o.status)}</td>
                          </tr>
                        ))}
                        {orders.length === 0 && <tr><td colSpan="4" style={{textAlign:'center',padding:'24px',color:'var(--text-muted)'}}>暂无订单</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="card">
                  <div className="card-header"><div className="card-title">快捷操作</div></div>
                  <div className="card-body" style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                    <button className="btn btn-primary" onClick={openAddProduct}>➕ 添加商品</button>
                    <button className="btn btn-secondary" onClick={() => setShowCardModal(true)}>🔑 导入卡密</button>
                    <button className="btn btn-secondary" onClick={() => setActiveMenu('orders')}>🧾 查看订单</button>
                    <button className="btn btn-secondary" onClick={() => setActiveMenu('settings')}>⚙️ 网站设置</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 商品管理 */}
          {activeMenu === 'products' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">商品列表（{products.length}）</div>
                <button className="btn btn-primary btn-sm" onClick={openAddProduct}>➕ 添加商品</button>
              </div>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th><th>图片</th><th>商品名称</th><th>分类</th>
                      <th>价格</th><th>库存</th><th>销量</th><th>状态</th><th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id}>
                        <td>{p.id}</td>
                        <td>
                          {p.image ? <img src={p.image} style={{width:'40px',height:'40px',objectFit:'cover',borderRadius:'6px'}} /> : <div style={{width:'40px',height:'40px',background:'var(--bg-hover)',borderRadius:'6px',display:'flex',alignItems:'center',justifyContent:'center'}}>🎁</div>}
                        </td>
                        <td style={{fontWeight:500}}>{p.name}</td>
                        <td>{p.category || '-'}</td>
                        <td style={{color:'var(--danger)',fontWeight:600}}>¥{p.price}</td>
                        <td>{p.stock}</td>
                        <td>{p.sales || 0}</td>
                        <td>{getStatusBadge(p.status || 'active')}</td>
                        <td>
                          <div style={{display:'flex',gap:'6px'}}>
                            <button className="btn btn-secondary btn-sm" onClick={() => openEditProduct(p)}>编辑</button>
                            <button className="btn btn-danger btn-sm" onClick={() => deleteProduct(p.id)}>删除</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && <tr><td colSpan="9"><div className="empty"><div className="empty-icon">📦</div><div className="empty-text">暂无商品，点击右上角添加</div></div></td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 卡密库存 */}
          {activeMenu === 'cards' && (
            <div>
              <div className="card" style={{marginBottom:'20px'}}>
                <div className="card-header">
                  <div className="card-title">库存概览</div>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowCardModal(true)}>➕ 批量导入卡密</button>
                </div>
                <div className="table-wrapper">
                  <table className="table">
                    <thead><tr><th>ID</th><th>商品名称</th><th>分类</th><th>价格</th><th>库存</th><th>销量</th><th>操作</th></tr></thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.id}>
                          <td>{p.id}</td>
                          <td style={{fontWeight:500}}>{p.name}</td>
                          <td>{p.category || '-'}</td>
                          <td>¥{p.price}</td>
                          <td>
                            <span className={`badge ${p.stock > 10 ? 'badge-success' : p.stock > 0 ? 'badge-warning' : 'badge-danger'}`}>
                              {p.stock} 件
                            </span>
                          </td>
                          <td>{p.sales || 0}</td>
                          <td>
                            <button className="btn btn-primary btn-sm" onClick={() => { setCardProductId(p.id); setShowCardModal(true); }}>
                              导入卡密
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 商品分类 */}
          {activeMenu === 'categories' && (
            <div className="card">
              <div className="card-header"><div className="card-title">商品分类</div></div>
              <div className="card-body">
                <div style={{display:'flex',flexWrap:'wrap',gap:'10px'}}>
                  {[...new Set(products.map(p => p.category).filter(Boolean))].map((cat, i) => (
                    <span key={i} className="badge badge-primary" style={{padding:'8px 16px',fontSize:'14px'}}>{cat}</span>
                  ))}
                  {products.filter(p => p.category).length === 0 && <p style={{color:'var(--text-muted)'}}>暂无分类，在添加商品时输入分类名称即可自动创建</p>}
                </div>
              </div>
            </div>
          )}

          {/* 订单管理 */}
          {activeMenu === 'orders' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">订单列表（{filteredOrders.length}）</div>
              </div>
              <div style={{padding:'16px 20px',borderBottom:'1px solid var(--border)',display:'flex',gap:'8px',flexWrap:'wrap'}}>
                {[
                  {key:'all',label:'全部'},
                  {key:'pending',label:'待支付'},
                  {key:'paid',label:'已支付'},
                  {key:'completed',label:'已完成'},
                  {key:'failed',label:'已失败'}
                ].map(f => (
                  <button
                    key={f.key}
                    className={`btn btn-sm ${orderFilter === f.key ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setOrderFilter(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr><th>订单号</th><th>商品</th><th>联系方式</th><th>金额</th><th>支付方式</th><th>状态</th><th>下单时间</th><th>操作</th></tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(o => (
                      <tr key={o.id}>
                        <td style={{fontFamily:'monospace',fontSize:'12px'}}>{o.order_no || o.id}</td>
                        <td>{o.product_name}</td>
                        <td>{o.contact || '-'}</td>
                        <td style={{color:'var(--danger)',fontWeight:600}}>¥{o.amount || o.total}</td>
                        <td>{o.pay_method || 'alipay'}</td>
                        <td>{getStatusBadge(o.status)}</td>
                        <td style={{fontSize:'12px',color:'var(--text-muted)'}}>{o.created_at ? new Date(o.created_at).toLocaleString() : '-'}</td>
                        <td>
                          <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedOrder(o); setShowOrderModal(true); }}>详情</button>
                        </td>
                      </tr>
                    ))}
                    {filteredOrders.length === 0 && <tr><td colSpan="8"><div className="empty"><div className="empty-icon">🧾</div><div className="empty-text">暂无订单</div></div></td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 客户管理 */}
          {activeMenu === 'customers' && (
            <div className="card">
              <div className="card-header"><div className="card-title">客户列表（{customers.length}）</div></div>
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>ID</th><th>用户名</th><th>邮箱</th><th>余额</th><th>注册时间</th><th>状态</th></tr></thead>
                  <tbody>
                    {customers.map(u => (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td style={{fontWeight:500}}>{u.username}</td>
                        <td>{u.email || '-'}</td>
                        <td>¥{u.balance || 0}</td>
                        <td style={{fontSize:'12px',color:'var(--text-muted)'}}>{u.created_at ? new Date(u.created_at).toLocaleString() : '-'}</td>
                        <td><span className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{u.status === 'active' ? '正常' : '禁用'}</span></td>
                      </tr>
                    ))}
                    {customers.length === 0 && <tr><td colSpan="6"><div className="empty"><div className="empty-icon">👥</div><div className="empty-text">暂无注册用户</div></div></td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 网站设置 */}
          {activeMenu === 'settings' && (
            <div className="card">
              <div className="card-header"><div className="card-title">网站设置</div></div>
              <div className="card-body">
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
                  <div className="form-group">
                    <label className="form-label">网站名称</label>
                    <input type="text" className="form-input" value={settings.site_name || ''}
                      onChange={(e) => setSettings({...settings, site_name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">网站副标题</label>
                    <input type="text" className="form-input" value={settings.site_subtitle || ''}
                      onChange={(e) => setSettings({...settings, site_subtitle: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">联系方式</label>
                    <input type="text" className="form-input" value={settings.contact || ''}
                      onChange={(e) => setSettings({...settings, contact: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ICP备案号</label>
                    <input type="text" className="form-input" value={settings.icp || ''}
                      onChange={(e) => setSettings({...settings, icp: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">网站公告</label>
                  <textarea className="form-textarea" value={settings.notice || ''}
                    onChange={(e) => setSettings({...settings, notice: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">页脚信息</label>
                  <textarea className="form-textarea" value={settings.footer || ''}
                    onChange={(e) => setSettings({...settings, footer: e.target.value})} />
                </div>
                <button className="btn btn-primary" onClick={saveSettings}>💾 保存设置</button>
              </div>
            </div>
          )}

          {/* 修改密码 */}
          {activeMenu === 'password' && (
            <div className="card" style={{maxWidth:'500px'}}>
              <div className="card-header"><div className="card-title">修改管理员密码</div></div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">当前密码</label>
                  <input type="password" className="form-input" value={pwdForm.oldPassword}
                    onChange={(e) => setPwdForm({...pwdForm, oldPassword: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">新密码（至少6位）</label>
                  <input type="password" className="form-input" value={pwdForm.newPassword}
                    onChange={(e) => setPwdForm({...pwdForm, newPassword: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">确认新密码</label>
                  <input type="password" className="form-input" value={pwdForm.confirmPassword}
                    onChange={(e) => setPwdForm({...pwdForm, confirmPassword: e.target.value})} />
                </div>
                <button className="btn btn-primary" onClick={changePassword}>🔒 修改密码</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 商品编辑弹窗 */}
      {showProductModal && (
        <div className="modal-overlay" onClick={() => setShowProductModal(false)}>
          <div className="modal" style={{maxWidth:'600px'}} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingProduct ? '编辑商品' : '添加商品'}</div>
              <div className="modal-close" onClick={() => setShowProductModal(false)}>×</div>
            </div>
            <div className="modal-body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                <div className="form-group">
                  <label className="form-label">商品名称 *</label>
                  <input type="text" className="form-input" value={productForm.name}
                    onChange={(e) => setProductForm({...productForm, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">分类</label>
                  <input type="text" className="form-input" value={productForm.category}
                    onChange={(e) => setProductForm({...productForm, category: e.target.value})} placeholder="如：会员、软件" />
                </div>
                <div className="form-group">
                  <label className="form-label">售价 *</label>
                  <input type="number" step="0.01" className="form-input" value={productForm.price}
                    onChange={(e) => setProductForm({...productForm, price: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">划线价</label>
                  <input type="number" step="0.01" className="form-input" value={productForm.original_price}
                    onChange={(e) => setProductForm({...productForm, original_price: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">库存</label>
                  <input type="number" className="form-input" value={productForm.stock}
                    onChange={(e) => setProductForm({...productForm, stock: parseInt(e.target.value) || 0})} />
                </div>
                <div className="form-group">
                  <label className="form-label">排序</label>
                  <input type="number" className="form-input" value={productForm.sort}
                    onChange={(e) => setProductForm({...productForm, sort: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">商品图片URL</label>
                <input type="text" className="form-input" value={productForm.image}
                  onChange={(e) => setProductForm({...productForm, image: e.target.value})} placeholder="https://..." />
              </div>
              <div className="form-group">
                <label className="form-label">商品简介</label>
                <textarea className="form-textarea" value={productForm.description}
                  onChange={(e) => setProductForm({...productForm, description: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">商品详情（支持HTML）</label>
                <textarea className="form-textarea" style={{minHeight:'120px'}} value={productForm.detail}
                  onChange={(e) => setProductForm({...productForm, detail: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">状态</label>
                <select className="form-select" value={productForm.status}
                  onChange={(e) => setProductForm({...productForm, status: e.target.value})}>
                  <option value="active">上架</option>
                  <option value="inactive">下架</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowProductModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={saveProduct}>保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 卡密导入弹窗 */}
      {showCardModal && (
        <div className="modal-overlay" onClick={() => setShowCardModal(false)}>
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
                <label className="form-label">卡密内容（每行一条）</label>
                <textarea className="form-textarea" style={{minHeight:'200px',fontFamily:'monospace'}}
                  placeholder={'卡号----密码\n卡号----密码\n...'}
                  value={cardContent} onChange={(e) => setCardContent(e.target.value)} />
              </div>
              <p style={{fontSize:'12px',color:'var(--text-muted)'}}>
                共 {cardContent.split('\n').filter(c => c.trim()).length} 条卡密
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCardModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={importCards}>导入</button>
            </div>
          </div>
        </div>
      )}

      {/* 订单详情弹窗 */}
      {showOrderModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowOrderModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">订单详情</div>
              <div className="modal-close" onClick={() => setShowOrderModal(false)}>×</div>
            </div>
            <div className="modal-body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'16px'}}>
                <div><span style={{color:'var(--text-muted)'}}>订单号：</span><span style={{fontFamily:'monospace'}}>{selectedOrder.order_no || selectedOrder.id}</span></div>
                <div><span style={{color:'var(--text-muted)'}}>状态：</span>{getStatusBadge(selectedOrder.status)}</div>
                <div><span style={{color:'var(--text-muted)'}}>商品：</span>{selectedOrder.product_name}</div>
                <div><span style={{color:'var(--text-muted)'}}>金额：</span><span style={{color:'var(--danger)',fontWeight:600}}>¥{selectedOrder.amount || selectedOrder.total}</span></div>
                <div><span style={{color:'var(--text-muted)'}}>联系方式：</span>{selectedOrder.contact || '-'}</div>
                <div><span style={{color:'var(--text-muted)'}}>支付方式：</span>{selectedOrder.pay_method || 'alipay'}</div>
                <div style={{gridColumn:'1/-1'}}><span style={{color:'var(--text-muted)'}}>下单时间：</span>{selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString() : '-'}</div>
              </div>
              {selectedOrder.cards && selectedOrder.cards.length > 0 && (
                <div>
                  <div style={{fontWeight:600,marginBottom:'8px'}}>卡密信息：</div>
                  {selectedOrder.cards.map((card, i) => (
                    <div key={i} style={{padding:'10px',background:'var(--bg)',borderRadius:'6px',marginBottom:'6px',fontFamily:'monospace',fontSize:'13px'}}>
                      {card.card_content || card.content || card}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowOrderModal(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
