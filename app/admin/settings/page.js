'use client';
import { useState, useEffect } from 'react';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api' : '/api';

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);

  useEffect(() => { loadSettings(); }, []);

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
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        alert('保存成功');
      } else {
        if (res.status === 401) { alert('登录已过期'); localStorage.removeItem('admin_token'); window.location.href = '/admin/login'; return; }
        alert(data.error || data.message || '保存失败');
      }
    } catch (e) { alert('保存失败'); }
    finally { setSaving(false); }
  };

  const handleTestEmail = async () => {
    if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) { alert('请输入有效的邮箱'); return; }
    setTestingEmail(true);
    try {
      const res = await fetch(`${API_BASE}/test-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: JSON.stringify({ test_email: testEmail })
      });
      const data = await res.json();
      alert(data.success ? '测试邮件已发送，请查收' : (data.error || '发送失败'));
    } catch (e) { alert('发送失败'); }
    finally { setTestingEmail(false); }
  };

  if (loading) return <div style={{padding: '40px', textAlign: 'center', color: '#6b7280'}}>加载中...</div>;

  return (
    <div style={{padding: '24px', paddingBottom: '100px'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h1 style={{fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0}}>系统设置</h1>
        <button onClick={save} disabled={saving} style={{padding: '8px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '14px', opacity: saving ? 0.7 : 1}}>{saving ? '保存中...' : '保存设置'}</button>
      </div>

      <div className="card" style={{marginBottom: '20px'}}>
        <div className="card-header"><div className="card-title">基础设置</div></div>
        <div style={{padding: '20px'}}>
          <div className="form-group"><label className="form-label">网站名称</label><input type="text" className="form-input" value={settings.site_name || ''} onChange={(e) => setSettings({...settings, site_name: e.target.value})} /></div>
          <div className="form-group"><label className="form-label">网站副标题</label><input type="text" className="form-input" value={settings.site_subtitle || ''} onChange={(e) => setSettings({...settings, site_subtitle: e.target.value})} /></div>
          <div className="form-group"><label className="form-label">网站描述</label><textarea className="form-textarea" style={{minHeight: '60px'}} value={settings.site_description || ''} onChange={(e) => setSettings({...settings, site_description: e.target.value})} /></div>
          <div className="form-group"><label className="form-label">网站Logo URL</label><input type="text" className="form-input" value={settings.site_logo || ''} onChange={(e) => setSettings({...settings, site_logo: e.target.value})} placeholder="图片URL地址" /></div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px'}}>
            <div className="form-group"><label className="form-label">联系QQ</label><input type="text" className="form-input" value={settings.contact_qq || ''} onChange={(e) => setSettings({...settings, contact_qq: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">联系微信</label><input type="text" className="form-input" value={settings.contact_wechat || ''} onChange={(e) => setSettings({...settings, contact_wechat: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">联系邮箱</label><input type="text" className="form-input" value={settings.contact_email || ''} onChange={(e) => setSettings({...settings, contact_email: e.target.value})} /></div>
          </div>
          <div className="form-group"><label className="form-label">ICP备案号</label><input type="text" className="form-input" value={settings.icp_number || ''} onChange={(e) => setSettings({...settings, icp_number: e.target.value})} /></div>
        </div>
      </div>

      <div className="card" style={{marginBottom: '20px'}}>
        <div className="card-header"><div className="card-title">首页横幅配置</div></div>
        <div style={{padding: '20px'}}>
          <div className="form-group"><label className="form-label">横幅标题</label><input type="text" className="form-input" value={settings.banner_title || ''} onChange={(e) => setSettings({...settings, banner_title: e.target.value})} /></div>
          <div className="form-group"><label className="form-label">横幅副标题</label><input type="text" className="form-input" value={settings.banner_subtitle || ''} onChange={(e) => setSettings({...settings, banner_subtitle: e.target.value})} /></div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px'}}>
            <div className="form-group"><label className="form-label">标签1</label><input type="text" className="form-input" value={settings.banner_tag1 || ''} onChange={(e) => setSettings({...settings, banner_tag1: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">标签2</label><input type="text" className="form-input" value={settings.banner_tag2 || ''} onChange={(e) => setSettings({...settings, banner_tag2: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">标签3</label><input type="text" className="form-input" value={settings.banner_tag3 || ''} onChange={(e) => setSettings({...settings, banner_tag3: e.target.value})} /></div>
          </div>
          <div className="form-group"><label className="form-label">横幅右侧图片URL</label><input type="text" className="form-input" value={settings.banner_image || ''} onChange={(e) => setSettings({...settings, banner_image: e.target.value})} /></div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">邮件自动发送配置</div></div>
        <div style={{padding: '20px'}}>
          <div style={{fontSize: '13px', color: '#6b7280', marginBottom: '16px', lineHeight: 1.6}}>支付成功后自动发送卡密到用户邮箱。推荐使用QQ邮箱，密码处填写授权码（非登录密码）。</div>
          <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px'}}>
            <div className="form-group"><label className="form-label">SMTP服务器</label><input type="text" className="form-input" value={settings.smtp_host || ''} onChange={(e) => setSettings({...settings, smtp_host: e.target.value})} placeholder="如：smtp.qq.com" /></div>
            <div className="form-group"><label className="form-label">端口</label><input type="number" className="form-input" value={settings.smtp_port || ''} onChange={(e) => setSettings({...settings, smtp_port: e.target.value})} placeholder="465" /></div>
          </div>
          <div className="form-group"><label className="form-label">发件邮箱</label><input type="text" className="form-input" value={settings.smtp_user || ''} onChange={(e) => setSettings({...settings, smtp_user: e.target.value})} /></div>
          <div className="form-group"><label className="form-label">邮箱授权码/密码</label><input type="password" className="form-input" value={settings.smtp_pass || ''} onChange={(e) => setSettings({...settings, smtp_pass: e.target.value})} /></div>
          <div className="form-group"><label className="form-label">发件人名称</label><input type="text" className="form-input" value={settings.smtp_from_name || ''} onChange={(e) => setSettings({...settings, smtp_from_name: e.target.value})} placeholder="如：甜甜发卡" /></div>
          <div style={{display: 'flex', gap: '10px', alignItems: 'flex-end'}}>
            <div className="form-group" style={{flex: 1, marginBottom: 0}}><label className="form-label">测试邮箱</label><input type="email" className="form-input" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="输入测试邮箱地址" /></div>
            <button onClick={handleTestEmail} disabled={testingEmail} style={{padding: '10px 16px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', cursor: testingEmail ? 'not-allowed' : 'pointer', fontSize: '14px', whiteSpace: 'nowrap'}}>{testingEmail ? '发送中...' : '发送测试邮件'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
