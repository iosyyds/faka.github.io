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
  const [captcha, setCaptcha] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [querying, setQuerying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { generateCaptcha(); }, []);

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
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
    } catch (e) {
      setError('查询失败，请重试');
    } finally {
      setQuerying(false);
    }
  };

  const copyCard = (text) => {
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板');
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <div className="noise-overlay"></div>

      <nav className="nav-glass">
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => router.push('/')}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(228,184,99,0.3), rgba(228,184,99,0.1))', border: '1px solid rgba(228,184,99,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E4B863', fontWeight: 800 }}>N</div>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>订单查询</span>
          </div>
          <button className="btn-ghost" onClick={() => router.push('/')}>← 返回首页</button>
        </div>
      </nav>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 24px' }}>
        <div className="glass glass-lg animate-fade-in" style={{ padding: '36px 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>订单查询</h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>输入订单号和邮箱查询您的订单</p>
          </div>

          {error && (
            <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', fontSize: '13px', color: '#f87171', marginBottom: '20px' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>订单号</label>
            <input type="text" className="input-glass" placeholder="请输入订单号" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>邮箱地址</label>
            <input type="email" className="input-glass" placeholder="请输入下单时的邮箱" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>验证码</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input type="text" className="input-glass" placeholder="请输入验证码" value={captcha} onChange={(e) => setCaptcha(e.target.value)} maxLength={4} style={{ flex: 1, textTransform: 'uppercase' }} />
              <div onClick={generateCaptcha} style={{
                minWidth: '100px', height: '46px',
                background: 'linear-gradient(135deg, rgba(228,184,99,0.2), rgba(124,156,196,0.2))',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', fontWeight: 800, letterSpacing: '4px',
                color: '#E4B863', cursor: 'pointer',
                fontFamily: 'monospace',
                userSelect: 'none'
              }}>
                {captchaCode}
              </div>
            </div>
          </div>

          <button className="btn-gold" style={{ width: '100%', padding: '14px', fontSize: '16px' }} disabled={querying} onClick={handleQuery}>
            {querying ? '查询中...' : '查询订单'}
          </button>
        </div>

        {result && (
          <div className="glass animate-fade-in" style={{ padding: '28px 32px', marginTop: '24px' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '20px' }}>查询结果</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px' }}>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>订单号</div>
                <div style={{ fontSize: '13px', color: '#fff', fontFamily: 'monospace' }}>{result.order_no || result.id}</div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px' }}>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>状态</div>
                <div style={{ fontSize: '13px', color: result.status === 'paid' || result.status === 'completed' ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
                  {result.status === 'paid' || result.status === 'completed' ? '已支付' : result.status === 'pending' ? '待支付' : result.status}
                </div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px' }}>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>商品</div>
                <div style={{ fontSize: '13px', color: '#fff' }}>{result.product_name}</div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px' }}>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>金额</div>
                <div className="price-gold" style={{ fontSize: '16px' }}><small>¥</small>{result.amount || result.total}</div>
              </div>
            </div>

            {(result.status === 'paid' || result.status === 'completed') && result.cards && result.cards.length > 0 && (
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '12px' }}>卡密信息：</div>
                {result.cards.map((card, i) => (
                  <div key={i} style={{ padding: '14px 16px', background: 'rgba(228,184,99,0.06)', border: '1px solid rgba(228,184,99,0.15)', borderRadius: '12px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.8)', wordBreak: 'break-all' }}>{card.card_content || card.content || card}</span>
                    <button className="btn-ghost" style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px', flexShrink: 0, marginLeft: '12px' }} onClick={() => copyCard(card.card_content || card.content || card)}>复制</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
