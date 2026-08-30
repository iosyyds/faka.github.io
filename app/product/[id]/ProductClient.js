'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

export default function ProductClient({ product, settings }) {
  const router = useRouter();
  const [showBuy, setShowBuy] = useState(false);
  const [email, setEmail] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [ordering, setOrdering] = useState(false);
  const [order, setOrder] = useState(null);

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
        body: JSON.stringify({ product_id: product.id, email, quantity, pay_method: 'alipay' })
      });
      const data = await res.json();
      if (data.order || data.data) {
        const ord = data.order || data.data;
        setOrder(ord);
        if (data.pay_url) {
          window.open(data.pay_url, '_blank');
        } else {
          setTimeout(() => {
            fetch(`${API_BASE}/query-order?order_no=${ord.order_no || ord.id}&email=${email}`)
              .then(r => r.json())
              .then(d => { if (d.order || d.data) setOrder(d.order || d.data); });
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

  return (
    <div>
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo" onClick={() => router.push('/')} style={{cursor:'pointer'}}>
            {settings?.site_logo ? (
              <img src={settings.site_logo} alt="Logo" style={{width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover'}} />
            ) : (
              <div className="nav-logo-icon">{settings?.logo_text || '甜'}</div>
            )}
            <span>{settings?.site_name || '甜甜发卡'}</span>
          </div>
          <div className="nav-right">
            <button className="btn btn-secondary btn-sm" onClick={() => router.push('/')}>← 返回首页</button>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="card" style={{marginBottom: '20px', overflow: 'hidden'}}>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0'}}>
            <div style={{background: '#f9fafb', minHeight: '360px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'}}>
              {product.image ? (
                <img src={product.image} alt={product.name} style={{maxWidth: '100%', maxHeight: '360px', objectFit: 'contain'}} />
              ) : (
                <div style={{fontSize: '96px', opacity: 0.3}}>🎁</div>
              )}
              <div className="badge" style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                background: product.stock > 0 ? '#d1fae5' : '#fee2e2',
                color: product.stock > 0 ? '#065f46' : '#991b1b'
              }}>
                {product.stock > 0 ? `库存充足 (${product.stock})` : '已售空'}
              </div>
            </div>
            <div style={{padding: '28px'}}>
              <h1 style={{fontSize: '22px', fontWeight: 600, color: '#111827', marginBottom: '10px', letterSpacing: '-0.01em'}}>{product.name}</h1>
              {product.category && (
                <div style={{marginBottom: '16px'}}>
                  <span className="badge badge-primary">{product.category}</span>
                </div>
              )}
              <div style={{background: '#f9fafb', borderRadius: '8px', padding: '16px', marginBottom: '20px'}}>
                <div style={{fontSize: '13px', color: '#6b7280', marginBottom: '4px'}}>商品价格</div>
                <div style={{display: 'flex', alignItems: 'baseline', gap: '10px'}}>
                  <span className="price-primary" style={{fontSize: '28px'}}><span style={{fontSize: '16px'}}>¥</span>{product.price}</span>
                  {product.original_price && product.original_price > product.price && (
                    <span style={{fontSize: '14px', color: '#9ca3af', textDecoration: 'line-through'}}>¥{product.original_price}</span>
                  )}
                </div>
              </div>
              <div style={{display: 'flex', gap: '24px', marginBottom: '20px', fontSize: '14px'}}>
                <span style={{color: '#6b7280'}}>库存：<span style={{color: product.stock > 0 ? '#059669' : '#dc2626', fontWeight: 600}}>{product.stock} 件</span></span>
                <span style={{color: '#6b7280'}}>销量：<span style={{color: '#111827', fontWeight: 600}}>{product.sales || 0} 件</span></span>
              </div>
              {product.description && (
                <p style={{fontSize: '14px', color: '#4b5563', lineHeight: 1.7, marginBottom: '24px'}}>{product.description}</p>
              )}
              <button className="btn btn-primary btn-lg" style={{width: '100%'}} disabled={product.stock <= 0} onClick={() => setShowBuy(true)}>
                {product.stock > 0 ? '立即购买' : '已售空'}
              </button>
            </div>
          </div>
        </div>
        {product.detail && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">商品详情</div>
            </div>
            <div className="card-body" style={{lineHeight: 1.8, fontSize: '15px', color: '#4b5563'}} dangerouslySetInnerHTML={{__html: product.detail}} />
          </div>
        )}
      </div>

      {showBuy && (
        <div className="modal-overlay" onClick={() => { setShowBuy(false); setOrder(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{order ? '支付结果' : '确认下单'}</div>
              <div className="modal-close" onClick={() => { setShowBuy(false); setOrder(null); }}>×</div>
            </div>
            <div className="modal-body">
              {!order ? (
                <>
                  <div style={{padding: '14px', background: '#f9fafb', borderRadius: '8px', marginBottom: '18px'}}>
                    <div style={{fontWeight: 600, color: '#111827', marginBottom: '6px'}}>{product.name}</div>
                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#6b7280'}}>
                      <span>单价：¥{product.price}</span>
                      <span>库存：{product.stock}</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">邮箱地址（用于接收卡密）</label>
                    <input type="email" className="form-input" placeholder="请输入您的邮箱" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">购买数量</label>
                    <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                      <span style={{fontSize: '18px', fontWeight: 600, color: '#111827', minWidth: '40px', textAlign: 'center'}}>{quantity}</span>
                      <button className="btn btn-secondary btn-sm" onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}>+</button>
                    </div>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: '#eff6ff', borderRadius: '8px', marginBottom: '18px'}}>
                    <span style={{fontSize: '14px', color: '#4b5563'}}>合计金额</span>
                    <span className="price-primary" style={{fontSize: '20px'}}><span style={{fontSize: '14px'}}>¥</span>{(product.price * quantity).toFixed(2)}</span>
                  </div>
                  <button className="btn btn-primary btn-lg" style={{width: '100%'}} disabled={ordering} onClick={handleBuy}>
                    {ordering ? '处理中...' : `确认支付 ¥${(product.price * quantity).toFixed(2)}`}
                  </button>
                </>
              ) : (
                <div style={{textAlign: 'center'}}>
                  <div style={{fontSize: '48px', marginBottom: '12px'}}>✅</div>
                  <h3 style={{fontSize: '20px', fontWeight: 600, color: '#111827', marginBottom: '6px'}}>支付成功</h3>
                  <p style={{fontSize: '14px', color: '#6b7280', marginBottom: '18px'}}>订单号：{order.order_no || order.id}</p>
                  <p style={{fontSize: '13px', color: '#9ca3af', marginBottom: '18px'}}>卡密已发送至您的邮箱，也可在下方查看</p>
                  {order.cards && order.cards.length > 0 && (
                    <div style={{textAlign: 'left', marginBottom: '18px'}}>
                      <div style={{fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '10px'}}>您的卡密：</div>
                      {order.cards.map((card, i) => (
                        <div key={i} style={{padding: '12px 14px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <span className="mono" style={{fontSize: '13px', color: '#2563eb', wordBreak: 'break-all'}}>{card.card_content || card.content || card}</span>
                          <button className="btn btn-secondary btn-sm" style={{flexShrink: 0, marginLeft: '10px'}} onClick={() => copyCard(card.card_content || card.content || card)}>复制</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {(!order.cards || order.cards.length === 0) && (
                    <div style={{padding: '16px', background: '#f9fafb', borderRadius: '8px', marginBottom: '18px'}}>
                      <p style={{fontSize: '14px', color: '#6b7280'}}>卡密将在支付确认后自动发放，请在订单查询中查看</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              {!order ? (
                <button className="btn btn-secondary" onClick={() => setShowBuy(false)}>取消</button>
              ) : (
                <button className="btn btn-primary" onClick={() => { setShowBuy(false); setOrder(null); router.push('/query'); }}>
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
