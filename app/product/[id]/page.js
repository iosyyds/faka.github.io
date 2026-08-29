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
  const [contact, setContact] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [ordering, setOrdering] = useState(false);
  const [order, setOrder] = useState(null);
  const [payMethod, setPayMethod] = useState('alipay');
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadProduct();
    checkUser();
  }, [params.id]);

  const checkUser = () => {
    const token = localStorage.getItem('user_token');
    if (token) {
      fetch(`${API_BASE}/user/info`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => { if (data.user) setUser(data.user); })
        .catch(() => {});
    }
  };

  const loadProduct = async () => {
    try {
      const res = await fetch(`${API_BASE}/product/${params.id}`);
      const data = await res.json();
      setProduct(data.product || data.data || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async () => {
    if (!contact || contact.length < 5) {
      alert('请输入联系方式（不少于5位，仅数字或字母）');
      return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(contact)) {
      alert('联系方式只能包含数字或字母');
      return;
    }
    setOrdering(true);
    try {
      const token = localStorage.getItem('user_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/create-order`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          product_id: product.id,
          contact,
          quantity,
          pay_method: payMethod
        })
      });
      const data = await res.json();
      if (data.order || data.data) {
        setOrder(data.order || data.data);
      } else {
        alert(data.error || '下单失败');
      }
    } catch (e) {
      alert('下单失败，请重试');
    } finally {
      setOrdering(false);
    }
  };

  const copyCard = (text) => {
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板');
  };

  if (loading) {
    return (
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh'}}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container">
        <div className="empty">
          <div className="empty-icon">❌</div>
          <div className="empty-text">商品不存在</div>
          <button className="btn btn-primary" style={{marginTop: '16px'}} onClick={() => router.push('/')}>返回首页</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 精简导航 */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo" onClick={() => router.push('/')} style={{cursor:'pointer'}}>
            <div className="nav-logo-icon">N</div>
            <span>Nova Key</span>
          </div>
          <div className="nav-right">
            <button className="btn btn-secondary btn-sm" onClick={() => router.push('/')}>← 返回</button>
          </div>
        </div>
      </nav>

      <div className="container" style={{paddingTop: '12px', paddingBottom: '12px'}}>
        {/* 商品主区域 - 紧凑 */}
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
        }}>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0'}}>
            {/* 商品图片 - 去掉重复状态标签 */}
            <div style={{
              background: '#f9fafb',
              minHeight: '300px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {product.image ? (
                <img src={product.image} alt={product.name} style={{maxWidth: '100%', maxHeight: '300px', objectFit: 'contain'}} />
              ) : (
                <div style={{fontSize: '80px'}}>🎁</div>
              )}
            </div>

            {/* 商品信息 - 紧凑，减少留白 */}
            <div style={{padding: '20px'}}>
              <h1 style={{fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: '#1f2937'}}>
                {product.name}
              </h1>

              {product.category && (
                <div style={{marginBottom: '12px'}}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    background: '#ede9fe',
                    color: '#7c3aed',
                    fontSize: '12px',
                    borderRadius: '4px',
                    fontWeight: 500
                  }}>{product.category}</span>
                </div>
              )}

              {/* 价格 - 缩小，不再傻大 */}
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '8px',
                marginBottom: '12px'
              }}>
                <span style={{fontSize: '24px', fontWeight: 700, color: '#dc2626'}}>
                  <span style={{fontSize: '14px'}}>¥</span>{product.price}
                </span>
                {product.original_price && product.original_price > product.price && (
                  <span style={{fontSize: '13px', color: '#9ca3af', textDecoration: 'line-through'}}>
                    ¥{product.original_price}
                  </span>
                )}
              </div>

              {/* 库存销量 - 一行，缩小 */}
              <div style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '12px',
                fontSize: '13px',
                color: '#6b7280'
              }}>
                <span>库存：<span style={{fontWeight: 600, color: product.stock > 0 ? '#059669' : '#dc2626'}}>{product.stock} 件</span></span>
                <span>销量：<span style={{fontWeight: 600, color: '#1f2937'}}>{product.sales || 0} 件</span></span>
              </div>

              {/* 描述 - 短描述不占大块 */}
              {product.description && (
                <p style={{fontSize: '13px', color: '#6b7280', marginBottom: '16px', lineHeight: 1.6}}>
                  {product.description}
                </p>
              )}

              <button
                className="btn btn-primary"
                style={{width: '100%', fontSize: '15px', padding: '10px'}}
                disabled={product.stock <= 0}
                onClick={() => setShowBuy(true)}
              >
                {product.stock > 0 ? '立即购买' : '已售空'}
              </button>
            </div>
          </div>
        </div>

        {/* 商品详情 - 有内容才显示 */}
        {product.detail && (
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
          }}>
            <div style={{fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: '#1f2937'}}>商品详情</div>
            <div style={{lineHeight: 1.8, fontSize: '14px', color: '#4b5563'}} dangerouslySetInnerHTML={{__html: product.detail}} />
          </div>
        )}
      </div>

      {/* 购买弹窗 */}
      {showBuy && (
        <div className="modal-overlay" onClick={() => !order && setShowBuy(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{order ? '支付订单' : '确认下单'}</div>
              <div className="modal-close" onClick={() => { setShowBuy(false); setOrder(null); }}>×</div>
            </div>
            <div className="modal-body">
              {!order ? (
                <>
                  <div style={{
                    padding: '12px',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    marginBottom: '16px'
                  }}>
                    <div style={{fontWeight: 600, marginBottom: '6px', fontSize: '14px'}}>{product.name}</div>
                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#6b7280'}}>
                      <span>单价：¥{product.price}</span>
                      <span>库存：{product.stock}</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">联系方式（仅数字字母，不少于5位）</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="请输入联系方式"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">购买数量</label>
                    <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                      <span style={{fontSize: '16px', fontWeight: 600, minWidth: '40px', textAlign: 'center'}}>{quantity}</span>
                      <button className="btn btn-secondary btn-sm" onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}>+</button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">支付方式</label>
                    <div style={{display: 'flex', gap: '10px'}}>
                      <div
                        style={{
                          flex: 1,
                          padding: '10px',
                          border: '2px solid',
                          borderColor: payMethod === 'alipay' ? '#7c3aed' : '#e5e7eb',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          textAlign: 'center',
                          background: payMethod === 'alipay' ? '#f5f3ff' : 'transparent'
                        }}
                        onClick={() => setPayMethod('alipay')}
                      >
                        <div style={{fontSize: '20px'}}>💙</div>
                        <div style={{fontSize: '12px', marginTop: '4px'}}>支付宝</div>
                      </div>
                      <div
                        style={{
                          flex: 1,
                          padding: '10px',
                          border: '2px solid',
                          borderColor: payMethod === 'wechat' ? '#7c3aed' : '#e5e7eb',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          textAlign: 'center',
                          background: payMethod === 'wechat' ? '#f5f3ff' : 'transparent'
                        }}
                        onClick={() => setPayMethod('wechat')}
                      >
                        <div style={{fontSize: '20px'}}>💚</div>
                        <div style={{fontSize: '12px', marginTop: '4px'}}>微信支付</div>
                      </div>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '12px',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    marginTop: '16px'
                  }}>
                    <span style={{fontSize: '14px', color: '#6b7280'}}>合计</span>
                    <span style={{fontSize: '20px', fontWeight: 700, color: '#dc2626'}}>¥{(product.price * quantity).toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div style={{textAlign: 'center'}}>
                  <div style={{fontSize: '48px', marginBottom: '16px'}}>✅</div>
                  <h3 style={{fontSize: '20px', fontWeight: 700, marginBottom: '8px'}}>支付成功</h3>
                  <p style={{fontSize: '14px', color: '#6b7280', marginBottom: '20px'}}>
                    订单号：{order.order_no || order.id}
                  </p>
                  {order.cards && order.cards.length > 0 && (
                    <div style={{textAlign: 'left', marginBottom: '20px'}}>
                      <div style={{fontSize: '14px', fontWeight: 600, marginBottom: '12px'}}>您的卡密：</div>
                      {order.cards.map((card, i) => (
                        <div key={i} style={{
                          padding: '10px',
                          background: '#f9fafb',
                          borderRadius: '8px',
                          marginBottom: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span style={{fontSize: '13px', fontFamily: 'monospace', wordBreak: 'break-all'}}>{card.card_content || card.content || card}</span>
                          <button className="btn btn-secondary btn-sm" onClick={() => copyCard(card.card_content || card.content || card)}>复制</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {(!order.cards || order.cards.length === 0) && (
                    <div style={{padding: '16px', background: '#f9fafb', borderRadius: '8px', marginBottom: '20px'}}>
                      <p style={{fontSize: '14px', color: '#6b7280'}}>卡密将在支付确认后自动发放，请在订单查询中查看</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              {!order ? (
                <>
                  <button className="btn btn-secondary" onClick={() => setShowBuy(false)}>取消</button>
                  <button className="btn btn-primary" disabled={ordering} onClick={handleBuy}>
                    {ordering ? '处理中...' : `确认支付 ¥${(product.price * quantity).toFixed(2)}`}
                  </button>
                </>
              ) : (
                <button className="btn btn-primary" onClick={() => { setShowBuy(false); setOrder(null); router.push('/user'); }}>
                  查看我的订单
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
