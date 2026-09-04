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

export default function Settings() {
  const router = useRouter();
  const [s, setS] = useState({});
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => { if (!localStorage.getItem('admin_token')) { router.push('/admin/login'); return; } load(); }, [router]);

  const load = async () => {
    const res = await fetch(`${API}/settings`, {cache:'no-store'});
    const data = await res.json();
    setS(data.settings || {});
  };

  const save = async () => {
    setSaving(true);
    const token = localStorage.getItem('admin_token');
    const res = await fetch(`${API}/settings`, {method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`}, body:JSON.stringify(s)});
    const data = await res.json();
    if (data.success) alert('保存成功');
    else { if (res.status===401) { alert('登录已过期'); localStorage.removeItem('admin_token'); router.push('/admin/login'); return; } alert(data.error||'保存失败'); }
    setSaving(false);
  };

  const sendTest = async () => {
    if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) return alert('请输入有效邮箱');
    setTesting(true);
    const token = localStorage.getItem('admin_token');
    const res = await fetch(`${API}/test-email`, {method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`}, body:JSON.stringify({test_email:testEmail})});
    const data = await res.json();
    alert(data.success ? '测试邮件已发送' : (data.error||'发送失败'));
    setTesting(false);
  };

  const logout = () => { localStorage.removeItem('admin_token'); router.push('/admin/login'); };

  return (
    <div>
      <nav className="top-nav">
        <div className="nav-logo"><div className="nav-logo-icon">甜</div><div className="nav-logo-text">甜甜发卡后台</div></div>
        <div className="nav-menu">{NAV.map(n => (<div key={n.key} className={`nav-menu-item ${n.key==='settings'?'active':''}`} onClick={()=>router.push(n.path)}><span>{n.icon}</span>{n.label}</div>))}</div>
        <div className="nav-right"><button className="nav-logout" onClick={logout}>退出</button></div>
      </nav>
      <div className="main-wrap">
        <div className="page-content">
          <div className="page-header" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
            <div><div className="page-title">系统设置</div><div className="page-sub">配置商城基础信息</div></div>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'保存中...':'保存设置'}</button>
          </div>

          <div className="card" style={{marginBottom:'20px'}}>
            <div className="card-header"><div className="card-title">基础设置</div></div>
            <div className="card-body">
              <div className="form-group"><label className="form-label">网站名称</label><input className="form-input" value={s.site_name||''} onChange={e=>setS({...s,site_name:e.target.value})} /></div>
              <div className="form-group"><label className="form-label">网站副标题</label><input className="form-input" value={s.site_subtitle||''} onChange={e=>setS({...s,site_subtitle:e.target.value})} /></div>
              <div className="form-group"><label className="form-label">网站描述</label><textarea className="form-textarea" style={{minHeight:'60px'}} value={s.site_description||''} onChange={e=>setS({...s,site_description:e.target.value})} /></div>
              <div className="form-group"><label className="form-label">网站Logo URL</label><input className="form-input" value={s.site_logo||''} onChange={e=>setS({...s,site_logo:e.target.value})} /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">联系QQ</label><input className="form-input" value={s.contact_qq||''} onChange={e=>setS({...s,contact_qq:e.target.value})} /></div>
                <div className="form-group"><label className="form-label">联系微信</label><input className="form-input" value={s.contact_wechat||''} onChange={e=>setS({...s,contact_wechat:e.target.value})} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">联系邮箱</label><input className="form-input" value={s.contact_email||''} onChange={e=>setS({...s,contact_email:e.target.value})} /></div>
                <div className="form-group"><label className="form-label">ICP备案号</label><input className="form-input" value={s.icp_number||''} onChange={e=>setS({...s,icp_number:e.target.value})} /></div>
              </div>
            </div>
          </div>

          <div className="card" style={{marginBottom:'20px'}}>
            <div className="card-header"><div className="card-title">首页横幅配置</div></div>
            <div className="card-body">
              <div className="form-group"><label className="form-label">横幅标题</label><input className="form-input" value={s.banner_title||''} onChange={e=>setS({...s,banner_title:e.target.value})} /></div>
              <div className="form-group"><label className="form-label">横幅副标题</label><input className="form-input" value={s.banner_subtitle||''} onChange={e=>setS({...s,banner_subtitle:e.target.value})} /></div>
              <div className="form-row-3">
                <div className="form-group"><label className="form-label">标签1</label><input className="form-input" value={s.banner_tag1||''} onChange={e=>setS({...s,banner_tag1:e.target.value})} /></div>
                <div className="form-group"><label className="form-label">标签2</label><input className="form-input" value={s.banner_tag2||''} onChange={e=>setS({...s,banner_tag2:e.target.value})} /></div>
                <div className="form-group"><label className="form-label">标签3</label><input className="form-input" value={s.banner_tag3||''} onChange={e=>setS({...s,banner_tag3:e.target.value})} /></div>
              </div>
              <div className="form-group"><label className="form-label">横幅右侧图片URL</label><input className="form-input" value={s.banner_image||''} onChange={e=>setS({...s,banner_image:e.target.value})} /></div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">邮件自动发送配置</div></div>
            <div className="card-body">
              <div style={{fontSize:'12.5px',color:'#9ca3af',marginBottom:'18px',lineHeight:1.6}}>支付成功后自动发送卡密到用户邮箱。推荐使用QQ邮箱，密码处填写授权码（非登录密码）。</div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">SMTP服务器</label><input className="form-input" value={s.smtp_host||''} onChange={e=>setS({...s,smtp_host:e.target.value})} placeholder="如：smtp.qq.com" /></div>
                <div className="form-group"><label className="form-label">端口</label><input type="number" className="form-input" value={s.smtp_port||''} onChange={e=>setS({...s,smtp_port:e.target.value})} placeholder="465" /></div>
              </div>
              <div className="form-group"><label className="form-label">发件邮箱</label><input className="form-input" value={s.smtp_user||''} onChange={e=>setS({...s,smtp_user:e.target.value})} /></div>
              <div className="form-group"><label className="form-label">邮箱授权码/密码</label><input type="password" className="form-input" value={s.smtp_pass||''} onChange={e=>setS({...s,smtp_pass:e.target.value})} /></div>
              <div className="form-group"><label className="form-label">发件人名称</label><input className="form-input" value={s.smtp_from_name||''} onChange={e=>setS({...s,smtp_from_name:e.target.value})} placeholder="如：甜甜发卡" /></div>
              <div style={{display:'flex',gap:'10px',alignItems:'flex-end'}}>
                <div className="form-group" style={{flex:1,marginBottom:0}}><label className="form-label">测试邮箱</label><input type="email" className="form-input" value={testEmail} onChange={e=>setTestEmail(e.target.value)} placeholder="输入测试邮箱地址" /></div>
                <button className="btn btn-secondary" onClick={sendTest} disabled={testing} style={{whiteSpace:'nowrap'}}>{testing?'发送中...':'发送测试邮件'}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
