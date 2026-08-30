'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

export default function QueryOrder() {
  const router = useRouter();
  const [orderNo, setOrderNo] = useState('');
  const [email, setEmail] = useState('');
  const [settings, setSettings] = useState({});
  
  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d.success) setSettings(d.settings);
    }).catch(() => {});
  }, []);
  const [captcha, setCaptcha] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [querying, setQuerying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { generateCaptcha(); }, []);

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setCaptchaCode(code);
    setCaptcha('');
  };

  const handleQuery = async () => {
    setError('');
    if (!orderNo) { setError('请输入订单号'); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('请输入有效的邮箱地址'); return; }
    if (!captcha) { setError('请输入验证码'); return; }
    if (captcha.toUpperCase() !== captchaCode) { setError('验证码错误'); generateCaptcha(); return; }

    setQuerying(true);
    try {
      const res = await fetch(`${API_BASE}/query-order?order_no=${orderNo}&email=${email}`);
      const data = await res.json();
      if (data.order || data.data) {
        setResult(data.order || data.data);
      } else {
        setError(data.error || '未找到订单，请检查订单号和邮箱是否正确');
        generateCaptcha();
      }
    } catch (e) { setError('查询失败，请重试'); }
    finally { setQuerying(false); }
  };

  const copyCard = (text) => {
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板');
  };

  return (
    <div>
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo" onClick={() => router.push('/')} style={{cursor:'pointer'}}>
            {settings.site_logo ? (
              <img src={settings.site_logo} alt="Logo" style={{width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover'}} />
            ) : (
              <div className="nav-logo-icon">{settings.logo_text || '甜'}</div>
            )}
            <span>{settings.site_name || '甜甜发卡'}</span>
          </div>
          <div className="nav-right">
            <button className="btn btn-secondary btn-sm" onClick={() => router.push('/')}>← 返回首页</button>
          </div>
        </div>
      </nav>

      <div className="container" style={{maxWidth: '560px'}}>
        <div className="card animate-fade-in">
          <div className="card-body" style={{padding: '32px'}}>
            <div style={{textAlign: 'center', marginBottom: '24px'}}>
              <h1 style={{fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '4px'}}>订单查询</h1>
              <p style={{fontSize: '14px', color: '#6b7280'}}>输入订单号和邮箱查询您的订单</p>
            </div>

            {error && (
              <div style={{padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', color: '#991b1b', marginBottom: '18px'}}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">订单号</label>
              <input type="text" className="form-input" placeholder="请输入订单号" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">邮箱地址</label>
              <input type="email" className="form-input" placeholder="请输入下单时的邮箱" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">验证码</label>
              <div style={{display: 'flex', gap: '10px'}}>
                <input type="text" className="form-input" placeholder="请输入验证码" value={captcha} onChange={(e) => setCaptcha(e.target.value)} maxLength={4} style={{flex: 1, textTransform: 'uppercase'}} />
                <div onClick={generateCaptcha} style={{
                  minWidth: '100px', height: '38px',
                  background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', fontWeight: 700, letterSpacing: '3px',
                  color: '#2563eb', cursor: 'pointer',
                  fontFamily: 'monospace', userSelect: 'none'
                }}>
                  {captchaCode}
                </div>
              </div>
            </div>

            <button className="btn btn-primary btn-lg" style={{width: '100%'}} disabled={querying} onClick={handleQuery}>
              {querying ? '查询中...' : '查询订单'}
            </button>
          </div>
        </div>

        {result && (
          <div className="card animate-fade-in" style={{marginTop: '20px'}}>
            <div className="card-header">
              <div className="card-title">查询结果</div>
            </div>
            <div className="card-body">
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px'}}>
                <div style={{padding: '12px', background: '#f9fafb', borderRadius: '8px'}}>
                  <div style={{fontSize: '12px', color: '#9ca3af', marginBottom: '4px'}}>订单号</div>
                  <div className="mono" style={{fontSize: '13px', color: '#111827'}}>{result.order_no || result.id}</div>
                </div>
                <div style={{padding: '12px', background: '#f9fafb', borderRadius: '8px'}}>
                  <div style={{fontSize: '12px', color: '#9ca3af', marginBottom: '4px'}}>状态</div>
                  <div style={{fontSize: '13px', color: result.status === 'paid' || result.status === 'completed' ? '#059669' : '#d97706', fontWeight: 600}}>
                    {result.status === 'paid' || result.status === 'completed' ? '已支付' : result.status === 'pending' ? '待支付' : result.status}
                  </div>
                </div>
                <div style={{padding: '12px', background: '#f9fafb', borderRadius: '8px'}}>
                  <div style={{fontSize: '12px', color: '#9ca3af', marginBottom: '4px'}}>商品</div>
                  <div style={{fontSize: '13px', color: '#111827'}}>{result.product_name}</div>
                </div>
                <div style={{padding: '12px', background: '#f9fafb', borderRadius: '8px'}}>
                  <div style={{fontSize: '12px', color: '#9ca3af', marginBottom: '4px'}}>金额</div>
                  <div className="price-primary" style={{fontSize: '16px'}}><span style={{fontSize: '12px'}}>¥</span>{result.amount || result.total}</div>
                </div>
              </div>

              {(result.status === 'paid' || result.status === 'completed') && result.cards && result.cards.length > 0 && (
                <div>
                  <div style={{fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '10px'}}>卡密信息：</div>
                  {result.cards.map((card, i) => (
                    <div key={i} style={{padding: '12px 14px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <span className="mono" style={{fontSize: '13px', color: '#2563eb', wordBreak: 'break-all'}}>{card.card_content || card.content || card}</span>
                      <button className="btn btn-secondary btn-sm" style={{flexShrink: 0, marginLeft: '10px'}} onClick={() => copyCard(card.card_content || card.content || card)}>复制</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
