'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({});
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [showBuy, setShowBuy] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [email, setEmail] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [ordering, setOrdering] = useState(false);
  const [order, setOrder] = useState(null);
  const [payMethod, setPayMethod] = useState('alipay');
  const [qrCode, setQrCode] = useState(null);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prodRes, setRes] = await Promise.all([
        fetch(`${API_BASE}/products`),
        fetch(`${API_BASE}/settings`)
      ]);
      const prodData = await prodRes.json();
      const setData = await setRes.json();
      setProducts(prodData.products || prodData.data || []);
      setSettings(setData.settings || setData.data || {});
      const cats = [...new Set((prodData.products || prodData.data || []).map(p => p.category).filter(Boolean))];
      setCategories(cats);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filteredProducts = products.filter(p => {
    if (activeCategory !== 'all' && p.category !== activeCategory) return false;
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openBuy = (product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setOrder(null);
    setShowBuy(true);
  };

  const handleBuy = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('请输入有效的邮箱地址');
      return;
    }
    setOrdering(true);
    setQrCode(null);
    try {
      const res = await fetch(`${API_BASE}/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: selectedProduct.id, email, quantity, pay_method: payMethod })
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrder(data.order);
        if (data.qr_code) {
          setQrCode(data.qr_code);
          // 开始轮询订单状态
          startPolling(data.order.order_no, email);
        }
      } else {
        alert(data.message || data.error || '下单失败');
      }
    } catch (e) {
      alert('下单失败，请重试');
    }
    finally { setOrdering(false); }
  };

  // 轮询订单状态
  const startPolling = (orderNo, email) => {
    setPolling(true);
    let attempts = 0;
    const maxAttempts = 60; // 最多轮询5分钟
    const interval = setInterval(async () => {
      attempts++;
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setPolling(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/query-order?order_no=${orderNo}&email=${email}`);
        const data = await res.json();
        const ord = data.order || data.data;
        if (ord && (ord.status === 'paid' || ord.status === 'success')) {
          clearInterval(interval);
          setPolling(false);
          setOrder(ord);
          setQrCode(null);
        }
      } catch (e) {
        console.error('轮询失败:', e);
      }
    }, 3000);
  };

  const copyCard = (text) => {
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板');
  };

  if (!mounted) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e5e7eb',
          borderTopColor: '#2563eb',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '16px'
        }}></div>
        <div style={{fontSize: '14px', color: '#6b7280'}}>加载中...</div>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{minHeight: '100vh', background: '#f8fafc'}}>
      {/* 导航栏 - PC端一行，手机端两行 */}
      <nav className="nav-responsive">
        <div className="nav-inner-responsive">
          {/* Logo */}
          <div className="nav-logo-responsive" onClick={() => router.push('/')}>
            {settings.site_logo ? (
              <img src={settings.site_logo} alt="Logo" className="nav-logo-img-responsive" />
            ) : (
              <div className="nav-logo-icon-responsive">N</div>
            )}
            <span className="nav-logo-text-responsive">{settings.site_name || '甜甜发卡'}</span>
          </div>

          {/* 搜索框 - PC端显示 */}
          <div className="nav-search-responsive">
            <span className="nav-search-icon-responsive">🔍</span>
            <input
              type="text"
              placeholder="搜索商品..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="nav-search-input-responsive"
            />
          </div>

          {/* 右侧按钮 */}
          <div className="nav-right-responsive">
            <button className="btn-secondary-responsive" onClick={() => router.push('/query')}>订单查询</button>
            <button className="btn-primary-responsive" onClick={() => router.push('/admin')}>管理后台</button>
          </div>

          {/* 搜索框 - 手机端显示（独占一行） */}
          <div className="nav-search-mobile-responsive">
            <span className="nav-search-icon-responsive">🔍</span>
            <input
              type="text"
              placeholder="搜索商品..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="nav-search-input-responsive"
            />
          </div>
        </div>
      </nav>

      <div className="container-responsive">
        {/* 顶部公告横幅 */}
        <div className="top-banner-responsive">
          <div className="top-banner-icon-responsive">📢</div>
          <div className="top-banner-content-responsive">
            {settings.notice || settings.announcement || '欢迎来到甜甜发卡，24小时自动发货，秒发卡密！'}
          </div>
        </div>

        {/* 分类标签 */}
        <div className="category-tabs-responsive">
          <div
            className={`category-tab-responsive ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >全部商品</div>
          {categories.map((cat, i) => (
            <div
              key={i}
              className={`category-tab-responsive ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >{cat}</div>
          ))}
        </div>

        {/* 商品网格 - PC端多列，手机端两列 */}
        {loading ? (
          <div className="empty-responsive">
            <div style={{fontSize: '32px', marginBottom: '12px'}}>⏳</div>
            加载中...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-card-responsive">
            <div style={{fontSize: '48px', marginBottom: '12px', opacity: 0.5}}>📦</div>
            <div style={{fontSize: '14px', color: '#6b7280'}}>暂无商品</div>
          </div>
        ) : (
          <div className="product-grid-responsive">
            {filteredProducts.map((p, i) => (
              <div key={p.id} className="product-card-responsive" onClick={() => openBuy(p)}>
                {/* 商品图片 */}
                <div className="product-card-img-responsive">
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="product-card-image-responsive" />
                  ) : (
                    <div className="product-card-placeholder-responsive">🎁</div>
                  )}
                </div>

                {/* 商品信息 */}
                <div className="product-card-body-responsive">
                  <div className="product-card-name-responsive">{p.name}</div>

                  <div className="product-card-price-row-responsive">
                    <span className="product-card-price-responsive">
                      <span className="product-card-price-symbol-responsive">¥</span>{p.price}
                    </span>
                    {p.original_price && p.original_price > p.price && (
                      <span className="product-card-original-price-responsive">¥{p.original_price}</span>
                    )}
                    <span className={`product-card-stock-responsive ${p.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                      {p.stock > 0 ? `剩${p.stock}` : '售空'}
                    </span>
                  </div>

                  <div className="product-card-sales-responsive">已售 {p.sales || 0}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 页脚 */}
      <footer className="footer-responsive">
        <div className="footer-inner-responsive">
          <div className="footer-top-responsive">
            <div className="footer-left-responsive">
              <div className="footer-brand-responsive">{settings.site_name || '甜甜发卡'}</div>
              <div className="footer-desc-responsive">本站仅出售合规虚拟商品，下单即视为同意服务条款。</div>
            </div>
            <div className="footer-right-responsive">
              <a href="#" className="footer-link-responsive">服务条款</a>
              <a href="#" className="footer-link-responsive">隐私政策</a>
              <a href="/query" className="footer-link-responsive">订单查询</a>
            </div>
          </div>
          <div className="footer-bottom-responsive">
            © {new Date().getFullYear()} {settings.site_name || '甜甜发卡'}. Powered by Next.js
            {settings.icp && <span style={{marginLeft: '12px'}}>{settings.icp}</span>}
          </div>
        </div>
      </footer>

      {/* 购买弹窗 */}
      {showBuy && selectedProduct && (
        <div className="modal-overlay-responsive">
          <div className="modal-responsive" onClick={(e) => e.stopPropagation()}>
            {/* 弹窗头部 */}
            <div className="modal-header-responsive">
              <div className="modal-title-responsive">
                {order ? (
                  <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <span style={{color: '#059669'}}>✓</span> 支付结果
                  </span>
                ) : (
                  <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <span>🛒</span> 确认订单
                  </span>
                )}
              </div>
              <div className="modal-close-responsive" onClick={() => { setShowBuy(false); setOrder(null); setQrCode(null); }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </div>
            </div>

            <div className="modal-body-responsive">
              {/* 支付二维码页面 */}
              {qrCode && order && order.status === 'pending' ? (
                <div style={{textAlign: 'center', padding: '10px 0'}}>
                  <div style={{fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '6px'}}>请使用支付宝扫码支付</div>
                  <div style={{fontSize: '13px', color: '#6b7280', marginBottom: '16px'}}>
                    订单号：<span style={{fontFamily: 'monospace'}}>{order.order_no}</span>
                  </div>
                  <div style={{
                    width: '200px',
                    height: '200px',
                    margin: '0 auto 16px',
                    padding: '12px',
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrCode)}`}
                      alt="支付二维码"
                      style={{width: '180px', height: '180px'}}
                    />
                  </div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#1e40af',
                    marginBottom: '12px'
                  }}>
                    <span style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid #1e40af',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }}></span>
                    等待支付中...
                  </div>
                  <div style={{fontSize: '18px', fontWeight: 700, color: '#dc2626', marginBottom: '8px'}}>
                    ¥{order.amount}
                  </div>
                  <div style={{fontSize: '12px', color: '#9ca3af'}}>
                    支付成功后将自动发货，卡密发送至 {email}
                  </div>
                </div>
              ) : !order ? (
                <>
                  {/* 商品信息卡片 */}
                  <div className="modal-product-card-responsive">
                    <div className="modal-product-img-responsive">
                      {selectedProduct.image ? (
                        <img src={selectedProduct.image} alt={selectedProduct.name} />
                      ) : (
                        <span>🎁</span>
                      )}
                    </div>
                    <div className="modal-product-detail-responsive">
                      <div className="modal-product-name-responsive">{selectedProduct.name}</div>
                      <div className="modal-product-meta-responsive">
                        <span className="modal-product-price-responsive">
                          <span className="modal-product-price-symbol-responsive">¥</span>
                          {selectedProduct.price}
                        </span>
                        {selectedProduct.original_price && selectedProduct.original_price > selectedProduct.price && (
                          <span className="modal-product-original-price-responsive">¥{selectedProduct.original_price}</span>
                        )}
                      </div>
                      <div className="modal-product-stock-responsive">
                        <span className={`stock-dot-responsive ${selectedProduct.stock > 0 ? 'in-stock' : 'out-stock'}`}></span>
                        {selectedProduct.stock > 0 ? `库存充足 (${selectedProduct.stock}件)` : '已售空'}
                      </div>
                    </div>
                  </div>

                  {/* 邮箱输入 */}
                  <div className="form-group-responsive">
                    <label className="form-label-responsive">
                      <span style={{marginRight: '4px'}}>📧</span>
                      邮箱地址
                      <span style={{color: '#9ca3af', fontWeight: 400, marginLeft: '6px'}}>用于接收卡密</span>
                    </label>
                    <div className="input-wrapper-responsive">
                      <span className="input-icon-responsive">✉️</span>
                      <input
                        type="email"
                        placeholder="请输入您的邮箱地址"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="form-input-with-icon-responsive"
                      />
                    </div>
                  </div>

                  {/* 购买数量 */}
                  <div className="form-group-responsive">
                    <label className="form-label-responsive">
                      <span style={{marginRight: '4px'}}>📦</span>
                      购买数量
                    </label>
                    <div className="quantity-selector-responsive">
                      <button className="quantity-btn-responsive" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                      </button>
                      <span className="quantity-value-responsive">{quantity}</span>
                      <button className="quantity-btn-responsive" onClick={() => setQuantity(Math.min(selectedProduct.stock, quantity + 1))}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                      </button>
                      <span style={{marginLeft: '12px', fontSize: '13px', color: '#9ca3af', alignSelf: 'center', lineHeight: '38px', height: '38px', display: 'flex', alignItems: 'center'}}>最多可买 {selectedProduct.stock} 件</span>
                    </div>
                  </div>

                  {/* 支付方式 */}
                  <div className="form-group-responsive">
                    <label className="form-label-responsive">
                      <span style={{marginRight: '4px'}}>💳</span>
                      支付方式
                    </label>
                    <div className="pay-methods-responsive">
                      <div
                        className={`pay-method-item-responsive ${payMethod === 'alipay' ? 'active' : ''}`}
                        onClick={() => setPayMethod('alipay')}
                      >
                        <span className="pay-icon-responsive" style={{background: '#1677ff'}}>支</span>
                        <span className="pay-name-responsive">支付宝</span>
                        <span className="pay-check-responsive">{payMethod === 'alipay' && '✓'}</span>
                      </div>
                      <div
                        className="pay-method-item-responsive disabled"
                        style={{opacity: 0.5, cursor: 'not-allowed'}}
                      >
                        <span className="pay-icon-responsive" style={{background: '#07c160'}}>微</span>
                        <span className="pay-name-responsive">微信支付</span>
                        <span style={{fontSize: '11px', color: '#9ca3af'}}>暂未开通</span>
                      </div>
                    </div>
                  </div>

                  {/* 合计金额 */}
                  <div className="modal-total-responsive">
                    <div className="modal-total-left-responsive">
                      <span className="modal-total-label-responsive">合计金额</span>
                      <span className="modal-total-count-responsive">共 {quantity} 件</span>
                    </div>
                    <div className="modal-total-right-responsive">
                      <span className="modal-total-symbol-responsive">¥</span>
                      <span className="modal-total-price-responsive">{(selectedProduct.price * quantity).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* 按钮组 */}
                  <div className="modal-buttons-responsive">
                    <button
                      className="modal-cancel-inline-responsive"
                      onClick={() => setShowBuy(false)}
                    >
                      取消
                    </button>
                    <button
                      onClick={handleBuy}
                      disabled={ordering || selectedProduct.stock <= 0}
                      className="modal-submit-responsive"
                    >
                      {ordering ? (
                        <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                          <span className="btn-spinner-responsive"></span>
                          处理中...
                        </span>
                      ) : (
                        <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                          🔒 立即支付
                        </span>
                      )}
                    </button>
                  </div>

                  {/* 安全提示 */}
                  <div className="security-tip-responsive">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink: 0}}>
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                    <span>支付成功后自动发货，卡密将发送至您的邮箱</span>
                  </div>
                </>
              ) : (
                <div style={{textAlign: 'center'}}>
                  <div className="success-icon-responsive">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <h3 style={{fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '6px'}}>支付成功</h3>
                  <p style={{fontSize: '13px', color: '#6b7280', marginBottom: '16px'}}>
                    订单号：<span style={{fontFamily: 'monospace', color: '#111827'}}>{order.order_no || order.id}</span>
                  </p>

                  {/* 订单信息 */}
                  <div className="order-info-responsive">
                    <div className="order-info-row-responsive">
                      <span>商品名称</span>
                      <span style={{fontWeight: 500, color: '#111827'}}>{order.product_name}</span>
                    </div>
                    <div className="order-info-row-responsive">
                      <span>支付金额</span>
                      <span style={{fontWeight: 600, color: '#2563eb'}}>¥{order.amount || order.total}</span>
                    </div>
                    <div className="order-info-row-responsive">
                      <span>接收邮箱</span>
                      <span style={{color: '#111827'}}>{email}</span>
                    </div>
                  </div>

                  <div className="email-tip-responsive">
                    <span>📧</span>
                    <span>卡密已发送至您的邮箱，也可在下方查看复制</span>
                  </div>

                  {order.cards && order.cards.length > 0 && (
                    <div style={{textAlign: 'left', marginBottom: '16px'}}>
                      <div style={{fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '10px'}}>
                        🎫 您的卡密 ({order.cards.length}条)
                      </div>
                      {order.cards.map((card, i) => (
                        <div key={i} className="card-item-responsive">
                          <span className="card-index-responsive">{i + 1}</span>
                          <span className="card-content-responsive">{card.card_content || card.content || card}</span>
                          <button className="card-copy-btn-responsive" onClick={() => copyCard(card.card_content || card.content || card)}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}>
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            复制
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {(!order.cards || order.cards.length === 0) && (
                    <div style={{padding: '14px', background: '#f9fafb', borderRadius: '8px', marginBottom: '16px'}}>
                      <p style={{fontSize: '13px', color: '#6b7280'}}>卡密将在支付确认后自动发放，请在订单查询中查看</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer-responsive">
              {qrCode && order && order.status === 'pending' ? (
                <button className="modal-cancel-btn-responsive" onClick={() => { setShowBuy(false); setQrCode(null); setOrder(null); }}>
                  取消支付
                </button>
              ) : order && order.status === 'paid' ? (
                <div style={{display: 'flex', gap: '10px', width: '100%'}}>
                  <button className="modal-cancel-btn-responsive" style={{flex: 1}} onClick={() => { setShowBuy(false); setOrder(null); setQrCode(null); }}>
                    关闭
                  </button>
                  <button className="modal-query-btn-responsive" style={{flex: 1}} onClick={() => { setShowBuy(false); setOrder(null); setQrCode(null); router.push('/query'); }}>
                    📋 订单查询
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* 导航栏 */
        .nav-responsive {
          background: #fff;
          border-bottom: 1px solid #e5e7eb;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .nav-inner-responsive {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          min-height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .nav-logo-responsive {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          flex-shrink: 0;
        }
        .nav-logo-icon-responsive {
          width: 36px;
          height: 36px;
          background: #2563eb;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 700;
          font-size: 16px;
        }
        .nav-logo-img-responsive {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          object-fit: cover;
        }
        .nav-logo-text-responsive {
          font-size: 18px;
          font-weight: 700;
          color: #111827;
        }
        .nav-search-responsive {
          flex: 1;
          max-width: 320px;
          position: relative;
        }
        .nav-search-mobile-responsive {
          display: none;
          width: 100%;
          position: relative;
          padding-bottom: 12px;
        }
        .nav-search-icon-responsive {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 14px;
          opacity: 0.5;
        }
        .nav-search-input-responsive {
          width: 100%;
          padding: 8px 12px 8px 36px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          background: #fff;
        }
        .nav-search-input-responsive:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }
        .nav-right-responsive {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .btn-secondary-responsive {
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 500;
          color: #4b5563;
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease-out;
        }
        .btn-secondary-responsive:hover {
          background: #f9fafb;
        }
        .btn-primary-responsive {
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 500;
          color: #fff;
          background: #2563eb;
          border: 1px solid #2563eb;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease-out;
        }
        .btn-primary-responsive:hover {
          background: #1d4ed8;
        }

        /* 容器 */
        .container-responsive {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
        }

        /* 公告 */
        .notice-responsive {
          margin-bottom: 20px;
          padding: 12px 16px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 10px;
          overflow: hidden;
        }
        .notice-content-responsive {
          flex: 1;
          overflow: hidden;
          white-space: nowrap;
        }
        .notice-marquee-responsive {
          display: inline-block;
          animation: marquee 20s linear infinite;
          font-size: 14px;
          color: #1e40af;
        }
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }

        /* 分类标签 */
        .category-tabs-responsive {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .category-tab-responsive {
          padding: 6px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          background: #fff;
          border: 1px solid #d1d5db;
          color: #4b5563;
          transition: all 0.2s ease-out;
          white-space: nowrap;
        }
        .category-tab-responsive:hover {
          background: #f9fafb;
        }
        .category-tab-responsive.active {
          background: #2563eb;
          border-color: #2563eb;
          color: #fff;
        }

        /* 商品网格 - PC端3列，手机端2列 */
        .product-grid-responsive {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .product-card-responsive {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s ease-out;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .product-card-responsive:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }
        .product-card-img-responsive {
          position: relative;
          width: 100%;
          aspect-ratio: 4/3;
          overflow: hidden;
          background: #f3f4f6;
        }
        .product-card-image-responsive {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .product-card-placeholder-responsive {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          background: #f3f4f6;
        }
        .product-card-body-responsive {
          padding: 14px 16px 16px;
        }
        .product-card-name-responsive {
          font-size: 15px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 10px;
          overflow: hidden;
          textOverflow: ellipsis;
          white-space: nowrap;
        }
        .product-card-price-row-responsive {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }
        .product-card-price-responsive {
          font-size: 20px;
          font-weight: 700;
          color: #dc2626;
        }
        .product-card-price-symbol-responsive {
          font-size: 13px;
        }
        .product-card-original-price-responsive {
          font-size: 13px;
          color: #9ca3af;
          text-decoration: line-through;
          font-weight: 400;
        }
        .product-card-stock-responsive {
          margin-left: auto;
          padding: 3px 10px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 500;
          flex-shrink: 0;
        }
        .product-card-stock-responsive.in-stock {
          background: #d1fae5;
          color: #065f46;
        }
        .product-card-stock-responsive.out-of-stock {
          background: #fee2e2;
          color: #991b1b;
        }
        .product-card-sales-responsive {
          font-size: 13px;
          color: #9ca3af;
        }

        /* 空状态 */
        .empty-responsive {
          text-align: center;
          padding: 60px 20px;
          color: #9ca3af;
        }
        .empty-card-responsive {
          text-align: center;
          padding: 60px 20px;
          background: #fff;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
        }

        /* 页脚 */
        .footer-responsive {
          text-align: center;
          padding: 24px;
          font-size: 13px;
          color: #9ca3af;
          border-top: 1px solid #f3f4f6;
          margin-top: 40px;
        }

        /* 弹窗 */
        .modal-overlay-responsive {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          display: flex;
          alignItems: center;
          justifyContent: center;
          z-index: 1000;
          padding: 16px;
        }
        .modal-responsive {
          background: #fff;
          border-radius: 12px;
          width: 100%;
          max-width: 480px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        }
        .modal-header-responsive {
          padding: 14px 16px 14px 20px;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          justifyContent: space-between;
          alignItems: center;
          position: relative;
        }
        .modal-title-responsive {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }
        .modal-close-responsive {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          cursor: pointer;
          line-height: 1;
          border-radius: 8px;
          transition: all 0.2s ease-out;
          position: absolute;
          top: 10px;
          right: 10px;
        }
        .modal-close-responsive:hover {
          background: #f3f4f6;
          color: #4b5563;
        }
        .modal-body-responsive {
          padding: 20px;
        }
        .modal-product-info-responsive {
          padding: 12px;
          background: #f9fafb;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .form-group-responsive {
          margin-bottom: 14px;
        }
        .form-label-responsive {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #4b5563;
          margin-bottom: 6px;
        }
        .form-input-responsive {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 16px;
          outline: none;
        }
        .form-input-responsive:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }
        .quantity-selector-responsive {
          display: flex;
          alignItems: center;
          gap: 12px;
        }
        .quantity-btn-responsive {
          width: 36px;
          height: 36px;
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
        }
        .quantity-value-responsive {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          min-width: 32px;
          text-align: center;
        }
        .modal-total-responsive {
          display: flex;
          justifyContent: space-between;
          alignItems: center;
          padding: 12px;
          background: #eff6ff;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .modal-submit-responsive {
          width: 100%;
          padding: 12px;
          background: #2563eb;
          color: #fff;
          border: none;
          border-radius: 8px;
          fontSize: 15px;
          fontWeight: 600;
          cursor: pointer;
        }
        .modal-submit-responsive:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .card-item-responsive {
          padding: 10px 12px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          margin-bottom: 8px;
          display: flex;
          justifyContent: space-between;
          alignItems: center;
        }
        .card-content-responsive {
          fontSize: 12px;
          fontFamily: monospace;
          color: #2563eb;
          word-break: break-all;
          flex: 1;
        }
        .card-copy-btn-responsive {
          padding: 4px 10px;
          fontSize: 11px;
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          color: #4b5563;
          cursor: pointer;
          flex-shrink: 0;
          margin-left: 8px;
        }
        .modal-footer-responsive {
          padding: 14px 20px;
          border-top: 1px solid #f3f4f6;
          display: flex;
          justifyContent: flex-end;
        }
        .modal-cancel-btn-responsive {
          padding: 8px 16px;
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          fontSize: 14px;
          color: #4b5563;
          cursor: pointer;
        }
        .modal-query-btn-responsive {
          padding: 8px 16px;
          background: #2563eb;
          border: none;
          border-radius: 8px;
          fontSize: 14px;
          color: #fff;
          cursor: pointer;
          fontWeight: 500;
        }

        /* 手机端适配 */
        @media (max-width: 768px) {
          .nav-inner-responsive {
            padding: 0 16px;
            min-height: 56px;
            flex-wrap: wrap;
            gap: 8px;
          }
          .nav-search-responsive {
            display: none;
          }
          .nav-search-mobile-responsive {
            display: block;
          }
          .nav-logo-text-responsive {
            font-size: 16px;
          }
          .btn-secondary-responsive, .btn-primary-responsive {
            padding: 6px 12px;
            font-size: 13px;
          }
          .container-responsive {
            padding: 16px;
          }
          .product-grid-responsive {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .product-card-name-responsive {
            font-size: 14px;
          }
          .product-card-price-responsive {
            font-size: 17px;
          }
          .category-tabs-responsive {
            flex-wrap: nowrap;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .category-tab-responsive {
            flex-shrink: 0;
          }
        }

        /* 禁止拖动和放大 */
        * {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        input, textarea {
          -webkit-user-select: text;
          user-select: text;
          font-size: 16px !important;
        }
        .modal-overlay-responsive {
          touch-action: none;
          overscroll-behavior: contain;
        }
        .modal-responsive {
          touch-action: pan-y;
          overscroll-behavior: contain;
        }

        /* ===== 精致下单弹窗样式 ===== */
        .modal-product-card-responsive {
          display: flex;
          gap: 14px;
          padding: 14px;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          margin-bottom: 18px;
        }
        .modal-product-img-responsive {
          width: 72px;
          height: 72px;
          border-radius: 10px;
          overflow: hidden;
          background: #fff;
          border: 1px solid #e2e8f0;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
        }
        .modal-product-img-responsive img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .modal-product-detail-responsive {
          flex: 1;
          min-width: 0;
        }
        .modal-product-name-responsive {
          font-size: 15px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 6px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .modal-product-meta-responsive {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 6px;
        }
        .modal-product-price-responsive {
          font-size: 20px;
          font-weight: 700;
          color: #dc2626;
        }
        .modal-product-price-symbol-responsive {
          font-size: 13px;
          font-weight: 600;
        }
        .modal-product-original-price-responsive {
          font-size: 13px;
          color: #9ca3af;
          text-decoration: line-through;
        }
        .modal-product-stock-responsive {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #6b7280;
        }
        .stock-dot-responsive {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .stock-dot-responsive.in-stock {
          background: #10b981;
          box-shadow: 0 0 0 3px rgba(16,185,129,0.2);
        }
        .stock-dot-responsive.out-stock {
          background: #ef4444;
        }
        .input-wrapper-responsive {
          position: relative;
        }
        .input-icon-responsive {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 14px;
          opacity: 0.5;
        }
        .form-input-with-icon-responsive {
          width: 100%;
          padding: 11px 12px 11px 40px;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          font-size: 15px;
          outline: none;
          background: #fff;
          transition: all 0.2s ease-out;
        }
        .form-input-with-icon-responsive:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }
        .form-input-with-icon-responsive::placeholder {
          color: #9ca3af;
        }
        .pay-methods-responsive {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .pay-method-item-responsive {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease-out;
          background: #fff;
        }
        .pay-method-item-responsive:hover {
          border-color: #93c5fd;
          background: #f8fafc;
        }
        .pay-method-item-responsive.active {
          border-color: #2563eb;
          background: #eff6ff;
        }
        .pay-icon-responsive {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .pay-name-responsive {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          flex: 1;
        }
        .pay-check-responsive {
          font-size: 14px;
          color: #2563eb;
          font-weight: 700;
        }
        .modal-total-price-responsive {
          font-size: 24px;
          font-weight: 800;
          color: #1d4ed8;
        }
        .modal-total-symbol-responsive {
          font-size: 15px;
          font-weight: 600;
        }
        .btn-spinner-responsive {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          display: inline-block;
        }
        .security-tip-responsive {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 10px 12px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          font-size: 12px;
          color: #166534;
          line-height: 1.5;
        }
        .success-icon-responsive {
          width: 64px;
          height: 64px;
          margin: 0 auto 16px;
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #059669;
          animation: successPop 0.4s ease-out;
        }
        @keyframes successPop {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        .order-info-responsive {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 14px;
          margin-bottom: 14px;
          text-align: left;
        }
        .order-info-row-responsive {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          font-size: 13px;
          color: #6b7280;
          border-bottom: 1px dashed #e5e7eb;
        }
        .order-info-row-responsive:last-child {
          border-bottom: none;
        }
        .email-tip-responsive {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          font-size: 12px;
          color: #1e40af;
          margin-bottom: 14px;
          text-align: left;
        }
        .card-index-responsive {
          width: 22px;
          height: 22px;
          background: #2563eb;
          color: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          flex-shrink: 0;
        }

        /* ===== 细节优化覆盖样式 ===== */
        /* 数量选择器 - 数字居中 */
        .quantity-selector-responsive {
          display: flex !important;
          align-items: center !important;
          gap: 0 !important;
        }
        .quantity-btn-responsive {
          width: 38px !important;
          height: 38px !important;
          background: #fff !important;
          border: 1px solid #d1d5db !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
          color: #4b5563 !important;
          transition: all 0.2s ease-out !important;
          font-size: 16px !important;
          line-height: 1 !important;
        }
        .quantity-btn-responsive:first-child {
          border-radius: 8px 0 0 8px !important;
        }
        .quantity-btn-responsive:last-child {
          border-radius: 0 8px 8px 0 !important;
        }
        .quantity-value-responsive {
          width: 50px !important;
          height: 38px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-top: 1px solid #d1d5db !important;
          border-bottom: 1px solid #d1d5db !important;
          font-size: 15px !important;
          font-weight: 600 !important;
          color: #111827 !important;
          background: #f9fafb !important;
          text-align: center !important;
          line-height: 1 !important;
        }

        /* 合计金额 - 重新设计 */
        .modal-total-responsive {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          padding: 16px 18px !important;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 12px !important;
          margin-bottom: 14px !important;
        }
        .modal-total-left-responsive {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .modal-total-label-responsive {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }
        .modal-total-count-responsive {
          font-size: 12px;
          color: #9ca3af;
        }
        .modal-total-right-responsive {
          display: flex;
          align-items: baseline;
          gap: 2px;
        }
        .modal-total-symbol-responsive {
          font-size: 16px !important;
          font-weight: 700 !important;
          color: #dc2626 !important;
        }
        .modal-total-price-responsive {
          font-size: 26px !important;
          font-weight: 800 !important;
          color: #dc2626 !important;
          line-height: 1 !important;
        }

        /* 按钮组 - 取消+支付并排 */
        .modal-buttons-responsive {
          display: flex;
          gap: 10px;
          margin-bottom: 12px;
        }
        .modal-cancel-inline-responsive {
          flex: 0 0 100px;
          padding: 13px;
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 500;
          color: #4b5563;
          cursor: pointer;
          transition: all 0.2s ease-out;
        }
        .modal-cancel-inline-responsive:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }
        .modal-submit-responsive {
          flex: 1 !important;
          padding: 13px !important;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
          color: #fff !important;
          border: none !important;
          border-radius: 10px !important;
          font-size: 15px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          transition: all 0.2s ease-out !important;
          box-shadow: 0 4px 12px rgba(37,99,235,0.3) !important;
          margin-bottom: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        /* 安全提示 - 增加间距 */
        .security-tip-responsive {
          margin-top: 4px !important;
          padding: 10px 12px !important;
        }

        /* 底部footer - 未支付时隐藏 */
        .modal-footer-responsive:empty {
          display: none;
        }

        /* ===== 顶部公告横幅 ===== */
        .top-banner-responsive {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border: 1px solid #bfdbfe;
          border-radius: 12px;
          margin-bottom: 16px;
        }
        .top-banner-icon-responsive {
          width: 36px;
          height: 36px;
          background: #fff;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
          box-shadow: 0 2px 4px rgba(37,99,235,0.1);
        }
        .top-banner-content-responsive {
          flex: 1;
          font-size: 14px;
          color: #1e40af;
          font-weight: 500;
          line-height: 1.5;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* ===== 底部页脚 ===== */
        .footer-responsive {
          background: #fff;
          border-top: 1px solid #e5e7eb;
          padding: 32px 0 24px;
          margin-top: 40px;
        }
        .footer-inner-responsive {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }
        .footer-top-responsive {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .footer-left-responsive {
          flex: 1;
          min-width: 200px;
        }
        .footer-brand-responsive {
          font-size: 16px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 6px;
        }
        .footer-desc-responsive {
          font-size: 13px;
          color: #6b7280;
          line-height: 1.6;
        }
        .footer-right-responsive {
          display: flex;
          gap: 20px;
          align-items: center;
        }
        .footer-link-responsive {
          font-size: 13px;
          color: #6b7280;
          text-decoration: none;
          transition: color 0.2s ease-out;
        }
        .footer-link-responsive:hover {
          color: #2563eb;
        }
        .footer-bottom-responsive {
          padding-top: 16px;
          border-top: 1px solid #f3f4f6;
          font-size: 12px;
          color: #9ca3af;
          text-align: center;
        }

        /* 手机端页脚适配 */
        @media (max-width: 768px) {
          .footer-inner-responsive {
            padding: 0 16px;
          }
          .footer-top-responsive {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .footer-left-responsive {
            text-align: center;
          }
          .footer-right-responsive {
            gap: 16px;
          }
          .top-banner-content-responsive {
            white-space: normal;
          }
        }

        /* ===== 数量选择器强制对齐 ===== */
        .quantity-selector-responsive {
          display: flex !important;
          align-items: center !important;
          height: 38px !important;
        }
        .quantity-selector-responsive .quantity-btn-responsive {
          width: 38px !important;
          height: 38px !important;
          min-height: 38px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 !important;
          margin: 0 !important;
          line-height: 1 !important;
          border: 1px solid #d1d5db !important;
          background: #fff !important;
        }
        .quantity-selector-responsive .quantity-btn-responsive:first-child {
          border-radius: 8px 0 0 8px !important;
          border-right: none !important;
        }
        .quantity-selector-responsive .quantity-btn-responsive:last-child {
          border-radius: 0 8px 8px 0 !important;
          border-left: none !important;
        }
        .quantity-selector-responsive .quantity-value-responsive {
          width: 50px !important;
          height: 38px !important;
          min-height: 38px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 !important;
          margin: 0 !important;
          line-height: 1 !important;
          border-top: 1px solid #d1d5db !important;
          border-bottom: 1px solid #d1d5db !important;
          border-left: none !important;
          border-right: none !important;
          background: #f9fafb !important;
        }

        /* ===== 卡密列表居中修复 ===== */
        .card-item-responsive {
          padding: 12px !important;
          background: #fff !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 8px !important;
          margin-bottom: 8px !important;
          display: flex !important;
          align-items: center !important;
          gap: 10px !important;
        }
        .card-index-responsive {
          width: 24px !important;
          height: 24px !important;
          background: #2563eb !important;
          color: #fff !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          flex-shrink: 0 !important;
          line-height: 1 !important;
        }
        .card-content-responsive {
          font-size: 14px !important;
          font-family: 'SF Mono', Monaco, monospace !important;
          color: #1d4ed8 !important;
          word-break: break-all !important;
          flex: 1 !important;
          line-height: 1.4 !important;
          display: flex !important;
          align-items: center !important;
          min-height: 24px !important;
        }
        .card-copy-btn-responsive {
          padding: 6px 12px !important;
          font-size: 12px !important;
          background: #fff !important;
          border: 1px solid #d1d5db !important;
          border-radius: 6px !important;
          color: #4b5563 !important;
          cursor: pointer !important;
          flex-shrink: 0 !important;
          display: flex !important;
          align-items: center !important;
          transition: all 0.2s ease-out !important;
          line-height: 1 !important;
          height: 32px !important;
        }
      `}</style>
    </div>
  );
}
