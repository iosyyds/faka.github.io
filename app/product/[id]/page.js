'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

export default function ProductDetail() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBuy, setShowBuy] = useState(false);
  const [email, setEmail] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [ordering, setOrdering] = useState(false);
  const [order, setOrder] = useState(null);
  const [payUrl, setPayUrl] = useState('');

  useEffect(() => { loadProduct(); }, [params.id]);

  const loadProduct = async () => {
    try {
      const res = await fetch(`${API_BASE}/product/${params.id}`);
      const data = await res.json();
      setProduct(data.product || data.data || null);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleBuy = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('请输入有效的邮箱地址');
      return;
    }
    setOrdering(true);
    try {
      const res = await fetch(`${API_BASE}/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          email,
          quantity,
          pay_method: 'epay'
        })
      });
      const data = await res.json();
      if (data.order || data.data) {
        const ord = data.order || data.data;
        setOrder(ord);
        if (data.pay_url) {
          setPayUrl(data.pay_url);
          window.open(data.pay_url, '_blank');
        } else {
          // 模拟支付成功，直接显示卡密
          setTimeout(() => {
            fetch(`${API_BASE}/query-order?order_no=${ord.order_no || ord.id}&email=${email}`)
              .then(r => r.json())
              .then(d => {
                if (d.order || d.data) setOrder(d.order || d.data);
              });
          }, 2000);
        }
      } else {
        alert(data.error || '下单失败');
      }
    } catch (e) { alert('下单失败，请重试'); }
    finally { setOrdering(false); }
  };

  const copyCard = (text) => {
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'rgba(255,255,255,0.5)' }}>
        <div style={{ fontSize: '48px', marginRight: '16px' }}>⏳</div>加载中...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div className="glass" style={{ padding: '60px 40px', maxWidth: '400px', margin: '0 auto' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>❌</div>
          <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.7)', marginBottom: '20px' }}>商品不存在</div>
          <button className="btn-gold" onClick={() => router.push('/')}>返回首页</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <div className="noise-overlay"></div>

      <nav className="nav-glass">
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => router.push('/')}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(228,184,99,0.3), rgba(228,184,99,0.1))', border: '1px solid rgba(228,184,99,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E4B863', fontWeight: 800 }}>N</div>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>夜航发卡</span>
          </div>
          <button className="btn-ghost" onClick={() => router.push('/')}>← 返回首页</button>
        </div>
      </nav>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
        <div className="glass glass-lg animate-fade-in" style={{ overflow: 'hidden', marginBottom: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
            <div style={{ position: 'relative', minHeight: '360px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {product.image ? (
                <img src={product.image} alt={product.name} style={{ maxWidth: '100%', maxHeight: '360px', objectFit: 'contain' }} />
              ) : (
                <div style={{ fontSize: '100px', opacity: 0.3 }}>🎁</div>
              )}
              <div style={{ position: 'absolute', top: '16px', left: '16px', padding: '6px 14px', background: product.stock > 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', border: `1px solid ${product.stock > 0 ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`, color: product.stock > 0 ? '#34d399' : '#f87171', borderRadius: '9999px', fontSize: '12px', fontWeight: 600, backdropFilter: 'blur(10px)' }}>
                {product.stock > 0 ? '现货充足' : '已售空'}
              </div>
            </div>

            <div style={{ padding: '32px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>{product.name}</h1>
              {product.category && (
                <div style={{ marginBottom: '16px' }}>
                  <span className="badge-gold">{product.category}</span>
                </div>
              )}
              <div style={{ background: 'rgba(228,184,99,0.06)', border: '1px solid rgba(228,184,99,0.15)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>商品价格</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                  <span className="price-gold" style={{ fontSize: '32px' }}><small>¥</small>{product.price}</span>
                  {product.original_price && product.original_price > product.price && (
                    <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through' }}>¥{product.original_price}</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', fontSize: '14px' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>库存：<span style={{ color: product.stock > 0 ? '#34d399' : '#f87171', fontWeight: 600 }}>{product.stock} 件</span></span>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>销量：<span style={{ color: '#fff', fontWeight: 600 }}>{product.sales || 0} 件</span></span>
              </div>
              {product.description && (
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, marginBottom: '24px' }}>{product.description}</p>
              )}
              <button className="btn-gold" style={{ width: '100%', padding: '14px', fontSize: '16px' }} disabled={product.stock <= 0} onClick={() => setShowBuy(true)}>
                {product.stock > 0 ? '立即购买' : '已售空'}
              </button>
            </div>
          </div>
        </div>

        {product.detail && (
          <div className="glass animate-fade-in" style={{ padding: '28px 32px' }}>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>商品详情</div>
            <div style={{ lineHeight: 1.8, fontSize: '15px', color: 'rgba(255,255,255,0.7)' }} dangerouslySetInnerHTML={{ __html: product.detail }} />
          </div>
        )}
      </div>

      {showBuy && (
        <div className="modal-overlay" onClick={() => !order && setShowBuy(false)}>
          <div className="modal-glass" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '28px 32px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{order ? '支付结果' : '确认下单'}</div>
              <div style={{ fontSize: '24px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }} onClick={() => { setShowBuy(false); setOrder(null); }}>×</div>
            </div>
            <div style={{ padding: '28px 32px' }}>
              {!order ? (
                <>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '16px', marginBottom: '20px' }}>
                    <div style={{ fontWeight: 600, color: '#fff', marginBottom: '8px' }}>{product.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                      <span>单价：¥{product.price}</span>
                      <span>库存：{product.stock}</span>
                    </div>
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>邮箱地址（用于接收卡密）</label>
                    <input type="email" className="input-glass" placeholder="请输入您的邮箱" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>购买数量</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <button className="btn-ghost" style={{ width: '40px', height: '40px', padding: 0, borderRadius: '12px' }} onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                      <span style={{ fontSize: '20px', fontWeight: 700, color: '#fff', minWidth: '40px', textAlign: 'center' }}>{quantity}</span>
                      <button className="btn-ghost" style={{ width: '40px', height: '40px', padding: 0, borderRadius: '12px' }} onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}>+</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(228,184,99,0.06)', border: '1px solid rgba(228,184,99,0.15)', borderRadius: '16px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>合计金额</span>
                    <span className="price-gold" style={{ fontSize: '24px' }}><small>¥</small>{(product.price * quantity).toFixed(2)}</span>
                  </div>
                  <button className="btn-gold" style={{ width: '100%', padding: '14px', fontSize: '16px' }} disabled={ordering} onClick={handleBuy}>
                    {ordering ? '处理中...' : `确认支付 ¥${(product.price * quantity).toFixed(2)}`}
                  </button>
                </>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '56px', marginBottom: '16px' }}>✅</div>
                  <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>支付成功</h3>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '20px' }}>订单号：{order.order_no || order.id}</p>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '20px' }}>卡密已发送至您的邮箱，也可在下方查看</p>
                  {order.cards && order.cards.length > 0 && (
                    <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '12px' }}>您的卡密：</div>
                      {order.cards.map((card, i) => (
                        <div key={i} style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.8)', wordBreak: 'break-all' }}>{card.card_content || card.content || card}</span>
                          <button className="btn-ghost" style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px', flexShrink: 0, marginLeft: '12px' }} onClick={() => copyCard(card.card_content || card.content || card)}>复制</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {(!order.cards || order.cards.length === 0) && (
                    <div style={{ padding: '20px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', marginBottom: '20px' }}>
                      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>卡密将在支付确认后自动发放，请在订单查询中查看</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ padding: '20px 32px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              {!order ? (
                <button className="btn-ghost" style={{ width: '100%' }} onClick={() => setShowBuy(false)}>取消</button>
              ) : (
                <button className="btn-gold" style={{ width: '100%' }} onClick={() => { setShowBuy(false); setOrder(null); router.push('/query'); }}>
                  订单查询
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
