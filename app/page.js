'use client';
import { useState, useEffect } from 'react';
import Icon from '@/components/Icon';
import { useRouter } from 'next/navigation';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(true);
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

  // 加载页面已移除




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
                <span className="hero-banner-tag-icon-responsive"><Icon name="check" size={12} /></span>
                {settings.banner_tag1 || '自动秒发'}
              </span>
              <span className="hero-banner-tag-responsive">
                <span className="hero-banner-tag-icon-responsive"><Icon name="key" size={12} /></span>
                {settings.banner_tag2 || '加密存储'}
              </span>
              <span className="hero-banner-tag-responsive">
                <span className="hero-banner-tag-icon-responsive"><Icon name="money" size={12} /></span>
                {settings.banner_tag3 || '多渠道支付'}
              </span>
            </div>
          </div>
          {/* 横幅装饰图片 - 左上角放大半透明 */}
          {settings.banner_image ? (
            <img src={settings.banner_image} alt="横幅装饰" className="hero-banner-bg-image-responsive" />
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

                  {/* 已售罄遮罩 */}
                  {p.stock === 0 && (
                    <div className="product-card-soldout-mask-responsive">
                      <div className="product-card-soldout-text-responsive">已售罄</div>
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
                  <div style={{fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '6px'}}>{payMethod === 'wechat' ? '请使用微信扫码支付' : '请使用支付宝扫码支付'}</div>
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
                        {selectedProduct.stock > 0 ? `库存充足 (${selectedProduct.stock}件)` : '已售罄'}
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
                      <Icon name="money" size={14} style={{marginRight: '4px'}} />
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
                      <div
                        className={`pay-method-item-responsive ${payMethod === 'wechat' ? 'active' : ''}`}
                        onClick={() => setPayMethod('wechat')}
                      >
                        <img src="/wechat-icon.png" alt="微信支付" style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          objectFit: 'cover',
                          boxShadow: '0 2px 6px rgba(7,193,96,0.25)'
                        }} />
                        <span className="pay-name-responsive">微信支付</span>
                        <span className="pay-check-responsive">{payMethod === 'wechat' && '✓'}</span>
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
                          立即支付
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

      
    </div>
  );
}
