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

export default function Orders() {
  const router = useRouter();
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => { if (!localStorage.getItem('admin_token')) { router.push('/admin/login'); return; } load(); }, [router]);

  const load = async () => {
    const token = localStorage.getItem('admin_token');
    const url = filter==='all' ? `${API}/orders` : `${API}/orders?status=${filter}`;
    const res = await fetch(url, {headers:{Authorization:`Bearer ${token}`}, cache:'no-store'});
    const data = await res.json();
    setList(data.orders || data.data || []);
  };

  const markPaid = async (id) => {
    if (!confirm('确定标记为已支付？')) return;
    const token = localStorage.getItem('admin_token');
    await fetch(`${API}/order/${id}/pay`, {method:'POST', headers:{Authorization:`Bearer ${token}`}});
    load();
  };

  const logout = () => { localStorage.removeItem('admin_token'); router.push('/admin/login'); };
  const filtered = filter==='all' ? list : list.filter(o=>o.status===filter);

  return (
    <div>
      <nav className="top-nav">
        <div className="nav-logo"><div className="nav-logo-icon">甜</div><div className="nav-logo-text">甜甜发卡后台</div></div>
        <div className="nav-menu">{NAV.map(n => (<div key={n.key} className={`nav-menu-item ${n.key==='orders'?'active':''}`} onClick={()=>router.push(n.path)}><span>{n.icon}</span>{n.label}</div>))}</div>
        <div className="nav-right"><button className="nav-logout" onClick={logout}>退出</button></div>
      </nav>
      <div className="main-wrap">
        <div className="page-content">
          <div className="page-header"><div className="page-title">订单管理</div><div className="page-sub">共 {filtered.length} 条订单</div></div>
          <div className="filter-tabs">
            {['all','pending','paid'].map(s => (
              <button key={s} className={`filter-tab ${filter===s?'active':''}`} onClick={()=>{setFilter(s);setTimeout(load,0);}}>
                {s==='all'?'全部':s==='pending'?'待支付':'已支付'}
              </button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <div className="card"><div className="empty"><div className="empty-icon">📋</div><div className="empty-text">暂无订单</div></div></div>
          ) : (
            <div className="order-list">
              {filtered.map(o => (
                <div key={o.id} className="order-item">
                  <div className="order-left">
                    <div className="order-no">{o.order_no||o.id}</div>
                    <div className="order-detail">{o.product_name} · {o.email||o.contact||'-'} · 数量{o.quantity||1} · {o.created_at?new Date(o.created_at).toLocaleString():'-'}</div>
                  </div>
                  <div className="order-right">
                    <div className="order-amount">¥{o.amount||o.total}</div>
                    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                      <span className={`badge ${o.status==='paid'?'badge-green':'badge-yellow'}`}>{o.status==='paid'?'已支付':'待支付'}</span>
                      {o.status!=='paid' && <button className="btn btn-sm btn-secondary" onClick={()=>markPaid(o.id)}>标记已付</button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
