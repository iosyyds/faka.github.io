'use client';

import { useState, useEffect } from 'react';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

export default function AdminPage() {
  const [token, setToken] = useState(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('products');
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
    if (!loginPassword) {
      setLoginError('请输入密码');
      return;
    }
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

      // 计算统计
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
        const data = await apiCall(`/admin-products?id=${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(productForm)
        });
        if (data.success) { showToast('商品已更新'); setShowAddProduct(false); loadDashboard(); }
        else showToast(data.message || '更新失败', 'error');
      } else {
        const data = await apiCall('/admin-products', {
          method: 'POST',
          body: JSON.stringify(productForm)
        });
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
    const data = await apiCall(`/admin-products?id=${product.id}`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: !product.is_active })
    });
    if (data.success) { showToast(product.is_active ? '已下架' : '已上架'); loadDashboard(); }
  };

  // 卡密管理
  const loadCards = async (productId) => {
    if (!productId) return;
    const data = await apiCall(`/admin-card-manage?productId=${productId}`);
    if (data.success) {
      setCards(data.cards);
      setCardStats(data.stats);
    }
  };

  const importCards = async () => {
    if (!cardProductId) { showToast('请选择商品', 'error'); return; }
    if (!cardRawText.trim()) { showToast('请输入卡密内容', 'error'); return; }
    setLoading(true);
    try {
      const data = await apiCall('/admin-cards', {
        method: 'POST',
        body: JSON.stringify({ productId: cardProductId, rawText: cardRawText, cardType: 'default' })
      });
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
    const data = await apiCall('/admin-card-manage', {
      method: 'POST',
      body: JSON.stringify({ action: 'clear_available', productId })
    });
    if (data.success) { showToast(data.message); loadCards(productId); loadDashboard(); }
    else showToast(data.message || '操作失败', 'error');
  };

  // 订单管理
  const filteredOrders = orders.filter(o => orderStatusFilter === 'all' || o.status === orderStatusFilter);

  const markOrderPaid = async (orderId) => {
    if (!confirm('确定手动标记该订单为已支付？将自动发卡。')) return;
    const data = await apiCall('/admin-order-manage', {
      method: 'POST',
      body: JSON.stringify({ action: 'mark_paid', orderId })
    });
    if (data.success) { showToast('已标记为已支付'); loadDashboard(); }
    else showToast(data.message || '操作失败', 'error');
  };

  const markOrderFailed = async (orderId) => {
    const data = await apiCall('/admin-order-manage', {
      method: 'POST',
      body: JSON.stringify({ action: 'mark_failed', orderId })
    });
    if (data.success) { showToast('已标记为失败'); loadDashboard(); }
  };

  const deleteOrder = async (orderId) => {
    if (!confirm('确定删除该订单？')) return;
    const data = await apiCall('/admin-order-manage', {
      method: 'POST',
      body: JSON.stringify({ action: 'delete', orderId })
    });
    if (data.success) { showToast('订单已删除'); loadDashboard(); }
  };

  // 网站设置
  const saveSettings = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/settings', {
        method: 'POST',
        body: JSON.stringify(settings)
      });
      if (data.success) showToast('设置已保存');
      else showToast(data.message || '保存失败', 'error');
    } catch (err) { showToast('网络错误', 'error'); }
    finally { setLoading(false); }
  };

  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // 登录页面
  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
        <div style={{ background: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', width: '360px' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '24px', color: '#1677ff' }}>管理后台登录</h2>
          <input
            type="password"
            placeholder="请输入管理密码"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            style={{ width: '100%', padding: '12px', border: '1px solid #d9d9d9', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}
          />
          {loginError && <div style={{ color: '#ff4d4f', marginBottom: '12px', fontSize: '13px' }}>{loginError}</div>}
          <button
            onClick={handleLogin}
            style={{ width: '100%', padding: '12px', background: '#1677ff', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer' }}
          >登录</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      {/* 顶部导航 */}
      <div style={{ background: '#fff', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: '18px', fontWeight: 600, color: '#1677ff' }}>发卡商城管理后台</div>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#8c8c8c', cursor: 'pointer', fontSize: '14px' }}>退出登录</button>
      </div>

      <div style={{ display: 'flex', maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
        {/* 侧边栏 */}
        <div style={{ width: '200px', background: '#fff', borderRadius: '10px', padding: '12px', marginRight: '20px', height: 'fit-content' }}>
          {[
            { key: 'products', label: '📦 商品管理' },
            { key: 'cards', label: '🎫 卡密管理' },
            { key: 'orders', label: '📋 订单管理' },
            { key: 'settings', label: '⚙️ 网站设置' }
          ].map(tab => (
            <div
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                marginBottom: '4px',
                background: activeTab === tab.key ? '#e6f4ff' : 'transparent',
                color: activeTab === tab.key ? '#1677ff' : '#595959',
                fontWeight: activeTab === tab.key ? 500 : 400,
                fontSize: '14px'
              }}
            >{tab.label}</div>
          ))}
        </div>

        {/* 主内容 */}
        <div style={{ flex: 1 }}>
          {/* 统计卡片 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '20px' }}>
            {[
              { label: '商品总数', value: stats.totalProducts, color: '#1677ff' },
              { label: '卡密总数', value: stats.totalCards, color: '#52c41a' },
              { label: '订单总数', value: stats.totalOrders, color: '#faad14' },
              { label: '已支付', value: stats.paidOrders, color: '#722ed1' },
              { label: '总收入', value: `¥${stats.totalRevenue}`, color: '#ff4d4f' }
            ].map((stat, i) => (
              <div key={i} style={{ background: '#fff', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: '13px', color: '#8c8c8c', marginTop: '4px' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* 商品管理 */}
          {activeTab === 'products' && (
            <div style={{ background: '#fff', borderRadius: '10px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>商品管理</h3>
                <button onClick={openAddProduct} style={{ padding: '8px 16px', background: '#1677ff', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>+ 添加商品</button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', color: '#8c8c8c' }}>ID</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', color: '#8c8c8c' }}>商品名称</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', color: '#8c8c8c' }}>分类</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', color: '#8c8c8c' }}>价格</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', color: '#8c8c8c' }}>库存</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', color: '#8c8c8c' }}>状态</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', color: '#8c8c8c' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #fafafa' }}>
                      <td style={{ padding: '12px 8px', fontSize: '13px' }}>{p.id}</td>
                      <td style={{ padding: '12px 8px', fontSize: '13px', fontWeight: 500 }}>{escapeHtml(p.name)}</td>
                      <td style={{ padding: '12px 8px', fontSize: '13px' }}>{p.category || '全部'}</td>
                      <td style={{ padding: '12px 8px', fontSize: '13px', color: '#ff4d4f' }}>¥{Number(p.price).toFixed(2)}</td>
                      <td style={{ padding: '12px 8px', fontSize: '13px' }}>{p.stock}</td>
                      <td style={{ padding: '12px 8px', fontSize: '13px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', background: p.is_active ? '#f6ffed', color: '#52c41a' : '#fff2f0', color: '#ff4d4f' }}>
                          {p.is_active ? '上架中' : '已下架'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '13px' }}>
                        <button onClick={() => openEditProduct(p)} style={{ color: '#1677ff', background: 'none', border: 'none', cursor: 'pointer', marginRight: '8px' }}>编辑</button>
                        <button onClick={() => toggleProductActive(p)} style={{ color: '#faad14', background: 'none', border: 'none', cursor: 'pointer', marginRight: '8px' }}>{p.is_active ? '下架' : '上架'}</button>
                        <button onClick={() => deleteProduct(p.id)} style={{ color: '#ff4d4f', background: 'none', border: 'none', cursor: 'pointer' }}>删除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 卡密管理 */}
          {activeTab === 'cards' && (
            <div style={{ background: '#fff', borderRadius: '10px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>卡密管理</h3>
              <div style={{ marginBottom: '16px' }}>
                <select
                  value={cardProductId}
                  onChange={(e) => { setCardProductId(e.target.value); loadCards(e.target.value); }}
                  style={{ padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '6px', marginRight: '12px' }}
                >
                  <option value="">选择商品</option>
                  {products.map(p => <option key={p.id} value={p.id}>{escapeHtml(p.name)}</option>)}
                </select>
                {cardStats && (
                  <span style={{ fontSize: '13px', color: '#8c8c8c' }}>
                    总卡密: {cardStats.total} | 未使用: {cardStats.available} | 已使用: {cardStats.used}
                  </span>
                )}
              </div>
              <div style={{ marginBottom: '16px' }}>
                <textarea
                  value={cardRawText}
                  onChange={(e) => setCardRawText(e.target.value)}
                  placeholder="每行一个卡密，粘贴后点击导入"
                  style={{ width: '100%', height: '120px', padding: '12px', border: '1px solid #d9d9d9', borderRadius: '6px', fontFamily: 'monospace', fontSize: '13px', resize: 'vertical' }}
                />
                <div style={{ marginTop: '8px', display: 'flex', gap: '10px' }}>
                  <button onClick={importCards} disabled={loading} style={{ padding: '8px 20px', background: '#1677ff', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>{loading ? '导入中...' : '导入卡密'}</button>
                  {cardProductId && <button onClick={() => clearAvailableCards(cardProductId)} style={{ padding: '8px 20px', background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>清空未使用卡密</button>}
                </div>
              </div>
              {cards.length > 0 && (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: '13px', color: '#8c8c8c' }}>ID</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: '13px', color: '#8c8c8c' }}>卡密内容</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: '13px', color: '#8c8c8c' }}>状态</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: '13px', color: '#8c8c8c' }}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cards.map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #fafafa' }}>
                          <td style={{ padding: '10px 8px', fontSize: '13px' }}>{c.id}</td>
                          <td style={{ padding: '10px 8px', fontSize: '13px', fontFamily: 'monospace', wordBreak: 'break-all' }}>{escapeHtml(c.card_content)}</td>
                          <td style={{ padding: '10px 8px', fontSize: '13px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', background: c.status === 'available' ? '#f6ffed', color: '#52c41a' : '#fff2f0', color: '#ff4d4f' }}>
                              {c.status === 'available' ? '未使用' : '已使用'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 8px', fontSize: '13px' }}>
                            <button
                              onClick={async () => {
                                const data = await apiCall('/admin-card-manage', { method: 'POST', body: JSON.stringify({ action: 'delete', cardId: c.id }) });
                                if (data.success) { showToast('已删除'); loadCards(cardProductId); }
                              }}
                              style={{ color: '#ff4d4f', background: 'none', border: 'none', cursor: 'pointer' }}
                            >删除</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 订单管理 */}
          {activeTab === 'orders' && (
            <div style={{ background: '#fff', borderRadius: '10px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>订单管理</h3>
                <select value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)} style={{ padding: '6px 12px', border: '1px solid #d9d9d9', borderRadius: '6px' }}>
                  <option value="all">全部状态</option>
                  <option value="pending">待支付</option>
                  <option value="paid">已支付</option>
                  <option value="failed">已失败</option>
                </select>
              </div>
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: '13px', color: '#8c8c8c' }}>订单号</th>
                      <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: '13px', color: '#8c8c8c' }}>商品</th>
                      <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: '13px', color: '#8c8c8c' }}>金额</th>
                      <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: '13px', color: '#8c8c8c' }}>状态</th>
                      <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: '13px', color: '#8c8c8c' }}>时间</th>
                      <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: '13px', color: '#8c8c8c' }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(o => (
                      <tr key={o.id} style={{ borderBottom: '1px solid #fafafa' }}>
                        <td style={{ padding: '10px 8px', fontSize: '12px', fontFamily: 'monospace' }}>{o.order_no}</td>
                        <td style={{ padding: '10px 8px', fontSize: '13px' }}>{escapeHtml(o.product_name)}</td>
                        <td style={{ padding: '10px 8px', fontSize: '13px', color: '#ff4d4f' }}>¥{Number(o.amount).toFixed(2)}</td>
                        <td style={{ padding: '10px 8px', fontSize: '13px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', background: o.status === 'paid' ? '#f6ffed', color: '#52c41a' : o.status === 'pending' ? '#fffbe6', color: '#faad14' : '#fff2f0', color: '#ff4d4f' }}>
                            {o.status === 'paid' ? '已支付' : o.status === 'pending' ? '待支付' : '已失败'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 8px', fontSize: '12px', color: '#8c8c8c' }}>{new Date(o.created_at).toLocaleString('zh-CN')}</td>
                        <td style={{ padding: '10px 8px', fontSize: '13px' }}>
                          {o.status === 'pending' && (
                            <>
                              <button onClick={() => markOrderPaid(o.id)} style={{ color: '#52c41a', background: 'none', border: 'none', cursor: 'pointer', marginRight: '8px' }}>标记支付</button>
                              <button onClick={() => markOrderFailed(o.id)} style={{ color: '#faad14', background: 'none', border: 'none', cursor: 'pointer', marginRight: '8px' }}>标记失败</button>
                            </>
                          )}
                          <button onClick={() => deleteOrder(o.id)} style={{ color: '#ff4d4f', background: 'none', border: 'none', cursor: 'pointer' }}>删除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 网站设置 */}
          {activeTab === 'settings' && (
            <div style={{ background: '#fff', borderRadius: '10px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>网站设置</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[
                  { key: 'site_name', label: '网站名称' },
                  { key: 'site_subtitle', label: '网站副标题' },
                  { key: 'site_description', label: '网站描述' },
                  { key: 'contact_qq', label: '联系QQ' },
                  { key: 'contact_wechat', label: '联系微信' },
                  { key: 'contact_email', label: '联系邮箱' },
                  { key: 'icp_number', label: 'ICP备案号' },
                  { key: 'footer_text', label: '页脚文字' }
                ].map(item => (
                  <div key={item.key}>
                    <label style={{ display: 'block', fontSize: '13px', color: '#595959', marginBottom: '6px' }}>{item.label}</label>
                    <input
                      type="text"
                      value={settings[item.key] || ''}
                      onChange={(e) => setSettings({ ...settings, [item.key]: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #d9d9d9', borderRadius: '6px', fontSize: '14px' }}
                    />
                  </div>
                ))}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#595959', marginBottom: '6px' }}>网站公告</label>
                  <textarea
                    value={settings.announcement || ''}
                    onChange={(e) => setSettings({ ...settings, announcement: e.target.value })}
                    style={{ width: '100%', height: '80px', padding: '10px 12px', border: '1px solid #d9d9d9', borderRadius: '6px', fontSize: '14px', resize: 'vertical' }}
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#595959', marginBottom: '6px' }}>支付提示语</label>
                  <input
                    type="text"
                    value={settings.payment_tip || ''}
                    onChange={(e) => setSettings({ ...settings, payment_tip: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d9d9d9', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>
              </div>
              <div style={{ marginTop: '20px' }}>
                <button onClick={saveSettings} disabled={loading} style={{ padding: '10px 30px', background: '#1677ff', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>{loading ? '保存中...' : '保存设置'}</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 添加/编辑商品弹窗 */}
      {showAddProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={(e) => e.target === e.currentTarget && setShowAddProduct(false)}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '480px' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '16px' }}>{editingProduct ? '编辑商品' : '添加商品'}</h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#595959', marginBottom: '6px' }}>商品名称 *</label>
              <input type="text" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d9d9d9', borderRadius: '6px' }} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#595959', marginBottom: '6px' }}>商品描述</label>
              <textarea value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} style={{ width: '100%', height: '80px', padding: '10px 12px', border: '1px solid #d9d9d9', borderRadius: '6px', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#595959', marginBottom: '6px' }}>价格 (元) *</label>
                <input type="number" step="0.01" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d9d9d9', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#595959', marginBottom: '6px' }}>分类</label>
                <input type="text" value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d9d9d9', borderRadius: '6px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddProduct(false)} style={{ padding: '10px 20px', background: '#f5f5f5', color: '#595959', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>取消</button>
              <button onClick={saveProduct} disabled={loading} style={{ padding: '10px 20px', background: '#1677ff', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>{loading ? '保存中...' : '保存'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', padding: '12px 24px', borderRadius: '8px', color: '#fff', fontSize: '14px', zIndex: 2000, background: toast.type === 'error' ? '#ff4d4f' : toast.type === 'warning' ? '#faad14' : '#52c41a' }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
