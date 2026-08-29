'use client';

import { useState, useEffect, useRef } from 'react';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

// 轮播图
const banners = [
  { title: '聚合数字权益货源', sub: '品类齐全 / 官方正版 / 稳定高效', bg: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)', icon: '🎁' },
  { title: 'DCSHOP 多财商城', sub: '安全 · 稳定 · 高效 · 便捷', bg: 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)', icon: '🛒' },
  { title: '会员权益聚合平台', sub: '官方正品 · 快速直充 · 售后无忧', bg: 'linear-gradient(135deg, #fce7f3 0%, #fdf2f8 100%)', icon: '⚡' }
];

// 分类图标
const catIcons = [
  { icon: '📅', name: '有奖签到' },
  { icon: '🎁', name: '积分任务' },
  { icon: '💰', name: '货币充值' },
  { icon: '⌚', name: '数码产品' },
  { icon: '🏃', name: '健身运动' },
  { icon: '🍔', name: '美食餐饮' },
  { icon: '📱', name: '数码产品' },
  { icon: '🐰', name: '盲盒测试' },
  { icon: '🧃', name: '自由设置' },
  { icon: '🎰', name: '自由设置' },
  { icon: '➕', name: '更多分类' },
  { icon: '🎨', name: '装修' }
];

export default function Home() {
  const [siteSettings, setSiteSettings] = useState({});
  const [allProducts, setAllProducts] = useState([]);
  const [currentCategory, setCurrentCategory] = useState('全部商品');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showQueryModal, setShowQueryModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderContact, setOrderContact] = useState('');
  const [queryOrderNo, setQueryOrderNo] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [sortBy, setSortBy] = useState('default');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const pollTimerRef = useRef(null);
  const qrRef = useRef(null);

  useEffect(() => {
    loadSiteSettings();
    loadProducts();
    const t = setInterval(() => setCurrentBanner(p => (p + 1) % banners.length), 5000);
    return () => { clearInterval(t); if (pollTimerRef.current) clearInterval(pollTimerRef.current); };
  }, []);

  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 2500); };

  const loadSiteSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings`);
      const data = await res.json();
      if (data.success && data.settings) { setSiteSettings(data.settings); if (data.settings.site_name) document.title = data.settings.site_name; }
    } catch (e) { console.warn(e); }
  };

  const loadProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/products`);
      const data = await res.json();
      if (data.success) setAllProducts(data.products);
    } catch (e) { console.error(e); }
  };

  // 分类统计
  const categories = {};
  allProducts.forEach(p => { const c = p.category || '其他'; categories[c] = (categories[c] || 0) + 1; });

  // 筛选
  let filtered = allProducts.filter(p => {
    const mc = currentCategory === '全部商品' || (p.category || '其他') === currentCategory;
    const ms = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return mc && ms;
  });

  // 排序
  if (sortBy === 'sales') filtered = [...filtered].sort((a, b) => (b.sales || 0) - (a.sales || 0));
  else if (sortBy === 'price_asc') filtered = [...filtered].sort((a, b) => a.price - b.price);
  else if (sortBy === 'price_desc') filtered = [...filtered].sort((a, b) => b.price - a.price);
  else if (sortBy === 'stock') filtered = [...filtered].sort((a, b) => b.stock - a.stock);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const pageProducts = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const openOrder = (id) => { const p = allProducts.find(x => x.id === id); if (!p || p.stock <= 0) return; setSelectedProduct(p); setOrderContact(''); setShowOrderModal(true); };

  const submitOrder = async () => {
    if (!selectedProduct) return;
    const contact = orderContact.trim();
    if (!contact) { showToast('请输入联系方式', 'warning'); return; }
    if (contact.length < 5) { showToast('联系方式不少于5位', 'warning'); return; }
    if (!/^[a-zA-Z0-9]+$/.test(contact)) { showToast('联系方式只能是数字或字母', 'warning'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/create-order`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: selectedProduct.id, quantity: 1, contact }) });
      const data = await res.json();
      if (data.success) {
        setCurrentOrder(data.order); setShowOrderModal(false); setShowQrModal(true);
        setTimeout(() => { if (qrRef.current && window.QRCode) { qrRef.current.innerHTML = ''; new window.QRCode(qrRef.current, { text: data.qrCode, width: 200, height: 200, correctLevel: window.QRCode.CorrectLevel.H }); } }, 100);
        startPolling(data.order.order_no);
      } else showToast(data.message || '创建订单失败', 'error');
    } catch (e) { showToast('网络错误', 'error'); } finally { setLoading(false); }
  };

  const startPolling = (orderNo) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/query-order?orderNo=${orderNo}`);
        const data = await res.json();
        if (data.success && data.order.status === 'paid') { clearInterval(pollTimerRef.current); setShowQrModal(false); setCurrentOrder(data.order); setShowSuccess(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      } catch (e) { console.error(e); }
    }, 3000);
  };

  const closeQr = () => { if (pollTimerRef.current) clearInterval(pollTimerRef.current); setShowQrModal(false); setCurrentOrder(null); };

  const backHome = () => { if (pollTimerRef.current) clearInterval(pollTimerRef.current); setShowSuccess(false); setCurrentOrder(null); setSelectedProduct(null); setCurrentCategory('全部商品'); setSearchQuery(''); loadProducts(); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const doQuery = async () => {
    if (!queryOrderNo.trim()) { showToast('请输入订单编号', 'warning'); return; }
    setQueryResult('<div style="text-align:center;padding:20px;">查询中...</div>');
    try {
      const res = await fetch(`${API_BASE}/query-order?orderNo=${encodeURIComponent(queryOrderNo)}`);
      const data = await res.json();
      if (data.success) {
        const o = data.order;
        let h = `<div style="background:#f5f7fa;border-radius:8px;padding:14px;margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;"><span style="color:#8c8c8c;">商品</span><span style="font-weight:500;">${o.product_name}</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;"><span style="color:#8c8c8c;">数量</span><span>${o.quantity}</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;"><span style="color:#8c8c8c;">金额</span><span style="color:#ff4d4f;font-weight:600;">¥${Number(o.amount).toFixed(2)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;"><span style="color:#8c8c8c;">状态</span><span>${o.status === 'paid' ? '已支付' : o.status === 'pending' ? '待支付' : '已失败'}</span></div>
        </div>`;
        if (o.status === 'paid' && o.cards && o.cards.length > 0) {
          h += '<div style="font-size:13px;color:#595959;margin-bottom:8px;font-weight:600;">卡密信息：</div>';
          h += o.cards.map((c, i) => `<div style="background:#f5f7fa;border:1px solid #f0f0f0;border-radius:8px;padding:12px;margin-bottom:8px;"><div style="font-size:12px;color:#8c8c8c;margin-bottom:4px;">卡密 ${i + 1}</div><div style="font-size:13px;font-family:monospace;word-break:break-all;user-select:all;">${c.card_content}</div></div>`).join('');
        } else if (o.status === 'pending') h += '<div style="text-align:center;padding:12px;color:#faad14;font-size:13px;">订单待支付，请完成支付后再查询</div>';
        setQueryResult(h);
      } else setQueryResult(`<div style="text-align:center;padding:20px;color:#ff4d4f;font-size:14px;">${data.message || '查询失败'}</div>`);
    } catch (e) { setQueryResult('<div style="text-align:center;padding:20px;color:#ff4d4f;font-size:14px;">网络错误</div>'); }
  };

  const copyAll = () => {
    if (!currentOrder?.cards) return;
    const text = currentOrder.cards.map((c, i) => `卡密${i + 1}：${c.card_content}`).join('\n');
    navigator.clipboard.writeText(text).then(() => showToast('已复制', 'success')).catch(() => { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); showToast('已复制', 'success'); });
  };

  const esc = (t) => { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; };

  const getImg = (p) => {
    if (p.image) return p.image;
    const colors = ['#667eea', '#f5576c', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#a8edea', '#ff9a9e', '#a18cd1', '#fbc2eb'];
    const c = colors[p.id % colors.length];
    return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="140"><rect fill="${c}" width="200" height="140"/><text x="50%" y="50%" font-size="40" fill="white" text-anchor="middle" dominant-baseline="middle">🎁</text></svg>`)}`;
  };

  const getTag = (p) => {
    if (p.stock <= 0) return { text: '已售空', color: 'rgba(0,0,0,0.6)' };
    if (p.category && p.category.includes('实物')) return { text: '实物发货', color: '#ff9500' };
    if (p.category && p.category.includes('人工')) return { text: '人工服务', color: '#722ed1' };
    return { text: '自动发货', color: '#1677ff' };
  };

  return (
    <>
      <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>

      {/* 顶部导航栏 - 蓝色 */}
      <nav className="dc-topbar">
        <div className="dc-topbar-inner">
          <div className="dc-topbar-left">
            <div className="dc-topbar-logo">
              <div className="dc-topbar-logo-icon">DC</div>
              <div className="dc-topbar-logo-text">
                <div className="dc-topbar-title">{siteSettings.site_name || 'DCSHOP多财商城'}</div>
                <div className="dc-topbar-sub">订单问题请查看买家帮助</div>
              </div>
            </div>
            <div className="dc-topbar-nav">
              <a href="#" className="dc-topbar-nav-item active" onClick={(e) => { e.preventDefault(); backHome(); }}>🏠 首页</a>
              <a href="#" className="dc-topbar-nav-item">👤 个人博客</a>
            </div>
          </div>
          <div className="dc-topbar-right">
            <button className="dc-topbar-icon" title="搜索">🔍</button>
            <button className="dc-topbar-icon" title="用户">👤</button>
            <button className="dc-topbar-btn" onClick={() => setShowQueryModal(true)}>查询订单</button>
            <button className="dc-topbar-btn">买家帮助</button>
          </div>
        </div>
      </nav>

      {/* 主内容区 */}
      {!showSuccess && (
        <div className="dc-container">
          {/* 上半部分：轮播图 + 公告 */}
          <div className="dc-top-section">
            <div className="dc-banner-wrap">
              <div className="dc-banner" style={{ background: banners[currentBanner].bg }}>
                <div className="dc-banner-content">
                  <div className="dc-banner-left">
                    <div className="dc-banner-logo">
                      <span className="dc-banner-logo-icon">🐕</span>
                      <div>
                        <div className="dc-banner-logo-title">DCSHOP</div>
                        <div className="dc-banner-logo-sub">多财商城</div>
                      </div>
                    </div>
                    <h1 className="dc-banner-title">{banners[currentBanner].title}</h1>
                    <p className="dc-banner-sub">{banners[currentBanner].sub}</p>
                    <div className="dc-banner-features">
                      <span className="dc-banner-feature">✅ 官方正版</span>
                      <span className="dc-banner-feature">📦 品类齐全</span>
                      <span className="dc-banner-feature">⚡ 极速发货</span>
                      <span className="dc-banner-feature">🛡️ 安全可靠</span>
                    </div>
                    <button className="dc-banner-btn">立即选购 →</button>
                  </div>
                  <div className="dc-banner-right">
                    <div className="dc-banner-mascot">{banners[currentBanner].icon}</div>
                  </div>
                </div>
              </div>
              <div className="dc-banner-arrows">
                <span className="dc-banner-arrow" onClick={() => setCurrentBanner((currentBanner - 1 + banners.length) % banners.length)}>‹</span>
                <span className="dc-banner-arrow" onClick={() => setCurrentBanner((currentBanner + 1) % banners.length)}>›</span>
              </div>
              <div className="dc-banner-dots">
                {banners.map((_, i) => <span key={i} className={`dc-banner-dot ${currentBanner === i ? 'active' : ''}`} onClick={() => setCurrentBanner(i)} />)}
              </div>
            </div>

            {/* 公告 */}
            <div className="dc-notice-card">
              <div className="dc-notice-header">
                <span className="dc-notice-icon">🔔</span>
                <span className="dc-notice-title">网站公告</span>
              </div>
              <div className="dc-notice-body">
                <p>欢迎来到 <strong>DCSHOP 多财商城</strong>！本站基于 DCSHOP 多财商城免费系统搭建。</p>
                <p>全部商品 <strong style={{ color: '#ff4d4f' }}>仅演示测试请勿下单</strong></p>
                <div className="dc-notice-demo">
                  <p>演示账号：admin　演示密码：admin123</p>
                  <p style={{ color: '#faad14' }}>⚠️ 演示后台数据30分钟内会自动恢复默认！</p>
                </div>
              </div>
            </div>
          </div>

          {/* 提示条 */}
          <div className="dc-tip-bar">
            <span className="dc-tip-icon">🔒</span>
            <span>本站全部商品 7×24 小时全自动发货，下单即时收货</span>
          </div>

          {/* 分类图标导航 */}
          <div className="dc-cat-icons">
            <div className="dc-cat-icons-scroll">
              {catIcons.map((cat, i) => (
                <div key={i} className="dc-cat-icon-item">
                  <div className="dc-cat-icon">{cat.icon}</div>
                  <span className="dc-cat-icon-name">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 商品区：左侧分类 + 右侧商品列表 */}
          <div className="dc-product-section">
            {/* 左侧分类边栏 */}
            <div className="dc-sidebar">
              <div className="dc-sidebar-title">
                <span className="dc-sidebar-title-icon">📋</span>
                商品分类
              </div>
              <div className="dc-sidebar-list">
                <div className={`dc-sidebar-item ${currentCategory === '全部商品' ? 'active' : ''}`} onClick={() => { setCurrentCategory('全部商品'); setCurrentPage(1); }}>
                  <span className="dc-sidebar-item-name">全部商品</span>
                </div>
                {Object.entries(categories).map(([cat, count]) => (
                  <div key={cat} className={`dc-sidebar-item ${currentCategory === cat ? 'active' : ''}`} onClick={() => { setCurrentCategory(cat); setCurrentPage(1); }}>
                    <span className="dc-sidebar-item-dot">›</span>
                    <span className="dc-sidebar-item-name">{esc(cat)}</span>
                    <span className="dc-sidebar-item-count">({count})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 右侧商品列表 */}
            <div className="dc-product-main">
              {/* 排序栏 */}
              <div className="dc-sort-bar">
                <div className="dc-sort-left">
                  <button className={`dc-sort-btn ${sortBy === 'default' ? 'active' : ''}`} onClick={() => setSortBy('default')}>88 综合</button>
                  <button className={`dc-sort-btn ${sortBy === 'sales' ? 'active' : ''}`} onClick={() => setSortBy('sales')}>🔥 销量</button>
                  <button className={`dc-sort-btn ${sortBy === 'price_asc' ? 'active' : ''}`} onClick={() => setSortBy('price_asc')}>◇ 价格</button>
                  <button className={`dc-sort-btn ${sortBy === 'stock' ? 'active' : ''}`} onClick={() => setSortBy('stock')}>◇ 库存</button>
                </div>
                <div className="dc-sort-right">
                  <input type="text" placeholder="输入商品关键词搜索" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
                  <button onClick={() => setCurrentPage(1)}>🔍</button>
                </div>
              </div>

              {/* 商品列表 - 横向卡片 2列 */}
              <div className="dc-product-list">
                {pageProducts.length === 0 ? (
                  <div className="dc-empty"><div className="dc-empty-icon">📦</div><p>暂无商品</p></div>
                ) : pageProducts.map(p => {
                  const inStock = p.stock > 0;
                  const tag = getTag(p);
                  return (
                    <div key={p.id} className={`dc-product-item ${!inStock ? 'oos' : ''}`} onClick={() => inStock && openOrder(p.id)}>
                      <div className="dc-product-img">
                        <img src={getImg(p)} alt={p.name} />
                        <span className="dc-product-tag" style={{ background: tag.color }}>{tag.text}</span>
                      </div>
                      <div className="dc-product-info">
                        <h3 className="dc-product-name">{esc(p.name)}</h3>
                        <p className="dc-product-desc">{esc(p.description || '暂无商品描述')}</p>
                        <div className="dc-product-bottom">
                          <div className="dc-product-price">
                            <span className="dc-price-now">¥{Number(p.price).toFixed(2)}</span>
                            {p.original_price && p.original_price > p.price && <span className="dc-price-unit">/件</span>}
                            {p.original_price && p.original_price > p.price && <span className="dc-price-old">¥{Number(p.original_price).toFixed(2)}</span>}
                          </div>
                          <button className="dc-buy-btn" disabled={!inStock} onClick={(e) => { e.stopPropagation(); inStock && openOrder(p.id); }}>立即购买</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="dc-pagination">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>上一页</button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pg = i + 1;
                    if (currentPage > 3 && totalPages > 5) pg = currentPage - 2 + i;
                    if (pg > totalPages) pg = totalPages - (4 - i);
                    return <button key={pg} className={currentPage === pg ? 'active' : ''} onClick={() => setCurrentPage(pg)}>{pg}</button>;
                  })}
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>下一页</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 支付成功页面 */}
      {showSuccess && (
        <div className="dc-container">
          <div className="dc-success-card">
            <div className="dc-success-icon">✓</div>
            <h2>支付成功 · 卡密已发放</h2>
            <p className="dc-success-tip">请妥善保管以下卡密，关闭页面后可通过订单号查询</p>
            <div className="dc-card-list">
              {currentOrder?.cards?.map((c, i) => (
                <div key={i} className="dc-card-item">
                  <div className="dc-card-label"><span>卡密 {i + 1}</span><button onClick={() => { navigator.clipboard.writeText(c.card_content); showToast('已复制', 'success'); }}>复制</button></div>
                  <p className="dc-card-value">{esc(c.card_content)}</p>
                </div>
              ))}
            </div>
            <div className="dc-btn-group">
              <button className="dc-btn dc-btn-primary" onClick={copyAll}>复制全部卡密</button>
              <button className="dc-btn dc-btn-secondary" onClick={backHome}>返回首页</button>
            </div>
          </div>
        </div>
      )}

      {/* 右下角客服 */}
      {!showSuccess && (
        <div className="dc-service">
          <div className="dc-service-icon">🐕</div>
          <span className="dc-service-text">买家帮助</span>
        </div>
      )}

      {/* 下单弹窗 */}
      {showOrderModal && (
        <div className="dc-modal" onClick={(e) => e.target === e.currentTarget && setShowOrderModal(false)}>
          <div className="dc-modal-box">
            <span className="dc-modal-close" onClick={() => setShowOrderModal(false)}>&times;</span>
            <h3 className="dc-modal-title">{selectedProduct?.name}</h3>
            <div className="dc-modal-amount">¥{selectedProduct ? Number(selectedProduct.price).toFixed(2) : '0.00'}</div>
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
            <button className="dc-submit" onClick={submitOrder} disabled={loading}>{loading ? '创建订单中...' : '立即支付购买'}</button>
          </div>
        </div>
      )}

      {/* 二维码弹窗 */}
      {showQrModal && (
        <div className="dc-modal">
          <div className="dc-modal-box dc-qr-box">
            <span className="dc-modal-close" onClick={closeQr}>&times;</span>
            <h3 className="dc-modal-title">{currentOrder?.product_name}</h3>
            <div className="dc-modal-amount">¥{currentOrder ? Number(currentOrder.amount).toFixed(2) : '0.00'}</div>
            <div className="dc-qr-wrap"><div ref={qrRef} style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="loading"></span></div></div>
            <p className="dc-qr-tip">{siteSettings.payment_tip || '请使用支付宝扫码支付，支付成功后将自动跳转'}</p>
            <p className="dc-order-no">订单号：{currentOrder?.order_no}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="dc-btn dc-btn-primary" style={{ flex: 1 }} onClick={() => currentOrder && startPolling(currentOrder.order_no)}>我已完成支付</button>
              <button className="dc-btn dc-btn-secondary" style={{ flex: 1 }} onClick={closeQr}>取消支付</button>
            </div>
          </div>
        </div>
      )}

      {/* 订单查询弹窗 */}
      {showQueryModal && (
        <div className="dc-modal" onClick={(e) => e.target === e.currentTarget && setShowQueryModal(false)}>
          <div className="dc-modal-box" style={{ maxWidth: 480, textAlign: 'left' }}>
            <span className="dc-modal-close" onClick={() => setShowQueryModal(false)}>&times;</span>
            <h3 className="dc-modal-title" style={{ textAlign: 'left', marginBottom: 16 }}>订单查询</h3>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <input type="text" placeholder="请输入订单编号" style={{ flex: 1, padding: '10px 12px', border: '1.5px solid #e8e8e8', borderRadius: 8, fontSize: 14 }} value={queryOrderNo} onChange={(e) => setQueryOrderNo(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && doQuery()} />
              <button className="dc-btn dc-btn-primary" style={{ flex: 'none', padding: '10px 24px' }} onClick={doQuery}>查询</button>
            </div>
            {queryResult && <div dangerouslySetInnerHTML={{ __html: queryResult }} />}
          </div>
        </div>
      )}

      {toast && <div className={`dc-toast ${toast.type}`}>{toast.message}</div>}
    </>
  );
}
