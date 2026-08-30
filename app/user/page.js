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
  const [queryOrder, setQueryOrder] = useState('');
  const [queryContact, setQueryContact] = useState('');
  const [queryResult, setQueryResult] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('user_token');
    if (!token) {
      router.push('/login');
      return;
    }
    loadUser(token);
    loadOrders(token);
  }, []);

  const loadUser = async (token) => {
    try {
      const res = await fetch(`${API_BASE}/user/info`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      } else {
        localStorage.removeItem('user_token');
        router.push('/login');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadOrders = async (token) => {
    try {
      const res = await fetch(`${API_BASE}/user/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setOrders(data.orders || data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleQuery = async () => {
    if (!queryOrder && !queryContact) {
      alert('请输入订单号或联系方式');
      return;
    }
    try {
      const params = new URLSearchParams();
      if (queryOrder) params.append('order_no', queryOrder);
      if (queryContact) params.append('contact', queryContact);
      const res = await fetch(`${API_BASE}/query-order?${params}`);
      const data = await res.json();
      setQueryResult(data.order || data.data || null);
      if (!data.order && !data.data) alert('未找到订单');
    } catch (e) {
      alert('查询失败');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_info');
    router.push('/');
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: { text: '待支付', class: 'badge-warning' },
      paid: { text: '已支付', class: 'badge-success' },
      completed: { text: '已完成', class: 'badge-success' },
      failed: { text: '已失败', class: 'badge-danger' },
      cancelled: { text: '已取消', class: 'badge-secondary' }
    };
    const s = map[status] || { text: status, class: 'badge-secondary' };
    return <span className={`badge ${s.class}`}>{s.text}</span>;
  };

  if (loading) {
    return (
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh'}}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {/* 导航栏 */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo" onClick={() => router.push('/')} style={{cursor:'pointer'}}>
            <div className="nav-logo-icon">N</div>
            <span>甜甜发卡</span>
          </div>
          <div className="nav-right">
            <button className="btn btn-secondary btn-sm" onClick={() => router.push('/')}>← 返回首页</button>
            <button className="btn btn-danger btn-sm" onClick={handleLogout}>退出登录</button>
          </div>
        </div>
      </nav>

      <div className="container">
        {/* 用户信息卡片 */}
        <div className="card" style={{
          marginBottom: '24px',
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          border: 'none',
          color: '#fff'
        }}>
          <div style={{padding: '24px', display: 'flex', alignItems: 'center', gap: '20px'}}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px'
            }}>
              👤
            </div>
            <div style={{flex: 1}}>
              <h2 style={{fontSize: '20px', fontWeight: 700, marginBottom: '4px'}}>{user?.username}</h2>
              <p style={{fontSize: '13px', opacity: 0.8}}>{user?.email || '未绑定邮箱'}</p>
            </div>
            <div style={{textAlign: 'right'}}>
              <div style={{fontSize: '13px', opacity: 0.8, marginBottom: '4px'}}>账户余额</div>
              <div style={{fontSize: '24px', fontWeight: 700}}>¥{user?.balance || 0}</div>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-icon" style={{background: '#ede9fe', color: '#7c3aed'}}>📦</div>
            <div className="stat-card-label">总订单数</div>
            <div className="stat-card-value">{orders.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon" style={{background: '#d1fae5', color: '#059669'}}>✅</div>
            <div className="stat-card-label">已完成</div>
            <div className="stat-card-value">{orders.filter(o => o.status === 'paid' || o.status === 'completed').length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon" style={{background: '#fef3c7', color: '#d97706'}}>⏳</div>
            <div className="stat-card-label">待支付</div>
            <div className="stat-card-value">{orders.filter(o => o.status === 'pending').length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon" style={{background: '#fee2e2', color: '#dc2626'}}>💰</div>
            <div className="stat-card-label">累计消费</div>
            <div className="stat-card-value">¥{orders.filter(o => o.status === 'paid' || o.status === 'completed').reduce((sum, o) => sum + (o.amount || o.total || 0), 0).toFixed(2)}</div>
          </div>
        </div>

        {/* Tab切换 */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '0'
        }}>
          {[
            { key: 'orders', label: '我的订单', icon: '📦' },
            { key: 'query', label: '订单查询', icon: '🔍' }
          ].map(tab => (
            <div
              key={tab.key}
              style={{
                padding: '12px 20px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                borderBottom: '2px solid',
                borderColor: activeTab === tab.key ? 'var(--primary)' : 'transparent',
                color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-secondary)',
                marginBottom: '-1px'
              }}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon} {tab.label}
            </div>
          ))}
        </div>

        {/* 我的订单 */}
        {activeTab === 'orders' && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">订单列表</div>
            </div>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>订单号</th>
                    <th>商品</th>
                    <th>金额</th>
                    <th>状态</th>
                    <th>下单时间</th>
                    <th>卡密</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="6">
                        <div className="empty">
                          <div className="empty-icon">📭</div>
                          <div className="empty-text">暂无订单</div>
                        </div>
                      </td>
                    </tr>
                  ) : orders.map((order) => (
                    <tr key={order.id}>
                      <td style={{fontFamily: 'monospace', fontSize: '13px'}}>{order.order_no || order.id}</td>
                      <td>{order.product_name || order.product_id}</td>
                      <td style={{color: 'var(--danger)', fontWeight: 600}}>¥{order.amount || order.total}</td>
                      <td>{getStatusBadge(order.status)}</td>
                      <td style={{fontSize: '13px', color: 'var(--text-muted)'}}>
                        {order.created_at ? new Date(order.created_at).toLocaleString() : '-'}
                      </td>
                      <td>
                        {(order.status === 'paid' || order.status === 'completed') && order.cards ? (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => alert(order.cards.map(c => c.card_content || c.content || c).join('\n'))}
                          >
                            查看卡密
                          </button>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 订单查询 */}
        {activeTab === 'query' && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">订单查询</div>
            </div>
            <div className="card-body">
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px'}}>
                <div className="form-group">
                  <label className="form-label">订单号</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="请输入订单号"
                    value={queryOrder}
                    onChange={(e) => setQueryOrder(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">联系方式</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="请输入下单时的联系方式"
                    value={queryContact}
                    onChange={(e) => setQueryContact(e.target.value)}
                  />
                </div>
              </div>
              <button className="btn btn-primary" onClick={handleQuery}>🔍 查询订单</button>

              {queryResult && (
                <div style={{marginTop: '24px', padding: '20px', background: 'var(--bg)', borderRadius: '8px'}}>
                  <h4 style={{marginBottom: '16px', fontWeight: 600}}>查询结果</h4>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px'}}>
                    <div><span style={{color: 'var(--text-muted)'}}>订单号：</span>{queryResult.order_no || queryResult.id}</div>
                    <div><span style={{color: 'var(--text-muted)'}}>商品：</span>{queryResult.product_name}</div>
                    <div><span style={{color: 'var(--text-muted)'}}>金额：</span><span style={{color: 'var(--danger)', fontWeight: 600}}>¥{queryResult.amount || queryResult.total}</span></div>
                    <div><span style={{color: 'var(--text-muted)'}}>状态：</span>{getStatusBadge(queryResult.status)}</div>
                  </div>
                  {queryResult.cards && queryResult.cards.length > 0 && (
                    <div>
                      <div style={{fontWeight: 600, marginBottom: '8px'}}>卡密信息：</div>
                      {queryResult.cards.map((card, i) => (
                        <div key={i} style={{
                          padding: '10px 14px',
                          background: 'var(--bg-card)',
                          borderRadius: '6px',
                          marginBottom: '8px',
                          fontFamily: 'monospace',
                          fontSize: '13px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span>{card.card_content || card.content || card}</span>
                          <button className="btn btn-secondary btn-sm" onClick={() => navigator.clipboard.writeText(card.card_content || card.content || card)}>复制</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
