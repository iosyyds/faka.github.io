'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

export default function ProductDetail() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImg, setCurrentImg] = useState(0);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [orderContact, setOrderContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [user, setUser] = useState(null);
  const pollTimerRef = useRef(null);
  const qrRef = useRef(null);

  useEffect(() => {
    loadProduct();
    checkLogin();
    return () => { if (pollTimerRef.current) clearInterval(pollTimerRef.current); };
  }, [params.id]);

  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 2500); };

  const checkLogin = () => {
    const token = localStorage.getItem('user_token');
    const userInfo = localStorage.getItem('user_info');
    if (token && userInfo) {
      try { setUser(JSON.parse(userInfo)); } catch {}
    }
  };

  const loadProduct = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/product/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setProduct(data.product);
        document.title = data.product.name;
      } else {
        showToast(data.message || '商品不存在', 'error');
        setTimeout(() => router.push('/'), 1500);
      }
    } catch (e) {
      showToast('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getProductImages = () => {
    if (!product) return [];
    const imgs = [];
    if (product.image) imgs.push(product.image);
    if (product.images) {
      try {
        const parsed = JSON.parse(product.images);
        if (Array.isArray(parsed)) imgs.push(...parsed);
      } catch {
        if (product.images.includes(',')) {
          imgs.push(...product.images.split(',').filter(Boolean));
        }
      }
    }
    if (imgs.length === 0) {
      const colors = ['#667eea', '#f5576c', '#4facfe', '#43e97b'];
      const c = colors[product.id % colors.length];
      imgs.push(`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect fill="${c}" width="800" height="600"/><text x="50%" y="50%" font-size="80" fill="white" text-anchor="middle" dominant-baseline="middle">🎁</text></svg>`)}`);
    }
    return imgs;
  };

  const submitOrder = async () => {
    if (!product) return;
    const contact = orderContact.trim();
    if (!contact) { showToast('请输入联系方式', 'warning'); return; }
    if (contact.length < 5) { showToast('联系方式不少于5位', 'warning'); return; }
    if (!/^[a-zA-Z0-9]+$/.test(contact)) { showToast('联系方式只能是数字或字母', 'warning'); return; }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('user_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/create-order`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ productId: product.id, quantity: 1, contact })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentOrder(data.order);
        setShowOrderModal(false);
        setShowQrModal(true);
        setTimeout(() => {
          if (qrRef.current && window.QRCode) {
            qrRef.current.innerHTML = '';
            new window.QRCode(qrRef.current, { text: data.qrCode, width: 200, height: 200, correctLevel: window.QRCode.CorrectLevel.H });
          }
        }, 100);
        startPolling(data.order.order_no);
      } else showToast(data.message || '创建订单失败', 'error');
    } catch (e) { showToast('网络错误', 'error'); } finally { setSubmitting(false); }
  };

  const startPolling = (orderNo) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/query-order?orderNo=${orderNo}`);
        const data = await res.json();
        if (data.success && data.order.status === 'paid') {
          clearInterval(pollTimerRef.current);
          setShowQrModal(false);
          setCurrentOrder(data.order);
          setShowSuccess(true);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } catch (e) { console.error(e); }
    }, 3000);
  };

  const closeQr = () => { if (pollTimerRef.current) clearInterval(pollTimerRef.current); setShowQrModal(false); setCurrentOrder(null); };

  const esc = (t) => { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f9ff' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading" style={{ width: 40, height: 40, margin: '0 auto 16px' }}></div>
          <p style={{ color: '#8c8c8c' }}>加载中...</p>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const images = getProductImages();

  return (
    <>
      <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>

      {/* 顶部导航 */}
      <nav className="dc-topbar">
        <div className="dc-topbar-inner">
          <div className="dc-topbar-left">
            <a href="/" className="dc-topbar-logo">
              <div className="dc-topbar-logo-icon">DC</div>
              <div className="dc-topbar-logo-text">
                <div className="dc-topbar-title">DCSHOP多财商城</div>
                <div className="dc-topbar-sub">订单问题请查看买家帮助</div>
              </div>
            </a>
          </div>
          <div className="dc-topbar-right">
            <a href="/" className="dc-topbar-btn">返回首页</a>
          </div>
        </div>
      </nav>

      <div className="dc-container" style={{ paddingBottom: 80 }}>
        {/* 商品主信息 */}
        <div className="dc-detail-main">
          {/* 图片轮播 */}
          <div className="dc-detail-gallery">
            <div className="dc-detail-img-main">
              <img src={images[currentImg]} alt={product.name} />
              {images.length > 1 && (
                <>
                  <span className="dc-detail-img-arrow left" onClick={() => setCurrentImg((currentImg - 1 + images.length) % images.length)}>‹</span>
                  <span className="dc-detail-img-arrow right" onClick={() => setCurrentImg((currentImg + 1) % images.length)}>›</span>
                </>
              )}
              <span className="dc-detail-img-count">{currentImg + 1}/{images.length}</span>
            </div>
            {images.length > 1 && (
              <div className="dc-detail-thumbs">
                {images.map((img, i) => (
                  <div key={i} className={`dc-detail-thumb ${currentImg === i ? 'active' : ''}`} onClick={() => setCurrentImg(i)}>
                    <img src={img} alt="" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 商品信息 */}
          <div className="dc-detail-info">
            <h1 className="dc-detail-title">{esc(product.name)}</h1>
            <p className="dc-detail-desc">{esc(product.description || '暂无商品描述')}</p>
            <div className="dc-detail-price-box">
              <div className="dc-detail-price">
                <span className="dc-detail-price-label">价格</span>
                <span className="dc-detail-price-now">¥{Number(product.price).toFixed(2)}</span>
                {product.original_price && product.original_price > product.price && (
                  <span className="dc-detail-price-old">¥{Number(product.original_price).toFixed(2)}</span>
                )}
              </div>
              <div className="dc-detail-meta">
                <span>销量 {product.sales || 0}</span>
                <span>库存 {product.stock}</span>
                <span>分类 {esc(product.category)}</span>
              </div>
            </div>
            <div className="dc-detail-tags">
              <span className="dc-detail-tag">✅ 官方正版</span>
              <span className="dc-detail-tag">⚡ 自动发货</span>
              <span className="dc-detail-tag">🛡️ 安全可靠</span>
              <span className="dc-detail-tag">💬 售后无忧</span>
            </div>
            <div className="dc-detail-buy">
              <button
                className="dc-detail-btn dc-detail-btn-primary"
                disabled={product.stock <= 0}
                onClick={() => { if (product.stock > 0) { setOrderContact(''); setShowOrderModal(true); } }}
              >
                {product.stock > 0 ? '立即购买' : '已售空'}
              </button>
              <button className="dc-detail-btn dc-detail-btn-secondary" onClick={() => router.push('/')}>返回首页</button>
            </div>
            {user && (
              <div className="dc-detail-user">
                <span>👤 已登录：{user.nickname || user.username}</span>
                <span>💰 余额：¥{Number(user.balance || 0).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* 商品详情 */}
        <div className="dc-detail-content">
          <div className="dc-detail-content-title">
            <span className="dc-detail-content-line"></span>
            <h2>商品详情</h2>
            <span className="dc-detail-content-line"></span>
          </div>
          <div className="dc-detail-content-body">
            {product.detail ? (
              <div dangerouslySetInnerHTML={{ __html: product.detail }} />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8c8c8c' }}>
                <p style={{ fontSize: 48, marginBottom: 16 }}>📦</p>
                <p>暂无商品详情</p>
                <p style={{ fontSize: 13, marginTop: 8 }}>支付成功后将自动发货，请在订单中查看卡密</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部导航栏（移动端） */}
      <nav className="dc-bottom-nav">
        <a href="/" className="dc-bottom-nav-item">
          <span className="dc-bottom-nav-icon">🏠</span>
          <span className="dc-bottom-nav-text">首页</span>
        </a>
        <a href="/#category" className="dc-bottom-nav-item">
          <span className="dc-bottom-nav-icon">📋</span>
          <span className="dc-bottom-nav-text">分类</span>
        </a>
        <a href="/user" className="dc-bottom-nav-item">
          <span className="dc-bottom-nav-icon">📄</span>
          <span className="dc-bottom-nav-text">查单</span>
        </a>
        <a href="/user" className="dc-bottom-nav-item">
          <span className="dc-bottom-nav-icon">👤</span>
          <span className="dc-bottom-nav-text">我的</span>
        </a>
      </nav>

      {/* 下单弹窗 */}
      {showOrderModal && (
        <div className="dc-modal" onClick={(e) => e.target === e.currentTarget && setShowOrderModal(false)}>
          <div className="dc-modal-box">
            <span className="dc-modal-close" onClick={() => setShowOrderModal(false)}>&times;</span>
            <h3 className="dc-modal-title">{product.name}</h3>
            <div className="dc-modal-amount">¥{Number(product.price).toFixed(2)}</div>
            <div className="dc-form-group">
              <label>联系方式 (数字或字母，不少于5位)</label>
              <input type="text" placeholder="请输入5位以上数字或字母" value={orderContact} onChange={(e) => setOrderContact(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && submitOrder()} />
            </div>
            <div className="dc-form-group">
              <label>支付方式</label>
              <div className="dc-pay-channels">
                <div className="dc-pay-channel active">💙 支付宝</div>
                <div className="dc-pay-channel disabled">💚 微信支付</div>
              </div>
            </div>
            <button className="dc-submit" onClick={submitOrder} disabled={submitting}>{submitting ? '创建订单中...' : '立即支付购买'}</button>
          </div>
        </div>
      )}

      {/* 二维码弹窗 */}
      {showQrModal && (
        <div className="dc-modal">
          <div className="dc-modal-box dc-qr-box">
            <span className="dc-modal-close" onClick={closeQr}>&times;</span>
            <h3 className="dc-modal-title">{product.name}</h3>
            <div className="dc-modal-amount">¥{currentOrder ? Number(currentOrder.amount).toFixed(2) : '0.00'}</div>
            <div className="dc-qr-wrap"><div ref={qrRef} style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="loading"></span></div></div>
            <p className="dc-qr-tip">请使用支付宝扫码支付，支付成功后将自动跳转</p>
            <p className="dc-order-no">订单号：{currentOrder?.order_no}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="dc-btn dc-btn-primary" style={{ flex: 1 }} onClick={() => currentOrder && startPolling(currentOrder.order_no)}>我已完成支付</button>
              <button className="dc-btn dc-btn-secondary" style={{ flex: 1 }} onClick={closeQr}>取消支付</button>
            </div>
          </div>
        </div>
      )}

      {/* 支付成功 */}
      {showSuccess && (
        <div className="dc-modal" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="dc-modal-box" style={{ maxWidth: 420 }}>
            <div className="dc-success-icon" style={{ margin: '0 auto 16px' }}>✓</div>
            <h2 style={{ fontSize: 20, marginBottom: 8 }}>支付成功 · 卡密已发放</h2>
            <p style={{ fontSize: 13, color: '#8c8c8c', marginBottom: 20 }}>请妥善保管以下卡密</p>
            <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 20 }}>
              {currentOrder?.cards?.map((c, i) => (
                <div key={i} style={{ background: '#f5f7fa', borderRadius: 8, padding: 12, marginBottom: 8, textAlign: 'left' }}>
                  <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>卡密 {i + 1}</div>
                  <div style={{ fontSize: 13, fontFamily: 'monospace', wordBreak: 'break-all', userSelect: 'all' }}>{esc(c.card_content)}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="dc-btn dc-btn-primary" style={{ flex: 1 }} onClick={() => { navigator.clipboard.writeText(currentOrder?.cards?.map((c, i) => `卡密${i + 1}：${c.card_content}`).join('\n') || ''); showToast('已复制', 'success'); }}>复制全部</button>
              <button className="dc-btn dc-btn-secondary" style={{ flex: 1 }} onClick={() => router.push('/user')}>查看订单</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`dc-toast ${toast.type}`}>{toast.message}</div>}
    </>
  );
}
