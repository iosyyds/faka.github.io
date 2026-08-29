'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

export default function Login() {
  const router = useRouter();
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);

  // 登录表单
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  // 注册表单
  const [registerForm, setRegisterForm] = useState({
    username: '', password: '', confirmPassword: '', email: ''
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.username || !loginForm.password) {
      alert('请输入用户名和密码');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('user_token', data.token);
        localStorage.setItem('user_info', JSON.stringify(data.user));
        alert('登录成功');
        router.push('/user');
      } else {
        alert(data.error || '登录失败');
      }
    } catch (err) {
      alert('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerForm.username || !registerForm.password) {
      alert('请填写用户名和密码');
      return;
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      alert('两次密码不一致');
      return;
    }
    if (registerForm.password.length < 6) {
      alert('密码至少6位');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: registerForm.username,
          password: registerForm.password,
          email: registerForm.email
        })
      });
      const data = await res.json();
      if (data.token || data.user) {
        if (data.token) localStorage.setItem('user_token', data.token);
        alert('注册成功');
        setTab('login');
        setLoginForm({ username: registerForm.username, password: '' });
      } else {
        alert(data.error || '注册失败');
      }
    } catch (err) {
      alert('注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%)',
      padding: '20px'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '420px',
        overflow: 'hidden'
      }}>
        {/* Logo区域 */}
        <div style={{
          padding: '32px 32px 0',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, var(--primary), #a855f7)',
            borderRadius: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '28px',
            fontWeight: 800,
            marginBottom: '16px'
          }}>N</div>
          <h1 style={{fontSize: '24px', fontWeight: 700, marginBottom: '4px'}}>Nova Key</h1>
          <p style={{fontSize: '14px', color: 'var(--text-muted)'}}>安全快捷的自动发卡平台</p>
        </div>

        {/* Tab切换 */}
        <div style={{
          display: 'flex',
          margin: '24px 32px 0',
          background: 'var(--bg)',
          borderRadius: '8px',
          padding: '4px'
        }}>
          <div
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '10px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s',
              background: tab === 'login' ? 'var(--bg-card)' : 'transparent',
              color: tab === 'login' ? 'var(--primary)' : 'var(--text-secondary)',
              boxShadow: tab === 'login' ? 'var(--shadow)' : 'none'
            }}
            onClick={() => setTab('login')}
          >
            登录
          </div>
          <div
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '10px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s',
              background: tab === 'register' ? 'var(--bg-card)' : 'transparent',
              color: tab === 'register' ? 'var(--primary)' : 'var(--text-secondary)',
              boxShadow: tab === 'register' ? 'var(--shadow)' : 'none'
            }}
            onClick={() => setTab('register')}
          >
            注册
          </div>
        </div>

        {/* 表单 */}
        <div style={{padding: '24px 32px 32px'}}>
          {tab === 'login' ? (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">用户名</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="请输入用户名"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">密码</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="请输入密码"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{width: '100%', marginTop: '8px'}}
                disabled={loading}
              >
                {loading ? '登录中...' : '登 录'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label">用户名</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="请输入用户名"
                  value={registerForm.username}
                  onChange={(e) => setRegisterForm({...registerForm, username: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">邮箱（选填）</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="请输入邮箱"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">密码（至少6位）</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="请输入密码"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">确认密码</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="请再次输入密码"
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{width: '100%', marginTop: '8px'}}
                disabled={loading}
              >
                {loading ? '注册中...' : '注 册'}
              </button>
            </form>
          )}

          <div style={{textAlign: 'center', marginTop: '20px'}}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => router.push('/')}
              style={{fontSize: '13px'}}
            >
              ← 返回首页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
