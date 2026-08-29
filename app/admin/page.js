'use client';

import { useState, useEffect } from 'react';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

export default function AdminPage() {
  const [token, setToken] = useState(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({ totalProducts: 0, totalCards: 0, totalOrders: 0, paidOrders: 0, totalRevenue: 0 });
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [settings, setSettings] = useState({});
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ name: '', description: '', price: '', sort_order: '0', category: '全部' });
  const [cardProductId, setCardProductId] = useState('');
  const [cardRawText, setCardRawText] = useState('');
  const [cardStats, setCardStats] = useState(null);
  const [cards, setCards] = useState([]);
  const [showCardManage, setShowCardManage] = useState(false);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('admin_token');
    if (savedToken) {
      setToken(savedToken);
      loadDashboard(savedToken);
    }
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const apiCall = async (endpoint, options = {}) => {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    return res.json();
  };

  const handleLogin = async () => {
    if (!loginPassword) { setLoginError('请输入密码'); return; }
    try {
      const res = await fetch(`${API_BASE}/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword })
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        localStorage.setItem('admin_token', data.token);
        setLoginError('');
        loadDashboard(data.token);
      } else {
        setLoginError(data.message || '登录失败');
      }
    } catch (err) {
      setLoginError('网络错误');
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('admin_token');
  };

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
      if (settingsData.success) setSettings(settingsData.settings);

      const paidOrders = ordersData.orders?.filter(o => o.status === 'paid') || [];
      const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0);
      setStats({
        totalProducts: productsData.products?.length || 0,
        totalCards: productsData.products?.reduce((sum, p) => sum + (p.stock || 0), 0) || 0,
        totalOrders: ordersData.orders?.length || 0,
        paidOrders: paidOrders.length,
        totalRevenue: totalRevenue.toFixed(2)
      });
    } catch (err) {
      console.error('加载数据失败:', err);
    }
  };

  // 商品管理
  const openAddProduct = () => {
    setProductForm({ name: '', description: '', price: '', sort_order: '0', category: '全部' });
    setEditingProduct(null);
    setShowAddProduct(true);
  };

  const openEditProduct = (product) => {
    setProductForm({
      name: product.name,
      description: product.description || '',
      price: product.price,
      sort_order: product.sort_order || 0,
      category: product.category || '全部'
    });
    setEditingProduct(product);
    setShowAddProduct(true);
  };

  const saveProduct = async () => {
    if (!productForm.name.trim()) { showToast('商品名称不能为空', 'error'); return; }
    if (!productForm.price || parseFloat(productForm.price) <= 0) { showToast('价格必须大于0', 'error'); return; }
    setLoading(true);
    try {
      if (editingProduct) {
        const data = await apiCall(`/admin-products?id=${editingProduct.id}`, { method: 'PUT', body: JSON.stringify(productForm) });
        if (data.success) { showToast('商品已更新'); setShowAddProduct(false); loadDashboard(); }
        else showToast(data.message || '更新失败', 'error');
      } else {
        const data = await apiCall('/admin-products', { method: 'POST', body: JSON.stringify(productForm) });
        if (data.success) { showToast('商品已添加'); setShowAddProduct(false); loadDashboard(); }
        else showToast(data.message || '添加失败', 'error');
      }
    } catch (err) { showToast('网络错误', 'error'); }
    finally { setLoading(false); }
  };

  const deleteProduct = async (id) => {
    if (!confirm('确定删除该商品？相关卡密也会被删除。')) return;
    const data = await apiCall(`/admin-products?id=${id}`, { method: 'DELETE' });
    if (data.success) { showToast('商品已删除'); loadDashboard(); }
    else showToast(data.message || '删除失败', 'error');
  };

  const toggleProductActive = async (product) => {
    const data = await apiCall(`/admin-products?id=${product.id}`, { method: 'PUT', body: JSON.stringify({ is_active: !product.is_active }) });
    if (data.success) { showToast(product.is_active ? '已下架' : '已上架'); loadDashboard(); }
  };

  // 卡密管理
  const loadCards = async (productId) => {
    if (!productId) return;
    const data = await apiCall(`/admin-card-manage?productId=${productId}`);
    if (data.success) {
      setCards(data.cards);
      setCardStats(data.stats);
      setShowCardManage(true);
    }
  };

  const importCards = async () => {
    if (!cardProductId) { showToast('请选择商品', 'error'); return; }
    if (!cardRawText.trim()) { showToast('请输入卡密内容', 'error'); return; }
    setLoading(true);
    try {
      const data = await apiCall('/admin-cards', { method: 'POST', body: JSON.stringify({ productId: cardProductId, rawText: cardRawText, cardType: 'default' }) });
      if (data.success) {
        showToast(data.message || '导入成功');
        setCardRawText('');
        loadCards(cardProductId);
        loadDashboard();
      } else showToast(data.message || '导入失败', 'error');
    } catch (err) { showToast('网络错误', 'error'); }
    finally { setLoading(false); }
  };

  const clearAvailableCards = async (productId) => {
    if (!confirm('确定清空该商品所有未使用卡密？')) return;
    const data = await apiCall('/admin-card-manage', { method: 'POST', body: JSON.stringify({ action: 'clear_available', productId }) });
    if (data.success) { showToast(data.message); loadCards(productId); loadDashboard(); }
    else showToast(data.message || '操作失败', 'error');
  };

  // 订单管理
  const filteredOrders = orders.filter(o => orderStatusFilter === 'all' || o.status === orderStatusFilter);

  const markOrderPaid = async (orderId) => {
    if (!confirm('确定手动标记该订单为已支付？将自动发卡。')) return;
    const data = await apiCall('/admin-order-manage', { method: 'POST', body: JSON.stringify({ action: 'mark_paid', orderId }) });
    if (data.success) { showToast('已标记为已支付'); loadDashboard(); }
    else showToast(data.message || '操作失败', 'error');
  };

  const markOrderFailed = async (orderId) => {
    const data = await apiCall('/admin-order-manage', { method: 'POST', body: JSON.stringify({ action: 'mark_failed', orderId }) });
    if (data.success) { showToast('已标记为失败'); loadDashboard(); }
  };

  const deleteOrder = async (orderId) => {
    if (!confirm('确定删除该订单？')) return;
    const data = await apiCall('/admin-order-manage', { method: 'POST', body: JSON.stringify({ action: 'delete', orderId }) });
    if (data.success) { showToast('订单已删除'); loadDashboard(); }
  };

  // 网站设置
  const saveSettings = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/settings', { method: 'POST', body: JSON.stringify(settings) });
      if (data.success) showToast('设置已保存');
      else showToast(data.message || '保存失败', 'error');
    } catch (err) { showToast('网络错误', 'error'); }
    finally { setLoading(false); }
  };

  const statusMap = {
    paid: { text: '已支付', bg: '#f6ffed', color: '#52c41a' },
    pending: { text: '待支付', bg: '#fffbe6', color: '#faad14' },
    failed: { text: '已失败', bg: '#fff2f0', color: '#ff4d4f' }
  };

  // 登录页
  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px' }}>
        <div style={{ background: '#fff', padding: '32px 24px', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', width: '100%', maxWidth: '360px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, #1677ff, #69b1ff)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '24px' }}>🎫</div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#1f1f1f' }}>管理后台</h2>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#8c8c8c' }}>请输入管理密码登录</p>
          </div>
          <input
            type="password"
            placeholder="管理密码"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            style={{ width: '100%', padding: '14px 16px', border: '1.5px solid #e8e8e8', borderRadius: '10px', marginBottom: '12px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
          />
          {loginError && <div style={{ color: '#ff4d4f', marginBottom: '12px', fontSize: '13px', textAlign: 'center' }}>{loginError}</div>}
          <button
            onClick={handleLogin}
            style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #1677ff, #4096ff)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(22,119,255,0.3)' }}
          >登 录</button>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'dashboard', label: '概览', icon: '📊' },
    { key: 'products', label: '商品', icon: '📦' },
    { key: 'cards', label: '卡密', icon: '🎫' },
    { key: 'orders', label: '订单', icon: '📋' },
    { key: 'settings', label: '设置', icon: '⚙️' }
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', paddingBottom: '100px' }}>
      {/* 顶部导航 */}
      <div style={{ background: '#fff', padding: '0 16px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ fontSize: '17px', fontWeight: 700, color: '#1677ff' }}>{tabs.find(t => t.key === activeTab)?.label}</div>
        <button onClick={handleLogout} style={{ background: '#fff2f0', border: 'none', color: '#ff4d4f', cursor: 'pointer', fontSize: '13px', padding: '6px 12px', borderRadius: '8px', fontWeight: 500 }}>退出</button>
      </div>

      <div style={{ padding: '16px' }}>
        {/* 概览页 */}
        {activeTab === 'dashboard' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              {[
                { label: '商品总数', value: stats.totalProducts, icon: '📦', bg: '#e6f4ff', color: '#1677ff' },
                { label: '卡密总数', value: stats.totalCards, icon: '🎫', bg: '#f6ffed', color: '#52c41a' },
                { label: '订单总数', value: stats.totalOrders, icon: '📋', bg: '#fffbe6', color: '#faad14' },
                { label: '已支付', value: stats.paidOrders, icon: '✅', bg: '#f9f0ff', color: '#722ed1' }
              ].map((stat, i) => (
                <div key={i} style={{ background: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '40px', height: '40px', background: stat.bg, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{stat.icon}</div>
                    <div>
                      <div style={{ fontSize: '22px', fontWeight: 700, color: stat.color, lineHeight: 1.2 }}>{stat.value}</div>
                      <div style={{ fontSize: '12px', color: '#8c8c8c' }}>{stat.label}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: 'linear-gradient(135deg, #ff6b6b, #ee5a5a)', padding: '20px', borderRadius: '12px', color: '#fff', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '4px' }}>总收入</div>
              <div style={{ fontSize: '32px', fontWeight: 700 }}>¥{stats.totalRevenue}</div>
            </div>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: '#1f1f1f' }}>最近订单</div>
              {orders.slice(0, 5).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#8c8c8c', fontSize: '13px' }}>暂无订单</div>
              ) : (
                orders.slice(0, 5).map(o => (
                  <div key={o.id} style={{ padding: '12px 0', borderBottom: '1px solid #f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: '#1f1f1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.product_name}</div>
                      <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '2px' }}>{new Date(o.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <div style={{ textAlign: 'right', marginLeft: '12px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: '#ff4d4f' }}>¥{Number(o.amount).toFixed(2)}</div>
                      <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: statusMap[o.status]?.bg, color: statusMap[o.status]?.color }}>{statusMap[o.status]?.text}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 商品管理 */}
        {activeTab === 'products' && (
          <div>
            <button onClick={openAddProduct} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #1677ff, #4096ff)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', marginBottom: '16px', boxShadow: '0 4px 12px rgba(22,119,255,0.25)' }}>+ 添加商品</button>
            {products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', background: '#fff', borderRadius: '12px' }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>📦</div>
                <div style={{ color: '#8c8c8c', fontSize: '14px' }}>暂无商品，点击上方按钮添加</div>
              </div>
            ) : (
              products.map(p => (
                <div key={p.id} style={{ background: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{ flex: 1, minWidth: 0, marginRight: '10px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: '#1f1f1f' }}>{p.name}</div>
                      <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>分类：{p.category || '全部'} · 库存：{p.stock}</div>
                    </div>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: '#ff4d4f', flexShrink: 0 }}>¥{Number(p.price).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button onClick={() => openEditProduct(p)} style={{ flex: 1, padding: '10px', background: '#e6f4ff', color: '#1677ff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>编辑</button>
                    <button onClick={() => toggleProductActive(p)} style={{ flex: 1, padding: '10px', background: p.is_active ? '#fffbe6' : '#f6ffed', color: p.is_active ? '#faad14' : '#52c41a', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>{p.is_active ? '下架' : '上架'}</button>
                    <button onClick={() => deleteProduct(p.id)} style={{ flex: 1, padding: '10px', background: '#fff2f0', color: '#ff4d4f', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>删除</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 卡密管理 */}
        {activeTab === 'cards' && (
          <div>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: '#1f1f1f' }}>选择商品</div>
              <select
                value={cardProductId}
                onChange={(e) => setCardProductId(e.target.value)}
                style={{ width: '100%', padding: '12px', border: '1.5px solid #e8e8e8', borderRadius: '10px', fontSize: '14px', background: '#fff', marginBottom: '12px' }}
              >
                <option value="">请选择商品</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}（库存{p.stock}）</option>)}
              </select>
              <textarea
                value={cardRawText}
                onChange={(e) => setCardRawText(e.target.value)}
                placeholder="每行一个卡密，粘贴后点击导入"
                style={{ width: '100%', height: '120px', padding: '12px', border: '1.5px solid #e8e8e8', borderRadius: '10px', fontSize: '13px', fontFamily: 'monospace', resize: 'vertical', marginBottom: '12px', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={importCards} disabled={loading} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #1677ff, #4096ff)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>{loading ? '导入中...' : '导入卡密'}</button>
                {cardProductId && <button onClick={() => clearAvailableCards(cardProductId)} style={{ padding: '12px 16px', background: '#fff2f0', color: '#ff4d4f', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>清空</button>}
              </div>
            </div>
            {cardProductId && (
              <button onClick={() => loadCards(cardProductId)} style={{ width: '100%', padding: '12px', background: '#f6ffed', color: '#52c41a', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: '16px' }}>查看卡密列表</button>
            )}
            {showCardManage && cards.length > 0 && (
              <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>卡密列表（{cards.length}）</div>
                  <button onClick={() => setShowCardManage(false)} style={{ background: 'none', border: 'none', color: '#8c8c8c', fontSize: '13px', cursor: 'pointer' }}>收起</button>
                </div>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {cards.map(c => (
                    <div key={c.id} style={{ padding: '12px', background: '#fafafa', borderRadius: '8px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#8c8c8c' }}>ID: {c.id}</span>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: c.status === 'available' ? '#f6ffed' : '#fff2f0', color: c.status === 'available' ? '#52c41a' : '#ff4d4f' }}>{c.status === 'available' ? '未使用' : '已使用'}</span>
                      </div>
                      <div style={{ fontSize: '13px', fontFamily: 'monospace', wordBreak: 'break-all', color: '#1f1f1f' }}>{c.card_content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 订单管理 */}
        {activeTab === 'orders' && (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
              {[
                { key: 'all', label: '全部' },
                { key: 'pending', label: '待支付' },
                { key: 'paid', label: '已支付' },
                { key: 'failed', label: '已失败' }
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setOrderStatusFilter(f.key)}
                  style={{ flexShrink: 0, padding: '8px 16px', background: orderStatusFilter === f.key ? '#1677ff' : '#fff', color: orderStatusFilter === f.key ? '#fff' : '#595959', border: 'none', borderRadius: '20px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', boxShadow: orderStatusFilter === f.key ? '0 2px 8px rgba(22,119,255,0.3)' : '0 1px 4px rgba(0,0,0,0.05)' }}
                >{f.label}</button>
              ))}
            </div>
            {filteredOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', background: '#fff', borderRadius: '12px' }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>📋</div>
                <div style={{ color: '#8c8c8c', fontSize: '14px' }}>暂无订单</div>
              </div>
            ) : (
              filteredOrders.map(o => (
                <div key={o.id} style={{ background: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{ flex: 1, minWidth: 0, marginRight: '10px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: '#1f1f1f' }}>{o.product_name}</div>
                      <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '4px', fontFamily: 'monospace' }}>{o.order_no}</div>
                      <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '2px' }}>{new Date(o.created_at).toLocaleString('zh-CN')}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#ff4d4f' }}>¥{Number(o.amount).toFixed(2)}</div>
                      <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: statusMap[o.status]?.bg, color: statusMap[o.status]?.color, fontWeight: 500 }}>{statusMap[o.status]?.text}</span>
                    </div>
                  </div>
                  {o.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f5f5f5' }}>
                      <button onClick={() => markOrderPaid(o.id)} style={{ flex: 1, padding: '10px', background: '#f6ffed', color: '#52c41a', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>标记支付</button>
                      <button onClick={() => markOrderFailed(o.id)} style={{ flex: 1, padding: '10px', background: '#fffbe6', color: '#faad14', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>标记失败</button>
                      <button onClick={() => deleteOrder(o.id)} style={{ flex: 1, padding: '10px', background: '#fff2f0', color: '#ff4d4f', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>删除</button>
                    </div>
                  )}
                  {o.status !== 'pending' && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f5f5f5', textAlign: 'right' }}>
                      <button onClick={() => deleteOrder(o.id)} style={{ padding: '8px 16px', background: '#fff2f0', color: '#ff4d4f', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>删除订单</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* 网站设置 */}
        {activeTab === 'settings' && (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            {[
              { key: 'site_logo', label: '网站Logo（图片URL）', type: 'text' },
              { key: 'site_name', label: '网站名称', type: 'text' },
              { key: 'site_subtitle', label: '网站副标题', type: 'text' },
              { key: 'site_description', label: '网站描述', type: 'text' },
              { key: 'contact_qq', label: '联系QQ', type: 'text' },
              { key: 'contact_wechat', label: '联系微信', type: 'text' },
              { key: 'contact_email', label: '联系邮箱', type: 'text' },
              { key: 'icp_number', label: 'ICP备案号', type: 'text' },
              { key: 'footer_text', label: '页脚文字', type: 'text' },
              { key: 'payment_tip', label: '支付提示语', type: 'text' },
              { key: 'announcement', label: '网站公告', type: 'textarea' }
            ].map(item => (
              <div key={item.key} style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#595959', marginBottom: '8px', fontWeight: 500 }}>{item.label}</label>
                {item.type === 'textarea' ? (
                  <textarea
                    value={settings[item.key] || ''}
                    onChange={(e) => setSettings({ ...settings, [item.key]: e.target.value })}
                    style={{ width: '100%', height: '80px', padding: '12px', border: '1.5px solid #e8e8e8', borderRadius: '10px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                ) : (
                  <input
                    type="text"
                    value={settings[item.key] || ''}
                    onChange={(e) => setSettings({ ...settings, [item.key]: e.target.value })}
                    style={{ width: '100%', padding: '12px', border: '1.5px solid #e8e8e8', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                )}
              </div>
            ))}
            <button onClick={saveSettings} disabled={loading} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #1677ff, #4096ff)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', marginTop: '8px', boxShadow: '0 4px 12px rgba(22,119,255,0.25)' }}>{loading ? '保存中...' : '保存设置'}</button>
          </div>
        )}
      </div>

      {/* 底部导航 - 浮动胶囊式 */}
      <div style={{ position: 'fixed', bottom: '16px', left: '50%', transform: 'translateX(-50%)', background: '#fff', display: 'flex', borderRadius: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', zIndex: 100, padding: '6px 8px', paddingBottom: 'calc(6px + env(safe-area-inset-bottom))', gap: '4px' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '6px 14px', borderRadius: '20px', transition: 'all 0.2s' }}
          >
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: activeTab === tab.key ? '#e6f4ff' : 'transparent', transition: 'all 0.2s' }}>
              <span style={{ fontSize: '20px', opacity: activeTab === tab.key ? 1 : 0.6 }}>{tab.icon}</span>
            </div>
            <span style={{ fontSize: '10px', color: activeTab === tab.key ? '#1677ff' : '#8c8c8c', fontWeight: activeTab === tab.key ? 600 : 400 }}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 添加/编辑商品弹窗 */}
      {showAddProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 1000 }} onClick={(e) => e.target === e.currentTarget && setShowAddProduct(false)}>
          <div style={{ background: '#fff', width: '100%', borderRadius: '16px 16px 0 0', padding: '24px 20px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{editingProduct ? '编辑商品' : '添加商品'}</h3>
              <button onClick={() => setShowAddProduct(false)} style={{ background: '#f5f7fa', border: 'none', width: '32px', height: '32px', borderRadius: '50%', fontSize: '18px', color: '#8c8c8c', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#595959', marginBottom: '8px', fontWeight: 500 }}>商品名称 *</label>
              <input type="text" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} style={{ width: '100%', padding: '12px', border: '1.5px solid #e8e8e8', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#595959', marginBottom: '8px', fontWeight: 500 }}>商品描述</label>
              <textarea value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} style={{ width: '100%', height: '80px', padding: '12px', border: '1.5px solid #e8e8e8', borderRadius: '10px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#595959', marginBottom: '8px', fontWeight: 500 }}>价格 (元) *</label>
                <input type="number" step="0.01" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} style={{ width: '100%', padding: '12px', border: '1.5px solid #e8e8e8', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#595959', marginBottom: '8px', fontWeight: 500 }}>分类</label>
                <input type="text" value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} style={{ width: '100%', padding: '12px', border: '1.5px solid #e8e8e8', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowAddProduct(false)} style={{ flex: 1, padding: '14px', background: '#f5f7fa', color: '#595959', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>取消</button>
              <button onClick={saveProduct} disabled={loading} style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #1677ff, #4096ff)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>{loading ? '保存中...' : '保存'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '70px', left: '50%', transform: 'translateX(-50%)', padding: '12px 24px', borderRadius: '10px', color: '#fff', fontSize: '14px', zIndex: 2000, background: toast.type === 'error' ? '#ff4d4f' : toast.type === 'warning' ? '#faad14' : '#52c41a', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontWeight: 500 }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
