'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api' : '/api';

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
        router.push('/admin');
      } else {
        alert(data.error || data.message || '登录失败');
      }
    } catch (e) {
      alert('登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', padding: '20px'}}>
      <div style={{background: 'white', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)'}}>
        <div style={{textAlign: 'center', marginBottom: '30px'}}>
          <div style={{width: '60px', height: '60px', borderRadius: '16px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', margin: '0 auto 16px'}}>甜</div>
          <h1 style={{fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0}}>管理后台</h1>
          <p style={{color: '#6b7280', fontSize: '14px', marginTop: '8px'}}>甜甜发卡管理系统</p>
        </div>
        <form onSubmit={handleLogin}>
          <div style={{marginBottom: '16px'}}>
            <label style={{display: 'block', fontSize: '14px', color: '#374151', marginBottom: '8px', fontWeight: 500}}>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              style={{width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box'}}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1}}
          >
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>
        <p style={{textAlign: 'center', color: '#9ca3af', fontSize: '13px', marginTop: '20px'}}>默认账号：admin / admin123</p>
      </div>
    </div>
  );
}
