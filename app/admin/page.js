'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

const MENU = [
  { key: 'dashboard', label: '数据概览', icon: '📊' },
  { key: 'products', label: '商品管理', icon: '📦' },
  { key: 'cards', label: '卡密管理', icon: '🔑' },
  { key: 'orders', label: '订单管理', icon: '🧾' },
  { key: 'settings', label: '系统设置', icon: '⚙️' },
];

export default function Admin() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);

  const [stats, setStats] = useState({ products: 0, orders: 0, paid: 0, revenue: 0 });
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ name: '', price: '', original_price: '', category: '', stock: 0, description: '', detail: '', image: '', status: 'active' });

  const [showCardModal, setShowCardModal] = useState(false);
  const [cardProductId, setCardProductId] = useState('');
  const [cardContent, setCardContent] = useState('');

  useEffect(() => {
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
        fetch(`${API_BASE}/products`), fetch(`${API_BASE}/orders`), fetch(`${API_BASE}/settings`)
      ]);
      const prodData = await prodRes.json();
      const orderData = await orderRes.json();
      const setData = await setRes.json();
      const prods = prodData.products || prodData.data || [];
      const ords = orderData.orders || orderData.data || [];
      setProducts(prods); setOrders(ords);
      setSettings(setData.settings || setData.data || {});
      const paid = ords.filter(o => o.status === 'paid' || o.status === 'completed');
      setStats({
        products: prods.length, orders: ords.length, paid: paid.length,
        revenue: paid.reduce((s, o) => s + (o.amount || o.total || 0), 0).toFixed(2)
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
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
        alert('保存成功'); setShowProductModal(false); loadData();
      } else { alert(data.error || '保存失败'); }
    } catch (e) { alert('保存失败'); }
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

  const saveSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) alert('保存成功'); else alert(data.error || '保存失败');
    } catch (e) { alert('保存失败'); }
  };

  if (authLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'rgba(255,255,255,0.5)' }}><div style={{ fontSize: '32px', marginRight: '12px' }}>⏳</div>加载中...</div>;

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative', zIndex: 1 }}>
        <div className="noise-overlay"></div>
        <div className="glass glass-lg animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '40px 36px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ width: '64px', height: '64px', margin: '0 auto 16px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(228,184,99,0.3), rgba(228,184,99,0.1))', border: '1px solid rgba(228,184,99,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E4B863', fontSize: '28px', fontWeight: 800 }}>N</div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>管理后台</h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>夜航发卡管理系统</p>
          </div>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>用户名</label>
              <input type="text" className="input-glass" value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>密码</label>
              <input type="password" className="input-glass" placeholder="请输入密码" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} />
            </div>
            <button type="submit" className="btn-gold" style={{ width: '100%', padding: '14px', fontSize: '16px' }} disabled={loginLoading}>
              {loginLoading ? '登录中...' : '登 录'}
            </button>
          </form>
          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>默认账号：admin / admin123</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', position: 'relative', zIndex: 1 }}>
      <div className="noise-overlay"></div>

      <div className="sidebar-glass" style={{ width: '240px', minHeight: '100vh', padding: '24px 16px', position: 'fixed', left: 0, top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px', padding: '0 8px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(228,184,99,0.3), rgba(228,184,99,0.1))', border: '1px solid rgba(228,184,99,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E4B863', fontWeight: 800 }}>N</div>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>夜航后台</span>
        </div>
        <div>
          {MENU.map((item) => (
            <div key={item.key} className={`sidebar-item ${activeMenu === item.key ? 'active' : ''}`} onClick={() => setActiveMenu(item.key)}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', bottom: '24px', left: '16px', right: '16px' }}>
          <button className="btn-ghost" style={{ width: '100%' }} onClick={handleLogout}>退出登录</button>
        </div>
      </div>

      <div style={{ flex: 1, marginLeft: '240px', padding: '24px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{MENU.find(m => m.key === activeMenu)?.label}</h1>
          <button className="btn-ghost" onClick={() => router.push('/')}>查看前台</button>
        </div>

        {activeMenu === 'dashboard' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
              {[
                { label: '商品总数', value: stats.products, icon: '📦', color: 'rgba(124,156,196,0.2)' },
                { label: '订单总数', value: stats.orders, icon: '🧾', color: 'rgba(228,184,99,0.15)' },
                { label: '已支付', value: stats.paid, icon: '✅', color: 'rgba(16,185,129,0.15)' },
                { label: '总收入', value: '¥' + stats.revenue, icon: '💰', color: 'rgba(228,184,99,0.2)' },
              ].map((s, i) => (
                <div key={i} className="stat-card animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '12px' }}>{s.icon}</div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>{s.label}</div>
                  <div className="price-gold" style={{ fontSize: '24px' }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div className="glass" style={{ padding: '24px' }}>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>最近订单</div>
              <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                <table className="table-glass">
                  <thead><tr><th>订单号</th><th>商品</th><th>金额</th><th>状态</th><th>时间</th></tr></thead>
                  <tbody>
                    {orders.slice(0, 5).map(o => (
                      <tr key={o.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{o.order_no || o.id}</td>
                        <td>{o.product_name}</td>
                        <td className="price-gold">¥{o.amount || o.total}</td>
                        <td><span style={{ color: o.status === 'paid' ? '#34d399' : '#fbbf24', fontSize: '13px' }}>{o.status === 'paid' ? '已支付' : '待支付'}</span></td>
                        <td style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{o.created_at ? new Date(o.created_at).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                    {orders.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'rgba(255,255,255,0.3)' }}>暂无订单</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeMenu === 'products' && (
          <div className="glass" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>商品列表（{products.length}）</div>
              <button className="btn-gold" onClick={() => { setEditingProduct(null); setProductForm({ name: '', price: '', original_price: '', category: '', stock: 0, description: '', detail: '', image: '', status: 'active' }); setShowProductModal(true); }}>➕ 添加商品</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table-glass">
                <thead><tr><th>ID</th><th>商品名称</th><th>分类</th><th>价格</th><th>库存</th><th>状态</th><th>操作</th></tr></thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td>{p.id}</td>
                      <td style={{ color: '#fff', fontWeight: 500 }}>{p.name}</td>
                      <td>{p.category || '-'}</td>
                      <td className="price-gold">¥{p.price}</td>
                      <td>{p.stock}</td>
                      <td><span style={{ color: p.status === 'active' ? '#34d399' : '#f87171', fontSize: '13px' }}>{p.status === 'active' ? '上架' : '下架'}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn-ghost" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => { setEditingProduct(p); setProductForm({ name: p.name, price: p.price, original_price: p.original_price || '', category: p.category || '', stock: p.stock || 0, description: p.description || '', detail: p.detail || '', image: p.image || '', status: p.status || 'active' }); setShowProductModal(true); }}>编辑</button>
                          <button style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '12px', cursor: 'pointer' }} onClick={() => deleteProduct(p.id)}>删除</button>
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
          <div className="glass" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>卡密库存</div>
              <button className="btn-gold" onClick={() => setShowCardModal(true)}>➕ 批量导入卡密</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table-glass">
                <thead><tr><th>ID</th><th>商品名称</th><th>分类</th><th>价格</th><th>库存</th><th>操作</th></tr></thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td>{p.id}</td>
                      <td style={{ color: '#fff' }}>{p.name}</td>
                      <td>{p.category || '-'}</td>
                      <td className="price-gold">¥{p.price}</td>
                      <td><span style={{ color: p.stock > 10 ? '#34d399' : p.stock > 0 ? '#fbbf24' : '#f87171', fontWeight: 600 }}>{p.stock} 件</span></td>
                      <td><button className="btn-gold" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={() => { setCardProductId(p.id); setShowCardModal(true); }}>导入卡密</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeMenu === 'orders' && (
          <div className="glass" style={{ padding: '24px' }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '20px' }}>订单列表（{orders.length}）</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table-glass">
                <thead><tr><th>订单号</th><th>商品</th><th>邮箱</th><th>金额</th><th>状态</th><th>时间</th></tr></thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{o.order_no || o.id}</td>
                      <td style={{ color: '#fff' }}>{o.product_name}</td>
                      <td>{o.email || o.contact || '-'}</td>
                      <td className="price-gold">¥{o.amount || o.total}</td>
                      <td><span style={{ color: o.status === 'paid' ? '#34d399' : '#fbbf24', fontSize: '13px' }}>{o.status === 'paid' ? '已支付' : '待支付'}</span></td>
                      <td style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{o.created_at ? new Date(o.created_at).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                  {orders.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'rgba(255,255,255,0.3)' }}>暂无订单</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeMenu === 'settings' && (
          <div className="glass" style={{ padding: '28px', maxWidth: '700px' }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '20px' }}>系统设置</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>网站名称</label>
                <input type="text" className="input-glass" value={settings.site_name || ''} onChange={(e) => setSettings({ ...settings, site_name: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>网站副标题</label>
                <input type="text" className="input-glass" value={settings.site_subtitle || ''} onChange={(e) => setSettings({ ...settings, site_subtitle: e.target.value })} />
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>网站公告</label>
              <textarea className="input-glass" style={{ minHeight: '80px', resize: 'vertical' }} value={settings.notice || ''} onChange={(e) => setSettings({ ...settings, notice: e.target.value })} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>页脚信息</label>
              <textarea className="input-glass" style={{ minHeight: '60px', resize: 'vertical' }} value={settings.footer || ''} onChange={(e) => setSettings({ ...settings, footer: e.target.value })} />
            </div>
            <div style={{ padding: '20px', background: 'rgba(228,184,99,0.05)', border: '1px solid rgba(228,184,99,0.15)', borderRadius: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#E4B863', marginBottom: '12px' }}>易支付配置</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>支付接口地址</label>
                  <input type="text" className="input-glass" style={{ fontSize: '13px' }} value={settings.epay_api || ''} onChange={(e) => setSettings({ ...settings, epay_api: e.target.value })} placeholder="https://pay.example.com" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>商户ID</label>
                  <input type="text" className="input-glass" style={{ fontSize: '13px' }} value={settings.epay_mchid || ''} onChange={(e) => setSettings({ ...settings, epay_mchid: e.target.value })} />
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>商户密钥</label>
                <input type="password" className="input-glass" style={{ fontSize: '13px' }} value={settings.epay_key || ''} onChange={(e) => setSettings({ ...settings, epay_key: e.target.value })} />
              </div>
            </div>
            <button className="btn-gold" style={{ padding: '12px 32px' }} onClick={saveSettings}>💾 保存设置</button>
          </div>
        )}
      </div>

      {showProductModal && (
        <div className="modal-overlay" onClick={() => setShowProductModal(false)}>
          <div className="modal-glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{editingProduct ? '编辑商品' : '添加商品'}</div>
              <div style={{ fontSize: '24px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }} onClick={() => setShowProductModal(false)}>×</div>
            </div>
            <div style={{ padding: '24px 28px', maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div><label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>商品名称 *</label><input type="text" className="input-glass" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} /></div>
                <div><label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>分类</label><input type="text" className="input-glass" value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} placeholder="如：会员、软件" /></div>
                <div><label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>售价 *</label><input type="number" step="0.01" className="input-glass" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} /></div>
                <div><label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>划线价</label><input type="number" step="0.01" className="input-glass" value={productForm.original_price} onChange={(e) => setProductForm({ ...productForm, original_price: e.target.value })} /></div>
                <div><label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>库存</label><input type="number" className="input-glass" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: parseInt(e.target.value) || 0 })} /></div>
                <div><label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>状态</label><select className="input-glass" value={productForm.status} onChange={(e) => setProductForm({ ...productForm, status: e.target.value })}><option value="active">上架</option><option value="inactive">下架</option></select></div>
              </div>
              <div style={{ marginTop: '14px' }}><label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>商品图片URL</label><input type="text" className="input-glass" value={productForm.image} onChange={(e) => setProductForm({ ...productForm, image: e.target.value })} placeholder="https://..." /></div>
              <div style={{ marginTop: '14px' }}><label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>商品简介</label><textarea className="input-glass" style={{ minHeight: '70px', resize: 'vertical' }} value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} /></div>
              <div style={{ marginTop: '14px' }}><label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>商品详情（支持HTML）</label><textarea className="input-glass" style={{ minHeight: '100px', resize: 'vertical' }} value={productForm.detail} onChange={(e) => setProductForm({ ...productForm, detail: e.target.value })} /></div>
            </div>
            <div style={{ padding: '20px 28px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn-ghost" onClick={() => setShowProductModal(false)}>取消</button>
              <button className="btn-gold" onClick={saveProduct}>保存</button>
            </div>
          </div>
        </div>
      )}

      {showCardModal && (
        <div className="modal-overlay" onClick={() => setShowCardModal(false)}>
          <div className="modal-glass" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>批量导入卡密</div>
              <div style={{ fontSize: '24px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }} onClick={() => setShowCardModal(false)}>×</div>
            </div>
            <div style={{ padding: '24px 28px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>选择商品</label>
                <select className="input-glass" value={cardProductId} onChange={(e) => setCardProductId(e.target.value)}>
                  <option value="">请选择商品</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}（库存：{p.stock}）</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>卡密内容（TXT每行一个，直接粘贴）</label>
                <textarea className="input-glass" style={{ minHeight: '200px', resize: 'vertical', fontFamily: 'monospace', fontSize: '13px' }} placeholder={'卡号----密码\n卡号----密码\n...'} value={cardContent} onChange={(e) => setCardContent(e.target.value)} />
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>共 {cardContent.split('\n').filter(c => c.trim()).length} 条卡密</div>
            </div>
            <div style={{ padding: '20px 28px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn-ghost" onClick={() => setShowCardModal(false)}>取消</button>
              <button className="btn-gold" onClick={importCards}>导入</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
