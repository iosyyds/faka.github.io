'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '../admin.css';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api';
const menuItems = [
  { key: 'dashboard', label: '数据概览', icon: '📊', path: '/admin' },
  { key: 'products', label: '商品管理', icon: '📦', path: '/admin/products' },
  { key: 'cards', label: '卡密管理', icon: '🔑', path: '/admin/cards' },
  { key: 'orders', label: '订单管理', icon: '📋', path: '/admin/orders' },
  { key: 'settings', label: '系统设置', icon: '⚙️', path: '/admin/settings' },
];

export default function Settings() {
  const router = useRouter();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) { router.push('/admin/login'); return; }
    setAuthed(true);
    loadSettings();
  }, [router]);

  const loadSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings`, { cache: 'no-store' });
      const data = await res.json();
      setSettings(data.settings || {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) alert('保存成功');
      else { if (res.status === 401) { alert('登录已过期'); localStorage.removeItem('admin_token'); router.push('/admin/login'); return; } alert(data.error || data.message || '保存失败'); }
    } catch (e) { alert('保存失败'); }
    finally { setSaving(false); }
  };

  const handleTestEmail = async () => {
    if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) { alert('请输入有效的邮箱'); return; }
    setTestingEmail(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/test-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ test_email: testEmail })
      });
      const data = await res.json();
      alert(data.success ? '测试邮件已发送，请查收' : (data.error || '发送失败'));
    } catch (e) { alert('发送失败'); }
    finally { setTestingEmail(false); }
  };

  const handleLogout = () => { localStorage.removeItem('admin_token'); router.push('/admin/login'); };
  if (!authed || loading) return <div className="admin-v2"><div style={{padding: '60px', textAlign: 'center', color: '#64748b'}}>加载中...</div></div>;

  return (
    <div className="admin-v2"><div className="admin-v2-layout">
      <aside className="admin-v2-sidebar">
        <div className="admin-v2-logo"><div className="admin-v2-logo-icon">甜</div><div><div className="admin-v2-logo-text">甜甜发卡</div><div className="admin-v2-logo-sub">管理后台</div></div></div>
        <nav className="admin-v2-menu">{menuItems.map(item => (<div key={item.key} className={`admin-v2-menu-item ${item.key === 'settings' ? 'active' : ''}`} onClick={() => router.push(item.path)}><span className="admin-v2-menu-icon">{item.icon}</span><span>{item.label}</span></div>))}</nav>
        <div className="admin-v2-sidebar-footer"><button className="admin-v2-logout-btn" onClick={handleLogout}>退出登录</button></div>
      </aside>
      <div className="admin-v2-main">
        <header className="admin-v2-header">
          <h1 className="admin-v2-header-title">系统设置</h1>
          <div className="admin-v2-header-actions"><button className="admin-v2-btn admin-v2-btn-primary" onClick={save} disabled={saving}>{saving ? '保存中...' : '保存设置'}</button></div>
        </header>
        <div className="admin-v2-content">
          {/* 基础设置 */}
          <div className="admin-v2-card" style={{marginBottom: '24px'}}>
            <div className="admin-v2-card-header"><div className="admin-v2-card-title">基础设置</div></div>
            <div className="admin-v2-card-body">
              <div className="admin-v2-form-group"><label className="admin-v2-form-label">网站名称</label><input className="admin-v2-form-input" value={settings.site_name || ''} onChange={(e) => setSettings({...settings, site_name: e.target.value})} /></div>
              <div className="admin-v2-form-group"><label className="admin-v2-form-label">网站副标题</label><input className="admin-v2-form-input" value={settings.site_subtitle || ''} onChange={(e) => setSettings({...settings, site_subtitle: e.target.value})} /></div>
              <div className="admin-v2-form-group"><label className="admin-v2-form-label">网站描述</label><textarea className="admin-v2-form-textarea" style={{minHeight: '60px'}} value={settings.site_description || ''} onChange={(e) => setSettings({...settings, site_description: e.target.value})} /></div>
              <div className="admin-v2-form-group"><label className="admin-v2-form-label">网站Logo URL</label><input className="admin-v2-form-input" value={settings.site_logo || ''} onChange={(e) => setSettings({...settings, site_logo: e.target.value})} /></div>
              <div className="admin-v2-form-row">
                <div className="admin-v2-form-group"><label className="admin-v2-form-label">联系QQ</label><input className="admin-v2-form-input" value={settings.contact_qq || ''} onChange={(e) => setSettings({...settings, contact_qq: e.target.value})} /></div>
                <div className="admin-v2-form-group"><label className="admin-v2-form-label">联系微信</label><input className="admin-v2-form-input" value={settings.contact_wechat || ''} onChange={(e) => setSettings({...settings, contact_wechat: e.target.value})} /></div>
              </div>
              <div className="admin-v2-form-row">
                <div className="admin-v2-form-group"><label className="admin-v2-form-label">联系邮箱</label><input className="admin-v2-form-input" value={settings.contact_email || ''} onChange={(e) => setSettings({...settings, contact_email: e.target.value})} /></div>
                <div className="admin-v2-form-group"><label className="admin-v2-form-label">ICP备案号</label><input className="admin-v2-form-input" value={settings.icp_number || ''} onChange={(e) => setSettings({...settings, icp_number: e.target.value})} /></div>
              </div>
            </div>
          </div>

          {/* 首页横幅 */}
          <div className="admin-v2-card" style={{marginBottom: '24px'}}>
            <div className="admin-v2-card-header"><div className="admin-v2-card-title">首页横幅配置</div></div>
            <div className="admin-v2-card-body">
              <div className="admin-v2-form-group"><label className="admin-v2-form-label">横幅标题</label><input className="admin-v2-form-input" value={settings.banner_title || ''} onChange={(e) => setSettings({...settings, banner_title: e.target.value})} /></div>
              <div className="admin-v2-form-group"><label className="admin-v2-form-label">横幅副标题</label><input className="admin-v2-form-input" value={settings.banner_subtitle || ''} onChange={(e) => setSettings({...settings, banner_subtitle: e.target.value})} /></div>
              <div className="admin-v2-form-row">
                <div className="admin-v2-form-group"><label className="admin-v2-form-label">标签1</label><input className="admin-v2-form-input" value={settings.banner_tag1 || ''} onChange={(e) => setSettings({...settings, banner_tag1: e.target.value})} /></div>
                <div className="admin-v2-form-group"><label className="admin-v2-form-label">标签2</label><input className="admin-v2-form-input" value={settings.banner_tag2 || ''} onChange={(e) => setSettings({...settings, banner_tag2: e.target.value})} /></div>
                <div className="admin-v2-form-group"><label className="admin-v2-form-label">标签3</label><input className="admin-v2-form-input" value={settings.banner_tag3 || ''} onChange={(e) => setSettings({...settings, banner_tag3: e.target.value})} /></div>
              </div>
              <div className="admin-v2-form-group"><label className="admin-v2-form-label">横幅右侧图片URL</label><input className="admin-v2-form-input" value={settings.banner_image || ''} onChange={(e) => setSettings({...settings, banner_image: e.target.value})} /></div>
            </div>
          </div>

          {/* 邮件配置 */}
          <div className="admin-v2-card">
            <div className="admin-v2-card-header"><div className="admin-v2-card-title">邮件自动发送配置</div></div>
            <div className="admin-v2-card-body">
              <div style={{fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: 1.6}}>支付成功后自动发送卡密到用户邮箱。推荐使用QQ邮箱，密码处填写授权码（非登录密码）。</div>
              <div className="admin-v2-form-row">
                <div className="admin-v2-form-group"><label className="admin-v2-form-label">SMTP服务器</label><input className="admin-v2-form-input" value={settings.smtp_host || ''} onChange={(e) => setSettings({...settings, smtp_host: e.target.value})} placeholder="如：smtp.qq.com" /></div>
                <div className="admin-v2-form-group"><label className="admin-v2-form-label">端口</label><input type="number" className="admin-v2-form-input" value={settings.smtp_port || ''} onChange={(e) => setSettings({...settings, smtp_port: e.target.value})} placeholder="465" /></div>
              </div>
              <div className="admin-v2-form-group"><label className="admin-v2-form-label">发件邮箱</label><input className="admin-v2-form-input" value={settings.smtp_user || ''} onChange={(e) => setSettings({...settings, smtp_user: e.target.value})} /></div>
              <div className="admin-v2-form-group"><label className="admin-v2-form-label">邮箱授权码/密码</label><input type="password" className="admin-v2-form-input" value={settings.smtp_pass || ''} onChange={(e) => setSettings({...settings, smtp_pass: e.target.value})} /></div>
              <div className="admin-v2-form-group"><label className="admin-v2-form-label">发件人名称</label><input className="admin-v2-form-input" value={settings.smtp_from_name || ''} onChange={(e) => setSettings({...settings, smtp_from_name: e.target.value})} placeholder="如：甜甜发卡" /></div>
              <div style={{display: 'flex', gap: '10px', alignItems: 'flex-end'}}>
                <div className="admin-v2-form-group" style={{flex: 1, marginBottom: 0}}><label className="admin-v2-form-label">测试邮箱</label><input type="email" className="admin-v2-form-input" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="输入测试邮箱地址" /></div>
                <button className="admin-v2-btn admin-v2-btn-secondary" onClick={handleTestEmail} disabled={testingEmail} style={{whiteSpace: 'nowrap'}}>{testingEmail ? '发送中...' : '发送测试邮件'}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <nav className="admin-v2-mobile-nav">{menuItems.map(item => (<div key={item.key} className={`admin-v2-mobile-nav-item ${item.key === 'settings' ? 'active' : ''}`} onClick={() => router.push(item.path)}><span className="admin-v2-mobile-nav-icon">{item.icon}</span><span className="admin-v2-mobile-nav-label">{item.label.replace('管理', '')}</span></div>))}</nav>
    </div></div>
  );
}
