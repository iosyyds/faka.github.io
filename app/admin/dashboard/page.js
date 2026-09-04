'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '../ui.css';

const API = typeof window !== 'undefined' && location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api';
const NAV = [
  { key:'dashboard', label:'概览', icon:'📊', path:'/admin/dashboard' },
  { key:'products', label:'商品', icon:'📦', path:'/admin/products' },
  { key:'cards', label:'卡密', icon:'🔑', path:'/admin/cards' },
  { key:'orders', label:'订单', icon:'📋', path:'/admin/orders' },
  { key:'settings', label:'设置', icon:'⚙️', path:'/admin/settings' },
];

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({products:0, orders:0, pending:0, revenue:'0.00'});
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('admin_token')) { router.push('/admin/login'); return; }
    load();
  }, [router]);

  const load = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const [p, o] = await Promise.all([
        fetch(`${API}/products?all=1`, {headers:{Authorization:`Bearer ${token}`}, cache:'no-store'}),
        fetch(`${API}/orders`, {headers:{Authorization:`Bearer ${token}`}, cache:'no-store'})
      ]);
      const pd = await p.json(), od = await o.json();
      const prods = pd.products || pd.data || [];
      const ords = od.orders || od.data || [];
      const paid = ords.filter(x => x.status==='paid' || x.status==='completed');
      setOrders(ords);
      setStats({products:prods.length, orders:ords.length, pending:ords.filter(x=>x.status==='pending').length, revenue:paid.reduce((s,x)=>s+(x.amount||x.total||0),0).toFixed(2)});
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const logout = () => { localStorage.removeItem('admin_token'); router.push('/admin/login'); };
  if (loading) return <div style={{padding:'60px',textAlign:'center',color:'#9ca3af'}}>加载中...</div>;

  return (
    <div>
      <nav className="top-nav">
        <div className="nav-logo"><div className="nav-logo-icon">甜</div><div className="nav-logo-text">甜甜发卡后台</div></div>
        <div className="nav-menu">{NAV.map(n => (<div key={n.key} className={`nav-menu-item ${n.key==='dashboard'?'active':''}`} onClick={()=>router.push(n.path)}><span>{n.icon}</span>{n.label}</div>))}</div>
        <div className="nav-right"><button className="nav-logout" onClick={logout}>退出</button></div>
      </nav>
      <div className="main-wrap">
        <div className="page-content">
          <div className="page-header"><div className="page-title">数据概览</div><div className="page-sub">实时查看商城运营数据</div></div>
          <div className="stats-grid">
            <div className="stat-big-card blue"><div className="stat-big-icon blue">📦</div><div className="stat-big-label">商品总数</div><div className="stat-big-value">{stats.products}</div></div>
            <div className="stat-big-card green"><div className="stat-big-icon green">📋</div><div className="stat-big-label">订单总数</div><div className="stat-big-value">{stats.orders}</div></div>
            <div className="stat-big-card yellow"><div className="stat-big-icon yellow">⏳</div><div className="stat-big-label">待处理</div><div className="stat-big-value">{stats.pending}</div></div>
            <div className="stat-big-card purple"><div className="stat-big-icon purple">💰</div><div className="stat-big-label">总收入</div><div className="stat-big-value">¥{stats.revenue}</div></div>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">最近订单</div></div>
            <div className="card-body">
              <div className="order-list">
                {orders.slice(0,6).map(o => (
                  <div key={o.id} className="order-item">
                    <div className="order-left">
                      <div className="order-no">{o.order_no||o.id}</div>
                      <div className="order-detail">{o.product_name} · {o.email||o.contact||'-'} · {o.created_at?new Date(o.created_at).toLocaleString():'-'}</div>
                    </div>
                    <div className="order-right">
                      <div className="order-amount">¥{o.amount||o.total}</div>
                      <span className={`badge ${o.status==='paid'?'badge-green':'badge-yellow'}`}>{o.status==='paid'?'已支付':'待支付'}</span>
                    </div>
                  </div>
                ))}
                {orders.length===0 && <div className="empty"><div className="empty-icon">📭</div><div className="empty-text">暂无订单</div></div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
