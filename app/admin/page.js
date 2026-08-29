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
  const [cards, setCards] = useState([]);
  const [showCardManage, setShowCardManage] = useState(false);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth > 768);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

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

  const loadCards = async (productId) => {
    if (!productId) return;
    const data = await apiCall(`/admin-card-manage?productId=${productId}`);
    if (data.success) {
      setCards(data.cards);
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

  const tabs = [
    { key: 'dashboard', label: '概览', icon: '📊' },
    { key: 'products', label: '商品', icon: '📦' },
    { key: 'cards', label: '卡密', icon: '🎫' },
    { key: 'orders', label: '订单', icon: '📋' },
    { key: 'settings', label: '设置', icon: '⚙️' }
  ];

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

  // PC端表格样式组件
  const TableWrapper = ({ children }) => (
    <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        {children}
      </table>
    </div>
  );

  const Th = ({ children, style, ...props }) => (
    <th style={{ padding: '14px 12px', textAlign: 'left', fontSize: '13px', color: '#8c8c8c', fontWeight: 500, background: '#fafafa', borderBottom: "1px solid #f0f0f0", ...style }} {...props}>{children}</th>
  );

  const Td = ({ children, style, ...props }) => (
    <td style={{ padding: '14px 12px', fontSize: '14px', color: '#1f1f1f', borderBottom: "1px solid #f5f5f5", ...style }} {...props}>{children}</td>
  );

  return (
    <div className="admin-page" style={{ minHeight: '100vh', background: '#f5f7fa', paddingBottom: isDesktop ? '0' : '100px' }}>
      {/* PC端左侧边栏 */}
      {isDesktop && (
        <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: '220px', background: '#fff', boxShadow: '2px 0 8px rgba(0,0,0,0.06)', zIndex: 200, padding: '20px 12px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#1677ff', padding: '12px 16px', marginBottom: '16px', borderRadius: '10px', background: '#f0f7ff' }}>🎫 发卡管理</div>
          {tabs.map(tab => (
            <div
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', color: activeTab === tab.key ? '#1677ff' : '#595959', background: activeTab === tab.key ? '#e6f4ff' : 'transparent', fontWeight: activeTab === tab.key ? 600 : 400, marginBottom: '4px', transition: 'all 0.2s' }}
            >
              <span style={{ fontSize: '18px' }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </div>
          ))}
          <div onClick={handleLogout} style={{ marginTop: 'auto', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', color: '#ff4d4f', textAlign: 'center', background: '#fff2f0', fontWeight: 500 }}>退出登录</div>
        </div>
      )}

      {/* 移动端顶部导航 */}
      {!isDesktop && (
        <div style={{ background: '#fff', padding: '0 16px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ fontSize: '17px', fontWeight: 700, color: '#1677ff' }}>{tabs.find(t => t.key === activeTab)?.label}</div>
          <button onClick={handleLogout} style={{ background: '#fff2f0', border: 'none', color: '#ff4d4f', cursor: 'pointer', fontSize: '13px', padding: '6px 12px', borderRadius: '8px', fontWeight: 500 }}>退出</button>
        </div>
      )}

      <div style={{ padding: isDesktop ? '24px' : '16px', marginLeft: isDesktop ? '220px' : '0', maxWidth: isDesktop ? 'none' : 'none' }}>
        {/* 概览页 */}
        {activeTab === 'dashboard' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(5, 1fr)' : '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              {[
                { label: '商品总数', value: stats.totalProducts, icon: '📦', bg: '#e6f4ff', color: '#1677ff' },
                { label: '卡密总数', value: stats.totalCards, icon: '🎫', bg: '#f6ffed', color: '#52c41a' },
                { label: '订单总数', value: stats.totalOrders, icon: '📋', bg: '#fffbe6', color: '#faad14' },
                { label: '已支付', value: stats.paidOrders, icon: '✅', bg: '#f9f0ff', color: '#722ed1' },
                { label: '总收入', value: `¥${stats.totalRevenue}`, icon: '💰', bg: '#fff2f0', color: '#ff4d4f' }
              ].map((stat, i) => (
                <div key={i} style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '44px', height: '44px', background: stat.bg, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>{stat.icon}</div>
                    <div>
                      <div style={{ fontSize: isDesktop ? '24px' : '22px', fontWeight: 700, color: stat.color, lineHeight: 1.2 }}>{stat.value}</div>
                      <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '2px' }}>{stat.label}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {isDesktop ? (
              <TableWrapper>
                <thead>
                  <tr>
                    <Th>商品</Th>
                    <Th>订单号</Th>
                    <Th>金额</Th>
                    <Th>状态</Th>
                    <Th>时间</Th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 10).map(o => (
                    <tr key={o.id}>
                      <Td style={{ fontWeight: 500 }}>{o.product_name}</Td>
                      <Td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#8c8c8c' }}>{o.order_no}</Td>
                      <Td style={{ color: '#ff4d4f', fontWeight: 600 }}>¥{Number(o.amount).toFixed(2)}</Td>
                      <Td><span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '12px', background: statusMap[o.status]?.bg, color: statusMap[o.status]?.color, fontWeight: 500 }}>{statusMap[o.status]?.text}</span></Td>
                      <Td style={{ color: '#8c8c8c', fontSize: '13px' }}>{new Date(o.created_at).toLocaleString('zh-CN')}</Td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr><Td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#8c8c8c' }}>暂无订单</Td></tr>
                  )}
                </tbody>
              </TableWrapper>
            ) : (
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
            )}
          </div>
        )}

        {/* 商品管理 */}
        {activeTab === 'products' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>商品管理</h3>
              <button onClick={openAddProduct} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #1677ff, #4096ff)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(22,119,255,0.25)' }}>+ 添加商品</button>
            </div>

            {isDesktop ? (
              <TableWrapper>
                <thead>
                  <tr>
                    <Th style={{ width: '80px' }}>ID</Th>
                    <Th>商品名称</Th>
                    <Th style={{ width: '100px' }}>分类</Th>
                    <Th style={{ width: '100px' }}>价格</Th>
                    <Th style={{ width: '80px' }}>库存</Th>
                    <Th style={{ width: '90px' }}>状态</Th>
                    <Th style={{ width: '200px' }}>操作</Th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <Td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#8c8c8c' }}>{p.id}</Td>
                      <Td style={{ fontWeight: 500 }}>{p.name}</Td>
                      <Td>{p.category || '全部'}</Td>
                      <Td style={{ color: '#ff4d4f', fontWeight: 600 }}>¥{Number(p.price).toFixed(2)}</Td>
                      <Td>{p.stock}</Td>
                      <Td><span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '12px', background: p.is_active ? '#f6ffed' : '#fff2f0', color: p.is_active ? '#52c41a' : '#ff4d4f', fontWeight: 500 }}>{p.is_active ? '上架中' : '已下架'}</span></Td>
                      <Td>
                        <button onClick={() => openEditProduct(p)} style={{ color: '#1677ff', background: 'none', border: 'none', cursor: 'pointer', marginRight: '12px', fontSize: '13px' }}>编辑</button>
                        <button onClick={() => toggleProductActive(p)} style={{ color: '#faad14', background: 'none', border: 'none', cursor: 'pointer', marginRight: '12px', fontSize: '13px' }}>{p.is_active ? '下架' : '上架'}</button>
                        <button onClick={() => deleteProduct(p.id)} style={{ color: '#ff4d4f', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>删除</button>
                      </Td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr><Td colSpan={7} style={{ textAlign: 'center', padding: '50px', color: '#8c8c8c' }}>暂无商品，点击右上角添加</Td></tr>
                  )}
                </tbody>
              </TableWrapper>
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
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700 }}>卡密管理</h3>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 2fr' : '1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#595959', marginBottom: '8px', fontWeight: 500 }}>选择商品</label>
                  <select
                    value={cardProductId}
                    onChange={(e) => setCardProductId(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e8e8e8', borderRadius: '8px', fontSize: '14px', background: '#fff' }}
                  >
                    <option value="">请选择商品</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}（库存{p.stock}）</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#595959', marginBottom: '8px', fontWeight: 500 }}>卡密内容（每行一个）</label>
                  <textarea
                    value={cardRawText}
                    onChange={(e) => setCardRawText(e.target.value)}
                    placeholder="粘贴卡密，每行一个"
                    style={{ width: '100%', height: '100px', padding: '10px 12px', border: '1.5px solid #e8e8e8', borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button onClick={importCards} disabled={loading} style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #1677ff, #4096ff)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>{loading ? '导入中...' : '导入卡密'}</button>
                {cardProductId && <button onClick={() => clearAvailableCards(cardProductId)} style={{ padding: '10px 20px', background: '#fff2f0', color: '#ff4d4f', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>清空未使用</button>}
                {cardProductId && <button onClick={() => loadCards(cardProductId)} style={{ padding: '10px 20px', background: '#f6ffed', color: '#52c41a', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>查看列表</button>}
              </div>
            </div>

            {showCardManage && cards.length > 0 && (
              isDesktop ? (
                <TableWrapper>
                  <thead>
                    <tr>
                      <Th style={{ width: '80px' }}>ID</Th>
                      <Th>卡密内容</Th>
                      <Th style={{ width: '100px' }}>状态</Th>
                      <Th style={{ width: '80px' }}>操作</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {cards.map(c => (
                      <tr key={c.id}>
                        <Td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#8c8c8c' }}>{c.id}</Td>
                        <Td style={{ fontFamily: 'monospace', fontSize: '13px', wordBreak: 'break-all' }}>{c.card_content}</Td>
                        <Td><span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '12px', background: c.status === 'available' ? '#f6ffed' : '#fff2f0', color: c.status === 'available' ? '#52c41a' : '#ff4d4f', fontWeight: 500 }}>{c.status === 'available' ? '未使用' : '已使用'}</span></Td>
                        <Td><button onClick={async () => { const data = await apiCall('/admin-card-manage', { method: 'POST', body: JSON.stringify({ action: 'delete', cardId: c.id }) }); if (data.success) { showToast('已删除'); loadCards(cardProductId); } }} style={{ color: '#ff4d4f', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>删除</button></Td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrapper>
              ) : (
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
              )
            )}
          </div>
        )}

        {/* 订单管理 */}
        {activeTab === 'orders' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>订单管理</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { key: 'all', label: '全部' },
                  { key: 'pending', label: '待支付' },
                  { key: 'paid', label: '已支付' },
                  { key: 'failed', label: '已失败' }
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setOrderStatusFilter(f.key)}
                    style={{ padding: '8px 16px', background: orderStatusFilter === f.key ? '#1677ff' : '#fff', color: orderStatusFilter === f.key ? '#fff' : '#595959', border: '1px solid ' + (orderStatusFilter === f.key ? '#1677ff' : '#e8e8e8'), borderRadius: '20px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                  >{f.label}</button>
                ))}
              </div>
            </div>

            {isDesktop ? (
              <TableWrapper>
                <thead>
                  <tr>
                    <Th>订单号</Th>
                    <Th>商品</Th>
                    <Th style={{ width: '100px' }}>金额</Th>
                    <Th style={{ width: '90px' }}>状态</Th>
                    <Th style={{ width: '160px' }}>时间</Th>
                    <Th style={{ width: '200px' }}>操作</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(o => (
                    <tr key={o.id}>
                      <Td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#8c8c8c' }}>{o.order_no}</Td>
                      <Td style={{ fontWeight: 500 }}>{o.product_name}</Td>
                      <Td style={{ color: '#ff4d4f', fontWeight: 600 }}>¥{Number(o.amount).toFixed(2)}</Td>
                      <Td><span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '12px', background: statusMap[o.status]?.bg, color: statusMap[o.status]?.color, fontWeight: 500 }}>{statusMap[o.status]?.text}</span></Td>
                      <Td style={{ color: '#8c8c8c', fontSize: '13px' }}>{new Date(o.created_at).toLocaleString('zh-CN')}</Td>
                      <Td>
                        {o.status === 'pending' && (
                          <>
                            <button onClick={() => markOrderPaid(o.id)} style={{ color: '#52c41a', background: 'none', border: 'none', cursor: 'pointer', marginRight: '12px', fontSize: '13px' }}>标记支付</button>
                            <button onClick={() => markOrderFailed(o.id)} style={{ color: '#faad14', background: 'none', border: 'none', cursor: 'pointer', marginRight: '12px', fontSize: '13px' }}>标记失败</button>
                          </>
                        )}
                        <button onClick={() => deleteOrder(o.id)} style={{ color: '#ff4d4f', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>删除</button>
                      </Td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                    <tr><Td colSpan={6} style={{ textAlign: 'center', padding: '50px', color: '#8c8c8c' }}>暂无订单</Td></tr>
                  )}
                </tbody>
              </TableWrapper>
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
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700 }}>网站设置</h3>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: '20px' }}>
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
                  { key: 'announcement', label: '网站公告', type: 'textarea', full: true }
                ].map(item => (
                  <div key={item.key} style={{ gridColumn: item.full && isDesktop ? '1 / -1' : 'auto' }}>
                    <label style={{ display: 'block', fontSize: '13px', color: '#595959', marginBottom: '8px', fontWeight: 500 }}>{item.label}</label>
                    {item.type === 'textarea' ? (
                      <textarea
                        value={settings[item.key] || ''}
                        onChange={(e) => setSettings({ ...settings, [item.key]: e.target.value })}
                        style={{ width: '100%', height: '100px', padding: '10px 12px', border: '1.5px solid #e8e8e8', borderRadius: '8px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
                      />
                    ) : (
                      <input
                        type="text"
                        value={settings[item.key] || ''}
                        onChange={(e) => setSettings({ ...settings, [item.key]: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e8e8e8', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '24px', textAlign: isDesktop ? 'right' : 'center' }}>
                <button onClick={saveSettings} disabled={loading} style={{ padding: '12px 32px', background: 'linear-gradient(135deg, #1677ff, #4096ff)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(22,119,255,0.25)' }}>{loading ? '保存中...' : '保存设置'}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 移动端底部导航 */}
      {!isDesktop && (
        <div style={{ position: 'fixed', bottom: '16px', left: '50%', transform: 'translateX(-50%)', background: '#fff', display: 'flex', borderRadius: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', zIndex: 100, padding: '6px 8px', paddingBottom: 'calc(6px + env(safe-area-inset-bottom))', gap: '4px' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '6px 14px', borderRadius: '20px' }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: activeTab === tab.key ? '#e6f4ff' : 'transparent' }}>
                <span style={{ fontSize: '20px', opacity: activeTab === tab.key ? 1 : 0.6 }}>{tab.icon}</span>
              </div>
              <span style={{ fontSize: '10px', color: activeTab === tab.key ? '#1677ff' : '#8c8c8c', fontWeight: activeTab === tab.key ? 600 : 400 }}>{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* 添加/编辑商品弹窗 */}
      {showAddProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: isDesktop ? 'center' : 'flex-end', justifyContent: 'center', zIndex: 1000 }} onClick={(e) => e.target === e.currentTarget && setShowAddProduct(false)}>
          <div style={{ background: '#fff', width: isDesktop ? '480px' : '100%', borderRadius: isDesktop ? '16px' : '16px 16px 0 0', padding: '24px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{editingProduct ? '编辑商品' : '添加商品'}</h3>
              <button onClick={() => setShowAddProduct(false)} style={{ background: '#f5f7fa', border: 'none', width: '32px', height: '32px', borderRadius: '50%', fontSize: '18px', color: '#8c8c8c', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#595959', marginBottom: '8px', fontWeight: 500 }}>商品名称 *</label>
              <input type="text" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e8e8e8', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#595959', marginBottom: '8px', fontWeight: 500 }}>商品描述</label>
              <textarea value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} style={{ width: '100%', height: '80px', padding: '10px 12px', border: '1.5px solid #e8e8e8', borderRadius: '8px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#595959', marginBottom: '8px', fontWeight: 500 }}>价格 (元) *</label>
                <input type="number" step="0.01" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e8e8e8', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#595959', marginBottom: '8px', fontWeight: 500 }}>分类</label>
                <input type="text" value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e8e8e8', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowAddProduct(false)} style={{ flex: 1, padding: '12px', background: '#f5f7fa', color: '#595959', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>取消</button>
              <button onClick={saveProduct} disabled={loading} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #1677ff, #4096ff)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>{loading ? '保存中...' : '保存'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: isDesktop ? '24px' : '70px', left: '50%', transform: 'translateX(-50%)', padding: '12px 24px', borderRadius: '10px', color: '#fff', fontSize: '14px', zIndex: 2000, background: toast.type === 'error' ? '#ff4d4f' : toast.type === 'warning' ? '#faad14' : '#52c41a', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontWeight: 500 }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
