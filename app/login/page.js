'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 2500); };

  const handleSubmit = async () => {
    setError('');
    if (!username || !password) { setError('请输入用户名和密码'); return; }
    if (mode === 'register') {
      if (password !== confirmPassword) { setError('两次密码不一致'); return; }
      if (password.length < 6) { setError('密码不少于6位'); return; }
    }
    setLoading(true);
    try {
      const url = mode === 'login' ? `${API_BASE}/user/login` : `${API_BASE}/user/register`;
      const body = mode === 'login' ? { username, password } : { username, password, email };
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('user_token', data.token);
        localStorage.setItem('user_info', JSON.stringify(data.user));
        showToast(mode === 'login' ? '登录成功' : '注册成功');
        setTimeout(() => router.push('/user'), 1000);
      } else {
        setError(data.message || '操作失败');
      }
    } catch (e) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <nav className="dc-topbar">
        <div className="dc-topbar-inner">
          <a href="/" className="dc-topbar-logo">
            <div className="dc-topbar-logo-icon">DC</div>
            <div className="dc-topbar-logo-text">
              <div className="dc-topbar-title">DCSHOP多财商城</div>
              <div className="dc-topbar-sub">订单问题请查看买家帮助</div>
            </div>
          </a>
        </div>
      </nav>

      <div style={{ minHeight: 'calc(100vh - 56px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'linear-gradient(180deg, #e6f4ff 0%, #f0f7ff 100%)' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '36px 32px', width: '100%', maxWidth: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ width: 72, height: 72, margin: '0 auto 16px', background: 'linear-gradient(135deg, #1677ff, #06b6d4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, boxShadow: '0 6px 20px rgba(22,119,255,0.3)' }}>🐕</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>{mode === 'login' ? '欢迎回来' : '注册账号'}</h1>
            <p style={{ fontSize: 13, color: '#8c8c8c' }}>{mode === 'login' ? '登录后可查看订单和管理账户' : '注册后即可购买商品和查看订单'}</p>
          </div>

          <div style={{ display: 'flex', background: '#f5f7fa', borderRadius: 10, padding: 4, marginBottom: 20 }}>
            <button
              onClick={() => { setMode('login'); setError(''); }}
              style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, transition: 'all 0.2s', background: mode === 'login' ? '#fff' : 'transparent', color: mode === 'login' ? '#1677ff' : '#8c8c8c', boxShadow: mode === 'login' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none' }}
            >登录</button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, transition: 'all 0.2s', background: mode === 'register' ? '#fff' : 'transparent', color: mode === 'register' ? '#1677ff' : '#8c8c8c', boxShadow: mode === 'register' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none' }}
            >注册</button>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#595959', marginBottom: 6, fontWeight: 500 }}>用户名</label>
            <input
              type="text"
              placeholder="请输入用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e8e8e8', borderRadius: 10, fontSize: 14, outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
              onFocus={(e) => e.target.style.borderColor = '#1677ff'}
              onBlur={(e) => e.target.style.borderColor = '#e8e8e8'}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#595959', marginBottom: 6, fontWeight: 500 }}>密码</label>
            <input
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e8e8e8', borderRadius: 10, fontSize: 14, outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
              onFocus={(e) => e.target.style.borderColor = '#1677ff'}
              onBlur={(e) => e.target.style.borderColor = '#e8e8e8'}
            />
          </div>

          {mode === 'register' && (
            <>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#595959', marginBottom: 6, fontWeight: 500 }}>确认密码</label>
                <input
                  type="password"
                  placeholder="请再次输入密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                  style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e8e8e8', borderRadius: 10, fontSize: 14, outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                  onFocus={(e) => e.target.style.borderColor = '#1677ff'}
                  onBlur={(e) => e.target.style.borderColor = '#e8e8e8'}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#595959', marginBottom: 6, fontWeight: 500 }}>邮箱（选填）</label>
                <input
                  type="email"
                  placeholder="请输入邮箱"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                  style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e8e8e8', borderRadius: 10, fontSize: 14, outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                  onFocus={(e) => e.target.style.borderColor = '#1677ff'}
                  onBlur={(e) => e.target.style.borderColor = '#e8e8e8'}
                />
              </div>
            </>
          )}

          {error && <div style={{ color: '#ff4d4f', fontSize: 13, marginBottom: 14, padding: '8px 12px', background: '#fff2f0', borderRadius: 8 }}>{error}</div>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #1677ff, #06b6d4)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 16px rgba(22,119,255,0.3)', transition: 'all 0.2s', opacity: loading ? 0.6 : 1 }}
          >{loading ? '处理中...' : mode === 'login' ? '登 录' : '注 册'}</button>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#8c8c8c' }}>
            {mode === 'login' ? (
              <>还没有账号？<span onClick={() => { setMode('register'); setError(''); }} style={{ color: '#1677ff', cursor: 'pointer', fontWeight: 500 }}>立即注册</span></>
            ) : (
              <>已有账号？<span onClick={() => { setMode('login'); setError(''); }} style={{ color: '#1677ff', cursor: 'pointer', fontWeight: 500 }}>立即登录</span></>
            )}
          </div>
        </div>
      </div>

      {toast && <div className={`dc-toast ${toast.type}`}>{toast.message}</div>}
    </>
  );
}
