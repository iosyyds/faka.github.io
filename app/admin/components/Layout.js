'use client';
import { useRouter } from 'next/navigation';
import { IconDashboard, IconBox, IconKey, IconOrder, IconSettings, IconLogout } from './Icons';
import '../ui.css';

const NAV = [
  { key:'dashboard', label:'概览', icon:IconDashboard, path:'/admin/dashboard' },
  { key:'products', label:'商品', icon:IconBox, path:'/admin/products' },
  { key:'cards', label:'卡密', icon:IconKey, path:'/admin/cards' },
  { key:'orders', label:'订单', icon:IconOrder, path:'/admin/orders' },
  { key:'settings', label:'设置', icon:IconSettings, path:'/admin/settings' },
];

export default function Layout({ active, children }) {
  const router = useRouter();
  const logout = () => { localStorage.removeItem('admin_token'); router.push('/admin/login'); };
  return (
    <div>
      <nav className="top-nav">
        <div className="nav-logo"><div className="nav-logo-icon">甜</div><div className="nav-logo-text">甜甜发卡后台</div></div>
        <div className="nav-menu">{NAV.map(n => {
          const Icon = n.icon;
          return (<div key={n.key} className={`nav-menu-item ${active===n.key?'active':''}`} onClick={()=>router.push(n.path)}><Icon size={14}/>{n.label}</div>);
        })}</div>
        <div className="nav-right"><button className="nav-logout" onClick={logout}><IconLogout size={13}/> 退出</button></div>
      </nav>
      <div className="main-wrap"><div className="page-content">{children}</div></div>
    </div>
  );
}
