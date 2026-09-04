'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import '../admin.css';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api';

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password) { alert('请输入密码'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('admin_token', data.token);
        router.push('/admin/dashboard');
      } else {
        alert(data.error || data.message || '登录失败');
      }
    } catch (e) { alert('登录失败'); }
    finally { setLoading(false); }
  };

  return (
    <div className="admin-v2" style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px'}}>
      <div style={{background: 'white', borderRadius: '20px', padding: '40px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px rgba(0,0,0,0.15)'}}>
        <div style={{textAlign: 'center', marginBottom: '30px'}}>
          <div style={{width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold', margin: '0 auto 16px', boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)'}}>甜</div>
          <h1 style={{fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0}}>管理后台</h1>
          <p style={{color: '#64748b', fontSize: '14px', marginTop: '8px'}}>甜甜发卡管理系统</p>
        </div>
        <form onSubmit={handleLogin}>
          <div className="admin-v2-form-group">
            <label className="admin-v2-form-label">密码</label>
            <input type="password" className="admin-v2-form-input" style={{minHeight: '48px', fontSize: '16px'}} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入密码" autoFocus />
          </div>
          <button type="submit" className="admin-v2-btn admin-v2-btn-primary" style={{width: '100%', minHeight: '48px', fontSize: '16px', justifyContent: 'center'}} disabled={loading}>
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>
        <p style={{textAlign: 'center', color: '#94a3b8', fontSize: '13px', marginTop: '20px'}}>默认密码：admin123</p>
      </div>
    </div>
  );
}
