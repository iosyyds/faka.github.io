'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

export default function UserCenter() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders');
  const [queryOrderNo, setQueryOrderNo] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    checkLogin();
  }, []);

  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 2500); };

  const checkLogin = async () => {
    const token = localStorage.getItem('user_token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/user/info`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        localStorage.setItem('user_info', JSON.stringify(data.user));
        loadOrders(token);
      } else {
        localStorage.removeItem('user_token');
        localStorage.removeItem('user_info');
        router.push('/login');
      }
    } catch (e) {
      setLoading(false);
    }
  };

  const loadOrders = async (token) => {
    try {
      const res = await fetch(`${API_BASE}/user/orders`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setOrders(data.orders);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_info');
    showToast('已退出登录');
    setTimeout(() => router.push('/'), 1000);
  };

  const doQuery = async () => {
    if (!queryOrderNo.trim()) { showToast('请输入订单编号', 'warning'); return; }
    setQueryResult('<div style="text-align:center;padding:20px;">查询中...</div>');
    try {
      const res = await fetch(`${API_BASE}/query-order?orderNo=${encodeURIComponent(queryOrderNo)}`);
      const data = await res.json();
      if (data.success) {
        const o = data.order;
        let h = `<div style="background:#f5f7fa;border-radius:8px;padding:14px;margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;"><span style="color:#8c8c8c;">商品</span><span style="font-weight:500;">${o.product_name}</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;"><span style="color:#8c8c8c;">数量</span><span>${o.quantity}</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;"><span style="color:#8c8c8c;">金额</span><span style="color:#ff4d4f;font-weight:600;">¥${Number(o.amount).toFixed(2)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;"><span style="color:#8c8c8c;">状态</span><span>${o.status === 'paid' ? '已支付' : o.status === 'pending' ? '待支付' : '已失败'}</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;"><span style="color:#8c8c8c;">下单时间</span><span>${new Date(o.created_at).toLocaleString()}</span></div>
        </div>`;
        if (o.status === 'paid' && o.cards && o.cards.length > 0) {
          h += '<div style="font-size:13px;color:#595959;margin-bottom:8px;font-weight:600;">卡密信息：</div>';
          h += o.cards.map((c, i) => `<div style="background:#f5f7fa;border:1px solid #f0f0f0;border-radius:8px;padding:12px;margin-bottom:8px;"><div style="font-size:12px;color:#8c8c8c;margin-bottom:4px;">卡密 ${i + 1}</div><div style="font-size:13px;font-family:monospace;word-break:break-all;user-select:all;">${c.card_content}</div></div>`).join('');
        }
        setQueryResult(h);
      } else setQueryResult(`<div style="text-align:center;padding:20px;color:#ff4d4f;font-size:14px;">${data.message || '查询失败'}</div>`);
    } catch (e) { setQueryResult('<div style="text-align:center;padding:20px;color:#ff4d4f;font-size:14px;">网络错误</div>'); }
  };

  const esc = (t) => { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; };

  const getStatusText = (status) => {
    if (status === 'paid') return { text: '已支付', color: '#52c41a', bg: '#f6ffed' };
    if (status === 'pending') return { text: '待支付', color: '#faad14', bg: '#fffbe6' };
    return { text: '已失败', color: '#ff4d4f', bg: '#fff2f0' };
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f9ff' }}>
        <div className="loading" style={{ width: 40, height: 40 }}></div>
      </div>
    );
  }

  return (
    <>
      <nav className="dc-topbar">
        <div className="dc-topbar-inner">
          <a href="/" className="dc-topbar-logo">
            <div className="dc-topbar-logo-icon">DC</div>
            <div className="dc-topbar-logo-text">
              <div className="dc-topbar-title">DCSHOP多财商城</div>
              <div className="dc-topbar-sub">个人中心</div>
            </div>
          </a>
          <div className="dc-topbar-right">
            <button className="dc-topbar-btn" onClick={handleLogout}>退出登录</button>
          </div>
        </div>
      </nav>

      <div className="dc-container" style={{ paddingBottom: 80 }}>
        {/* 用户信息卡片 */}
        <div className="dc-user-card">
          <div className="dc-user-avatar">{user?.avatar ? <img src={user.avatar} alt="" /> : (user?.nickname || user?.username || 'U').charAt(0).toUpperCase()}</div>
          <div className="dc-user-info">
            <h2 className="dc-user-name">{user?.nickname || user?.username}</h2>
            <p className="dc-user-username">@{user?.username}</p>
          </div>
          <div className="dc-user-balance">
            <span className="dc-user-balance-label">余额</span>
            <span className="dc-user-balance-amount">¥{Number(user?.balance || 0).toFixed(2)}</span>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="dc-user-stats">
          <div className="dc-user-stat">
            <span className="dc-user-stat-num">{orders.length}</span>
            <span className="dc-user-stat-label">全部订单</span>
          </div>
          <div className="dc-user-stat">
            <span className="dc-user-stat-num">{orders.filter(o => o.status === 'paid').length}</span>
            <span className="dc-user-stat-label">已支付</span>
          </div>
          <div className="dc-user-stat">
            <span className="dc-user-stat-num">{orders.filter(o => o.status === 'pending').length}</span>
            <span className="dc-user-stat-label">待支付</span>
          </div>
          <div className="dc-user-stat">
            <span className="dc-user-stat-num">¥{orders.filter(o => o.status === 'paid').reduce((sum, o) => sum + Number(o.amount), 0).toFixed(2)}</span>
            <span className="dc-user-stat-label">累计消费</span>
          </div>
        </div>

        {/* Tab切换 */}
        <div className="dc-user-tabs">
          <button className={`dc-user-tab ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>我的订单</button>
          <button className={`dc-user-tab ${activeTab === 'query' ? 'active' : ''}`} onClick={() => setActiveTab('query')}>订单查询</button>
        </div>

        {/* 订单列表 */}
        {activeTab === 'orders' && (
          <div className="dc-order-list">
            {orders.length === 0 ? (
              <div className="dc-empty" style={{ background: '#fff', borderRadius: 12 }}>
                <div className="dc-empty-icon">📦</div>
                <p>暂无订单</p>
                <button className="dc-btn dc-btn-primary" style={{ marginTop: 16 }} onClick={() => router.push('/')}>去购物</button>
              </div>
            ) : orders.map(order => {
              const status = getStatusText(order.status);
              return (
                <div key={order.id} className="dc-order-item">
                  <div className="dc-order-header">
                    <span className="dc-order-no">订单号：{order.order_no}</span>
                    <span className="dc-order-status" style={{ color: status.color, background: status.bg }}>{status.text}</span>
                  </div>
                  <div className="dc-order-body">
                    <div className="dc-order-product">
                      <span className="dc-order-product-name">{esc(order.product_name)}</span>
                      <span className="dc-order-qty">x{order.quantity}</span>
                    </div>
                    <div className="dc-order-amount">¥{Number(order.amount).toFixed(2)}</div>
                  </div>
                  <div className="dc-order-footer">
                    <span className="dc-order-time">{new Date(order.created_at).toLocaleString()}</span>
                    {order.status === 'paid' && (
                      <button className="dc-order-detail-btn" onClick={() => { setQueryOrderNo(order.order_no); setActiveTab('query'); setTimeout(doQuery, 100); }}>查看卡密</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 订单查询 */}
        {activeTab === 'query' && (
          <div className="dc-query-box">
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <input
                type="text"
                placeholder="请输入订单编号"
                value={queryOrderNo}
                onChange={(e) => setQueryOrderNo(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && doQuery()}
                style={{ flex: 1, padding: '12px 14px', border: '1.5px solid #e8e8e8', borderRadius: 10, fontSize: 14, outline: 'none' }}
              />
              <button className="dc-btn dc-btn-primary" style={{ padding: '12px 24px' }} onClick={doQuery}>查询</button>
            </div>
            {queryResult && <div dangerouslySetInnerHTML={{ __html: queryResult }} />}
          </div>
        )}
      </div>

      {/* 底部导航栏 */}
      <nav className="dc-bottom-nav">
        <a href="/" className="dc-bottom-nav-item">
          <span className="dc-bottom-nav-icon">🏠</span>
          <span className="dc-bottom-nav-text">首页</span>
        </a>
        <a href="/#category" className="dc-bottom-nav-item">
          <span className="dc-bottom-nav-icon">📋</span>
          <span className="dc-bottom-nav-text">分类</span>
        </a>
        <a href="/user" className="dc-bottom-nav-item active">
          <span className="dc-bottom-nav-icon">📄</span>
          <span className="dc-bottom-nav-text">查单</span>
        </a>
        <a href="/user" className="dc-bottom-nav-item active">
          <span className="dc-bottom-nav-icon">👤</span>
          <span className="dc-bottom-nav-text">我的</span>
        </a>
      </nav>

      {toast && <div className={`dc-toast ${toast.type}`}>{toast.message}</div>}
    </>
  );
}
