'use client';
import { useState, useEffect } from 'react';
import Icon from '@/components/Icon';
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
      const sets = setData.settings || setData.data || {};
      setProducts(prodData.products || prodData.data || []);
      setSettings(sets);
      const cats = [...new Set((prodData.products || prodData.data || []).map(p => p.category).filter(Boolean))];
      setCategories(cats);
      // 同步favicon
      if (sets.site_logo) {
        let favicon = document.querySelector('link[rel="icon"]');
        if (!favicon) {
          favicon = document.createElement('link');
          favicon.rel = 'icon';
          document.head.appendChild(favicon);
        }
        favicon.href = sets.site_logo;
      }
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
          {/* Logo + 搜索框 - 左边 */}
          <div className="nav-left-responsive">
            <div className="nav-logo-responsive" onClick={() => router.push('/')}>
              {settings.site_logo ? (
                <img src={settings.site_logo} alt="Logo" className="nav-logo-img-responsive" />
              ) : (
                <div className="nav-logo-icon-responsive">{settings.logo_text || '甜'}</div>
              )}
              <span className="nav-logo-text-responsive">{settings.site_name || '甜甜发卡'}</span>
            </div>

            {/* 搜索框 - PC端显示 */}
            <div className="nav-search-responsive">
              <span className="nav-search-icon-responsive"><Icon name="search" size={16} /></span>
              <input
                type="text"
                placeholder="搜索商品..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="nav-search-input-responsive"
              />
            </div>
          </div>

          {/* 右侧按钮 */}
          <div className="nav-right-responsive">
            <button className="btn-secondary-responsive" onClick={() => router.push('/query')}>订单查询</button>
            <a href="/admin" target="_blank" rel="noopener noreferrer" className="btn-primary-responsive" style={{textDecoration: 'none', display: 'inline-flex', alignItems: 'center'}}>管理后台</a>
          </div>

          {/* 搜索框 - 手机端显示（居中） */}
          <div className="nav-search-mobile-responsive">
            <span className="nav-search-icon-responsive"><Icon name="search" size={16} /></span>
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
        {/* 顶部横幅 */}
        <div className="hero-banner-responsive">
          <div className="hero-banner-left-responsive">
            <h2 className="hero-banner-title-responsive">
              {settings.banner_title || '虚拟商品·即拍即发'}
            </h2>
            <p className="hero-banner-subtitle-responsive">
              {settings.banner_subtitle || '支付宝多渠道支付，付款后自动秒发卡密'}
            </p>
            <div className="hero-banner-tags-responsive">
              <span className="hero-banner-tag-responsive">
                <span className="hero-banner-tag-icon-responsive">⚡</span>
                {settings.banner_tag1 || '自动秒发'}
              </span>
              <span className="hero-banner-tag-responsive">
                <span className="hero-banner-tag-icon-responsive">🔒</span>
                {settings.banner_tag2 || '加密存储'}
              </span>
              <span className="hero-banner-tag-responsive">
                <span className="hero-banner-tag-icon-responsive">💳</span>
                {settings.banner_tag3 || '多渠道支付'}
              </span>
            </div>
          </div>
          <div className="hero-banner-right-responsive">
            {settings.banner_image ? (
              <img src={settings.banner_image} alt="横幅图" className="hero-banner-image-responsive" />
            ) : (
              <div className="hero-banner-flower-responsive">
                <svg viewBox="0 0 100 100" className="hero-banner-flower-svg-responsive">
                  <circle cx="50" cy="50" r="8" fill="#fff" opacity="0.9"/>
                  <ellipse cx="50" cy="25" rx="12" ry="18" fill="#FFB7C5" opacity="0.7"/>
                  <ellipse cx="50" cy="75" rx="12" ry="18" fill="#FFB7C5" opacity="0.7"/>
                  <ellipse cx="25" cy="50" rx="18" ry="12" fill="#FFB7C5" opacity="0.7"/>
                  <ellipse cx="75" cy="50" rx="18" ry="12" fill="#FFB7C5" opacity="0.7"/>
                  <ellipse cx="32" cy="32" rx="14" ry="10" fill="#FFC0CB" opacity="0.6" transform="rotate(-45 32 32)"/>
                  <ellipse cx="68" cy="32" rx="14" ry="10" fill="#FFC0CB" opacity="0.6" transform="rotate(45 68 32)"/>
                  <ellipse cx="32" cy="68" rx="14" ry="10" fill="#FFC0CB" opacity="0.6" transform="rotate(45 32 68)"/>
                  <ellipse cx="68" cy="68" rx="14" ry="10" fill="#FFC0CB" opacity="0.6" transform="rotate(-45 68 68)"/>
                </svg>
              </div>
            )}
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
            <div style={{marginBottom: '12px', color: '#9ca3af'}}><Icon name="refresh" size={32} /></div>
            加载中...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-card-responsive">
            <div style={{marginBottom: '12px', opacity: 0.5, color: '#9ca3af'}}><Icon name="box" size={48} /></div>
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
                    <div className="product-card-placeholder-responsive">
                      <div className="product-card-placeholder-pattern"></div>
                      <div className="product-card-placeholder-icon">🎁</div>
                    </div>
                  )}
                  {/* 渐变遮罩 */}
                  <div className="product-card-overlay-responsive"></div>
                  
                  {/* 左上角标签组 */}
                  <div className="product-card-badges-responsive">
                    <div className="product-card-badge-responsive">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
                      </svg>
                      自动发卡
                    </div>
                    {p.tag && p.tag.trim() && (
                      <div className="product-card-tag-responsive">{p.tag}</div>
                    )}
                  </div>

                  {/* 已售空遮罩 */}
                  {p.stock === 0 && (
                    <div className="product-card-soldout-mask-responsive">
                      <div className="product-card-soldout-text-responsive">已售空</div>
                    </div>
                  )}
                </div>

                {/* 商品信息 */}
                <div className="product-card-body-responsive">
                  {/* 商品名称 */}
                  <div className="product-card-name-row-responsive">
                    <div className="product-card-name-responsive">{p.name}</div>
                    <div className="product-card-stock-badge-responsive">
                      <span className={`stock-dot ${p.stock > 0 ? 'active' : ''}`}></span>
                      {p.stock > 0 ? `库存${p.stock}` : '缺货'}
                    </div>
                  </div>

                  {/* 库存进度条 */}
                  {p.stock > 0 && (
                    <div className="product-card-stock-bar-responsive">
                      <div className="product-card-stock-progress-responsive" style={{width: `${Math.min(100, p.stock * 10)}%`}}></div>
                    </div>
                  )}

                  {/* 价格和销量 */}
                  <div className="product-card-info-row-responsive">
                    <div className="product-card-price-wrapper-responsive">
                      <span className="product-card-price-responsive">
                        <span className="product-card-price-symbol-responsive">¥</span>
                        {Number(p.price).toFixed(2)}
                      </span>
                      {p.original_price != null && p.original_price !== "" && Number(p.original_price) > 0 && Number(p.original_price) > Number(p.price) && (
                        <span className="product-card-original-price-responsive">¥{Number(p.original_price).toFixed(2)}</span>
                      )}
                    </div>
                    <div className="product-card-sales-responsive">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                      </svg>
                      {p.sales || 0}人已购
                    </div>
                  </div>

                  {/* 底部购买按钮 */}
                  <div className="product-card-action-responsive">
                    <span className="product-card-buy-text-responsive">立即购买</span>
                    <div className="product-card-buy-btn-responsive">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </div>
                  </div>
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
              <div className="footer-desc-responsive">{settings.footer_desc || '本站仅出售合规虚拟商品，下单即视为同意服务条款。'}</div>
            </div>
            <div className="footer-right-responsive">
              {settings.footer_link1_text ? (
                <a href={settings.footer_link1_url || '#'} className="footer-link-responsive" target="_blank" rel="noopener noreferrer">{settings.footer_link1_text}</a>
              ) : (
                <a href="/terms" className="footer-link-responsive">服务条款</a>
              )}
              {settings.footer_link2_text ? (
                <a href={settings.footer_link2_url || '#'} className="footer-link-responsive" target="_blank" rel="noopener noreferrer">{settings.footer_link2_text}</a>
              ) : (
                <a href="/privacy" className="footer-link-responsive">隐私政策</a>
              )}
              {settings.footer_link3_text && (
                <a href={settings.footer_link3_url || '#'} className="footer-link-responsive" target="_blank" rel="noopener noreferrer">{settings.footer_link3_text}</a>
              )}
            </div>
          </div>
          <div className="footer-bottom-responsive">
            © {new Date().getFullYear()} {settings.site_name || '甜甜发卡'}. Powered by Next.js
            {settings.icp_number && <span style={{marginLeft: '12px'}}>{settings.icp_number}</span>}
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
                    <Icon name="cart" size={16} style={{marginRight: '6px'}} /> 确认订单
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
                        {selectedProduct.original_price != null && selectedProduct.original_price !== "" && Number(selectedProduct.original_price) > 0 && Number(selectedProduct.original_price) > Number(selectedProduct.price) && (
                          <span className="modal-product-original-price-responsive">¥{Number(selectedProduct.original_price).toFixed(2)}</span>
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
                      <Icon name="mail" size={14} style={{marginRight: '4px'}} />
                      邮箱地址
                      <span style={{color: '#9ca3af', fontWeight: 400, marginLeft: '6px'}}>用于接收卡密</span>
                    </label>
                    <div className="input-wrapper-responsive">
                      <span className="input-icon-responsive"><Icon name="mail" size={16} /></span>
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
                      <Icon name="box" size={14} style={{marginRight: '4px'}} />
                      购买数量
                    </label>
                    <div className="quantity-wrapper-responsive">
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
                      </div>
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
                        <img src="/alipay-icon.png" alt="支付宝" style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          objectFit: 'cover',
                          boxShadow: '0 2px 6px rgba(22,119,255,0.25)'
                        }} />
                        <span className="pay-name-responsive">支付宝</span>
                        <span className="pay-check-responsive">{payMethod === 'alipay' && '✓'}</span>
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
                    <Icon name="mail" size={16} style={{marginRight: '6px'}} />
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
                    <Icon name="list" size={16} style={{marginRight: '6px'}} /> 订单查询
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
        .nav-left-responsive {
          display: flex;
          align-items: center;
          gap: 20px;
          flex: 1;
        }
        .nav-search-responsive {
          max-width: 280px;
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
          border: none;
          border-bottom: 1px solid transparent;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          background: #f3f4f6;
        }
        .nav-search-input-responsive:focus {
          background: #e5e7eb;
          box-shadow: none;
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
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }
        .product-card-responsive {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
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
        .product-card-badge-responsive {
          position: absolute;
          top: 8px;
          left: 8px;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #fff;
          font-size: 11px;
          font-weight: 600;
          border-radius: 6px;
          box-shadow: 0 2px 4px rgba(16,185,129,0.3);
          z-index: 2;
        }
        .product-card-tag-responsive {
          position: absolute;
          top: 8px;
          right: 8px;
          padding: 4px 8px;
          background: rgba(0,0,0,0.6);
          color: #fff;
          font-size: 11px;
          font-weight: 500;
          border-radius: 6px;
          backdrop-filter: blur(4px);
          z-index: 2;
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
          display: flex;
          align-items: baseline;
        }
        .product-card-price-symbol-responsive {
          font-size: 13px;
          margin-right: 2px;
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
            display: flex;
            justify-content: center;
            width: 100%;
            order: 3;
            padding-top: 8px;
            padding-bottom: 12px;
          }
          .nav-search-mobile-responsive .nav-search-input-responsive {
            max-width: 280px;
            text-align: center;
          }
          .nav-left-responsive {
            order: 1;
          }
          .nav-right-responsive {
            order: 2;
            margin-left: auto;
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

        /* 优化移动端体验 */
        * {
          -webkit-tap-highlight-color: transparent;
        }
        input, textarea {
          font-size: 16px !important;
        }
        .modal-overlay-responsive {
          touch-action: none;
          overscroll-behavior: contain;
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          background: rgba(0,0,0,0.5) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          z-index: 1000 !important;
          padding: 16px !important;
        }
        .modal-responsive {
          touch-action: pan-y;
          overscroll-behavior: contain;
          background: #fff !important;
          border-radius: 12px !important;
          width: 100% !important;
          max-width: 420px !important;
          max-height: 90vh !important;
          overflow-y: auto !important;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1) !important;
          margin: 0 auto !important;
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
          color: #dc2626 !important;
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
          width: 30px !important;
          height: 30px !important;
          border-radius: 7px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: #fff !important;
          flex-shrink: 0 !important;
          overflow: hidden !important;
        }
        .pay-icon-responsive svg {
          display: block !important;
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
          margin-bottom: 8px;
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
          padding-top: 4px;
          font-size: 12px;
          color: #9ca3af;
          text-align: left;
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
            justify-content: center;
            width: 100%;
          }
          .footer-bottom-responsive {
            text-align: center;
          }
          .top-banner-content-responsive {
            white-space: normal;
          }
        }

        /* ===== 数量选择器整体样式 ===== */
        .quantity-wrapper-responsive {
          display: flex !important;
          align-items: center !important;
        }
        .quantity-selector-responsive {
          display: flex !important;
          align-items: center !important;
          height: 38px !important;
          border: 1px solid #d1d5db !important;
          border-radius: 8px !important;
          overflow: hidden !important;
          background: #fff !important;
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
          border: none !important;
          background: #fff !important;
          cursor: pointer !important;
          color: #4b5563 !important;
          transition: background 0.2s !important;
        }
        .quantity-selector-responsive .quantity-btn-responsive:hover {
          background: #f3f4f6 !important;
        }
        .quantity-selector-responsive .quantity-btn-responsive:active {
          background: #e5e7eb !important;
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
          border-left: 1px solid #e5e7eb !important;
          border-right: 1px solid #e5e7eb !important;
          border-top: none !important;
          border-bottom: none !important;
          background: #f9fafb !important;
          font-size: 15px !important;
          font-weight: 600 !important;
          color: #111827 !important;
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

        /* ===== 商品卡片极致美化 ===== */
        .product-grid-responsive {
          
          gap: 16px !important;
        }
        .product-card-responsive {
          border-radius: 12px !important;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06) !important;
        }
        .product-card-responsive:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 12px 24px -8px rgba(0,0,0,0.15) !important;
          border-color: #93c5fd !important;
        }
        .product-card-img-responsive {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0fdf4 100%) !important;
        }
        .product-card-image-responsive {
          transition: transform 0.4s ease !important;
        }
        .product-card-responsive:hover .product-card-image-responsive {
          transform: scale(1.05) !important;
        }
        .product-card-placeholder-responsive {
          position: relative !important;
        }
        .product-card-placeholder-responsive::after {
          content: '';
          position: absolute;
          width: 80px;
          height: 80px;
          background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%);
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        .product-card-badge-responsive {
          top: 4px !important;
          left: 4px !important;
          padding: 5px 10px !important;
          box-shadow: 0 2px 8px rgba(16,185,129,0.4) !important;
        }
        .product-card-tag-responsive {
          top: 4px !important;
          right: 10px !important;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important;
          box-shadow: 0 2px 8px rgba(245,158,11,0.4) !important;
          font-weight: 600 !important;
        }
        .product-card-body-responsive {
          padding: 12px 14px 14px !important;
        }
        .product-card-name-responsive {
          font-size: 14px !important;
          font-weight: 600 !important;
          margin-bottom: 8px !important;
        }
        .product-card-price-row-responsive {
          margin-bottom: 10px !important;
        }
        .product-card-price-responsive {
          font-size: 18px !important;
          font-weight: 800 !important;
          color: #dc2626 !important;
          display: flex !important;
          align-items: baseline !important;
        }
        .product-card-stock-responsive {
          font-size: 11px !important;
          font-weight: 600 !important;
          padding: 3px 8px !important;
          border-radius: 4px !important;
        }
        .product-card-stock-responsive.in-stock {
          background: #ecfdf5 !important;
          color: #059669 !important;
        }
        .product-card-stock-responsive.out-of-stock {
          background: #fef2f2 !important;
          color: #dc2626 !important;
        }
        .product-card-sales-responsive {
          display: flex !important;
          align-items: center !important;
          gap: 4px !important;
          font-size: 12px !important;
          color: #9ca3af !important;
        }

        /* ===== 商品卡片全新精致设计 ===== */
        .product-card-responsive {
          border-radius: 14px !important;
          overflow: hidden !important;
          background: #fff !important;
          border: 1px solid #f1f5f9 !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06) !important;
        }
        .product-card-responsive:hover {
          transform: translateY(-6px) !important;
          box-shadow: 0 20px 40px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(59,130,246,0.2) !important;
          border-color: #bfdbfe !important;
        }
        .product-card-img-responsive {
          aspect-ratio: 16/10 !important;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 30%, #fcd34d 60%, #fbbf24 100%) !important;
          position: relative !important;
          overflow: hidden !important;
        }
        .product-card-placeholder-responsive {
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          position: relative !important;
        }
        .product-card-placeholder-pattern {
          position: absolute !important;
          width: 100% !important;
          height: 100% !important;
          background-image: 
            radial-gradient(circle at 20% 30%, rgba(255,255,255,0.3) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(255,255,255,0.2) 0%, transparent 40%) !important;
        }
        .product-card-placeholder-icon {
          font-size: 52px !important;
          z-index: 2 !important;
          filter: drop-shadow(0 8px 16px rgba(0,0,0,0.15)) !important;
          animation: float 3s ease-in-out infinite !important;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .product-card-overlay-responsive {
          position: absolute !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          height: 50% !important;
          background: linear-gradient(to top, rgba(0,0,0,0.1) 0%, transparent 100%) !important;
          pointer-events: none !important;
        }
        .product-card-badges-responsive {
          position: absolute !important;
          top: 4px !important;
          left: 4px !important;
          display: flex !important;
          gap: 6px !important;
          z-index: 3 !important;
        }
        .product-card-badge-responsive {
          display: flex !important;
          align-items: center !important;
          gap: 4px !important;
          padding: 4px 10px !important;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
          color: #fff !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          border-radius: 20px !important;
          box-shadow: 0 4px 12px rgba(16,185,129,0.4) !important;
          backdrop-filter: blur(4px) !important;
          white-space: nowrap !important;
          flex-shrink: 0 !important;
        }
        .product-card-tag-responsive {
          padding: 4px 10px !important;
          background: linear-gradient(135deg, #f472b6 0%, #ec4899 100%) !important;
          color: #fff !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          border-radius: 20px !important;
          box-shadow: 0 4px 12px rgba(236,72,153,0.4) !important;
          white-space: nowrap !important;
          flex-shrink: 0 !important;
        }
        .product-card-price-tag-responsive {
          position: absolute !important;
          top: 4px !important;
          right: 10px !important;
          display: flex !important;
          align-items: baseline !important;
          padding: 6px 12px !important;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
          color: #fff !important;
          border-radius: 20px !important;
          box-shadow: 0 4px 12px rgba(239,68,68,0.4) !important;
          z-index: 3 !important;
        }
        .product-card-price-tag-symbol {
          font-size: 11px !important;
          font-weight: 600 !important;
        }
        .product-card-price-tag-num {
          font-size: 15px !important;
          font-weight: 800 !important;
          margin-left: 1px !important;
        }
        .product-card-soldout-mask-responsive {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          background: rgba(0,0,0,0.5) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          z-index: 4 !important;
          backdrop-filter: blur(2px) !important;
        }
        .product-card-soldout-text-responsive {
          padding: 8px 24px !important;
          background: rgba(255,255,255,0.95) !important;
          color: #374151 !important;
          font-size: 14px !important;
          font-weight: 700 !important;
          border-radius: 8px !important;
          letter-spacing: 4px !important;
          transform: rotate(-10deg) !important;
        }
        .product-card-body-responsive {
          padding: 14px !important;
        }
        .product-card-name-row-responsive {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          margin-bottom: 10px !important;
        }
        .product-card-name-responsive {
          font-size: 15px !important;
          font-weight: 700 !important;
          color: #111827 !important;
          flex: 1 !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          margin-right: 8px !important;
        }
        .product-card-stock-badge-responsive {
          display: flex !important;
          align-items: center !important;
          gap: 4px !important;
          font-size: 11px !important;
          color: #6b7280 !important;
          flex-shrink: 0 !important;
        }
        .stock-dot {
          width: 6px !important;
          height: 6px !important;
          border-radius: 50% !important;
          background: #d1d5db !important;
        }
        .stock-dot.active {
          background: #10b981 !important;
          box-shadow: 0 0 0 3px rgba(16,185,129,0.2) !important;
        }
        .product-card-stock-bar-responsive {
          height: 4px !important;
          background: #f3f4f6 !important;
          border-radius: 2px !important;
          margin-bottom: 12px !important;
          overflow: hidden !important;
        }
        .product-card-stock-progress-responsive {
          height: 100% !important;
          background: linear-gradient(90deg, #10b981 0%, #34d399 100%) !important;
          border-radius: 2px !important;
          transition: width 0.5s ease !important;
        }
        .product-card-info-row-responsive {
          display: flex !important;
          justify-content: space-between !important;
          align-items: flex-end !important;
          margin-bottom: 12px !important;
        }
        .product-card-price-wrapper-responsive {
          display: flex !important;
          align-items: baseline !important;
          gap: 6px !important;
        }
        .product-card-price-responsive {
          font-size: 22px !important;
          font-weight: 800 !important;
          color: #dc2626 !important;
          display: flex !important;
          align-items: baseline !important;
          line-height: 1 !important;
        }
        .product-card-price-symbol-responsive {
          font-size: 13px !important;
          font-weight: 700 !important;
          margin-right: 1px !important;
        }
        .product-card-original-price-responsive {
          font-size: 12px !important;
          color: #9ca3af !important;
          text-decoration: line-through !important;
        }
        .product-card-sales-responsive {
          font-size: 11px !important;
          color: #9ca3af !important;
          display: flex !important;
          align-items: center !important;
          gap: 3px !important;
        }
        .product-card-action-responsive {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          padding-top: 12px !important;
          border-top: 1px solid #f3f4f6 !important;
        }
        .product-card-buy-text-responsive {
          font-size: 13px !important;
          font-weight: 600 !important;
          color: #374151 !important;
        }
        .product-card-buy-btn-responsive {
          width: 28px !important;
          height: 28px !important;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: #fff !important;
          transition: all 0.3s ease !important;
          box-shadow: 0 4px 10px rgba(59,130,246,0.3) !important;
        }
        .product-card-responsive:hover .product-card-buy-btn-responsive {
          transform: scale(1.1) !important;
          box-shadow: 0 6px 16px rgba(59,130,246,0.5) !important;
        }
      /* ===== 手机端商品卡片最终优化 ===== */
        @media (max-width: 768px) {
          .product-grid-responsive {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
          .product-card-img-responsive {
            aspect-ratio: 4/3 !important;
          }
          .product-card-body-responsive {
            padding: 10px !important;
          }
          .product-card-price-tag-responsive {
            padding: 4px 8px !important;
          }
          .product-card-price-tag-num {
            font-size: 13px !important;
          }
          .product-card-badge-responsive,
          .product-card-tag-responsive {
            padding: 3px 8px !important;
            font-size: 10px !important;
          }
          .product-card-price-responsive {
            font-size: 18px !important;
          }
          .product-card-stock-bar-responsive {
            display: none !important;
          }
          .product-card-placeholder-icon {
            font-size: 40px !important;
          }
          .product-card-name-responsive {
            font-size: 13px !important;
          }
          .product-card-sales-responsive {
            font-size: 10px !important;
          }
          .product-card-buy-btn-responsive {
            width: 24px !important;
            height: 24px !important;
          }
        }

        /* ===== 顶部横幅 ===== */
        .hero-banner-responsive {
          background: #fff;
          border-radius: 16px;
          padding: 28px 32px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          border: 1px solid #f3f4f6;
          position: relative;
          overflow: hidden;
        }
        .hero-banner-left-responsive {
          flex: 1;
          z-index: 2;
        }
        .hero-banner-title-responsive {
          font-size: 28px;
          font-weight: 800;
          color: #111827;
          margin: 0 0 8px 0;
          letter-spacing: -0.5px;
        }
        .hero-banner-subtitle-responsive {
          font-size: 14px;
          color: #6b7280;
          margin: 0 0 16px 0;
          line-height: 1.6;
        }
        .hero-banner-tags-responsive {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .hero-banner-tag-responsive {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          font-size: 12px;
          color: #4b5563;
          font-weight: 500;
        }
        .hero-banner-tag-icon-responsive {
          font-size: 13px;
        }
        .hero-banner-right-responsive {
          flex-shrink: 0;
          margin-left: 20px;
        }
        .hero-banner-flower-responsive {
          width: 100px;
          height: 100px;
          opacity: 0.8;
        }
        .hero-banner-flower-svg-responsive {
          width: 100%;
          height: 100%;
        }
        .hero-banner-image-responsive {
          width: 100px;
          height: 100px;
          object-fit: contain;
          border-radius: 12px;
        }




        /* ===== 底部优化 ===== */
        .footer-top-responsive {
          display: flex !important;
          justify-content: space-between !important;
          align-items: flex-start !important;
          gap: 20px !important;
        }
        .footer-left-responsive {
          flex: 1 !important;
          text-align: left !important;
        }
        .footer-right-responsive {
          display: flex !important;
          gap: 20px !important;
          flex-shrink: 0 !important;
        }
        .footer-link-responsive {
          color: #6b7280 !important;
          text-decoration: none !important;
          font-size: 13px !important;
          transition: color 0.2s !important;
        }
        .footer-link-responsive:hover {
          color: #2563eb !important;
        }

        /* ===== 手机端标签位置调整 ===== */
        @media (max-width: 768px) {
          .product-card-badges-responsive {
            top: 4px !important;
            left: 4px !important;
            gap: 4px !important;
          }
          /* 手机端横幅响应式 */
          .hero-banner-responsive {
            padding: 16px !important;
            position: relative !important;
            min-height: 120px !important;
          }
          .hero-banner-left-responsive {
            padding-right: 80px !important;
            text-align: left !important;
          }
          .hero-banner-title-responsive {
            font-size: 20px !important;
          }
          .hero-banner-subtitle-responsive {
            font-size: 12px !important;
          }
          .hero-banner-tags-responsive {
            justify-content: flex-start !important;
            flex-wrap: wrap !important;
          }
          .hero-banner-right-responsive {
            position: absolute !important;
            top: 12px !important;
            right: 12px !important;
            margin-left: 0 !important;
          }
          .hero-banner-flower-responsive {
            width: 60px !important;
            height: 60px !important;
          }
          .hero-banner-image-responsive {
            width: 60px !important;
            height: 60px !important;
          }
          /* 手机端商品卡片价格区域布局修复 */
          .product-card-info-row-responsive {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 6px !important;
          }
          .product-card-price-wrapper-responsive {
            width: 100% !important;
            display: flex !important;
            align-items: baseline !important;
            gap: 8px !important;
          }
          .product-card-price-responsive {
            font-size: 20px !important;
          }
          .product-card-original-price-responsive {
            font-size: 12px !important;
          }
          .product-card-sales-responsive {
            width: 100% !important;
            justify-content: flex-start !important;
            font-size: 11px !important;
          }
          .product-card-badge-responsive,
          .product-card-tag-responsive {
            padding: 3px 6px !important;
            font-size: 10px !important;
          }
        }
      `}
      </style>
    </div>
  );
}
