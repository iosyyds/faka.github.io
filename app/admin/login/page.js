'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import '../ui.css';

const API = typeof window !== 'undefined' && location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api';

export default function Login() {
  const router = useRouter();
  const [pwd, setPwd] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!pwd) return alert('请输入密码');
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin-login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({password:pwd}) });
      const data = await res.json();
      if (data.token) { localStorage.setItem('admin_token', data.token); router.push('/admin/dashboard'); }
      else alert(data.error || '登录失败');
    } catch { alert('登录失败'); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">甜</div>
        <div className="login-title">管理后台</div>
        <div className="login-sub">甜甜发卡管理系统</div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">密码</label>
            <input type="password" className="form-input" style={{minHeight:'48px',fontSize:'15px'}} value={pwd} onChange={e=>setPwd(e.target.value)} placeholder="请输入密码" autoFocus />
          </div>
          <button type="submit" className="btn btn-primary btn-block" style={{minHeight:'48px',fontSize:'15px'}} disabled={loading}>{loading?'登录中...':'登 录'}</button>
        </form>
        <div style={{textAlign:'center',color:'#9ca3af',fontSize:'12px',marginTop:'24px'}}>默认密码：admin123</div>
      </div>
    </div>
  );
}
