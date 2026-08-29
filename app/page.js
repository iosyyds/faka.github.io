'use client';

import { useState, useEffect, useRef } from 'react';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

export default function Home() {
  const [siteSettings, setSiteSettings] = useState({});
  const [allProducts, setAllProducts] = useState([]);
  const [currentCategory, setCurrentCategory] = useState('全部');
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
  const pollTimerRef = useRef(null);
  const qrRef = useRef(null);

  // 加载设置和商品
  useEffect(() => {
    loadSiteSettings();
    loadProducts();
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const loadSiteSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings`);
      const data = await res.json();
      if (data.success && data.settings) {
        setSiteSettings(data.settings);
        if (data.settings.site_name) document.title = data.settings.site_name;
      }
    } catch (err) {
      console.warn('加载设置失败:', err);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/products`);
      const data = await res.json();
      if (data.success && data.products.length > 0) {
        setAllProducts(data.products);
      }
    } catch (err) {
      console.error('加载商品失败:', err);
    }
  };

  // 分类统计
  const categories = {};
  allProducts.forEach(p => {
    const cat = p.category || '全部';
    categories[cat] = (categories[cat] || 0) + 1;
  });

  // 筛选商品
  const filteredProducts = allProducts.filter(p => {
    const matchCategory = currentCategory === '全部' || (p.category || '全部') === currentCategory;
    const matchSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const openOrderModal = (productId) => {
    const product = allProducts.find(p => p.id === productId);
    if (!product || product.stock <= 0) return;
    setSelectedProduct(product);
    setOrderContact('');
    setShowOrderModal(true);
  };

  const submitOrder = async () => {
    if (!selectedProduct) return;
    const contact = orderContact.trim();
    if (!contact) {
      showToast('请输入联系方式', 'warning');
      return;
    }
    if (contact.length < 5) {
      showToast('联系方式不少于5位', 'warning');
      return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(contact)) {
      showToast('联系方式只能是数字或字母', 'warning');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProduct.id, quantity: 1, contact })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentOrder(data.order);
        setShowOrderModal(false);
        setShowQrModal(true);
        // 生成二维码
        setTimeout(() => {
          if (qrRef.current && window.QRCode) {
            qrRef.current.innerHTML = '';
            new window.QRCode(qrRef.current, {
              text: data.qrCode,
              width: 200,
              height: 200,
              correctLevel: window.QRCode.CorrectLevel.H
            });
          }
        }, 100);
        // 开始轮询
        startPolling(data.order.order_no);
      } else {
        showToast(data.message || '创建订单失败', 'error');
      }
    } catch (err) {
      console.error('创建订单失败:', err);
      showToast('网络错误，请稍后重试', 'error');
    } finally {
      setLoading(false);
    }
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
      } catch (err) {
        console.error('查询订单失败:', err);
      }
    }, 3000);
  };

  const closeQrModal = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    setShowQrModal(false);
    setCurrentOrder(null);
  };

  const backToHome = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    setShowSuccess(false);
    setCurrentOrder(null);
    setSelectedProduct(null);
    setCurrentCategory('全部');
    setSearchQuery('');
    loadProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const doQueryOrder = async () => {
    if (!queryOrderNo.trim()) {
      showToast('请输入订单编号', 'warning');
      return;
    }
    setQueryResult('<div style="text-align:center;padding:20px;">查询中...</div>');
    try {
      const res = await fetch(`${API_BASE}/query-order?orderNo=${encodeURIComponent(queryOrderNo)}`);
      const data = await res.json();
      if (data.success) {
        const order = data.order;
        let html = `
          <div style="background:#f5f7fa;border-radius:8px;padding:14px;margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">
              <span style="color:#8c8c8c;">商品</span><span style="font-weight:500;">${order.product_name}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">
              <span style="color:#8c8c8c;">数量</span><span>${order.quantity}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">
              <span style="color:#8c8c8c;">金额</span><span style="color:#ff4d4f;font-weight:600;">¥${Number(order.amount).toFixed(2)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">
              <span style="color:#8c8c8c;">状态</span><span>${order.status === 'paid' ? '已支付' : order.status === 'pending' ? '待支付' : '已失败'}</span>
            </div>
          </div>`;
        if (order.status === 'paid' && order.cards && order.cards.length > 0) {
          html += '<div style="font-size:13px;color:#595959;margin-bottom:8px;font-weight:600;">卡密信息：</div>';
          html += order.cards.map((card, idx) => `
            <div style="background:#f5f7fa;border:1px solid #f0f0f0;border-radius:8px;padding:12px;margin-bottom:8px;">
              <div style="font-size:12px;color:#8c8c8c;margin-bottom:4px;">卡密 ${idx + 1}</div>
              <div style="font-size:13px;font-family:monospace;word-break:break-all;user-select:all;">${card.card_content}</div>
            </div>
          `).join('');
        } else if (order.status === 'pending') {
          html += '<div style="text-align:center;padding:12px;color:#faad14;font-size:13px;">订单待支付，请完成支付后再查询</div>';
        }
        setQueryResult(html);
      } else {
        setQueryResult(`<div style="text-align:center;padding:20px;color:#ff4d4f;font-size:14px;">${data.message || '查询失败'}</div>`);
      }
    } catch (err) {
      setQueryResult('<div style="text-align:center;padding:20px;color:#ff4d4f;font-size:14px;">网络错误，请稍后重试</div>');
    }
  };

  const copyAllCards = () => {
    if (!currentOrder || !currentOrder.cards) return;
    const text = currentOrder.cards.map((c, i) => `卡密${i + 1}：${c.card_content}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      showToast('卡密已复制到剪贴板', 'success');
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast('卡密已复制到剪贴板', 'success');
    });
  };

  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  return (
    <>
      <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>

      {/* 顶部导航 */}
      <nav className="shop-nav">
        <div className="shop-nav-inner">
          <a href="#" className="shop-logo" onClick={(e) => { e.preventDefault(); backToHome(); }}>
            {siteSettings.site_logo ? (
              <img src={siteSettings.site_logo} alt="logo" className="shop-logo-img" />
            ) : (
              <div className="shop-logo-icon">{(siteSettings.site_name || 'E').charAt(0)}</div>
            )}
            <span>{siteSettings.site_name || '自动发卡商城'}</span>
          </a>
          <div className="shop-nav-links">
            <button className="shop-nav-link" onClick={backToHome}>网站首页</button>
          </div>
          <div className="shop-nav-right">
            <button className="nav-login" onClick={() => setShowQueryModal(true)}>订单查询</button>
            <a href="/admin" className="nav-login">登录</a>
          </div>
        </div>
      </nav>

      {/* 主页面 */}
      {!showSuccess && (
        <div className="shop-main">
          <div className="product-panel">
            <div className="panel-header">
              <div className="panel-title">
                🛍️ 全部商品 <span className="count">{allProducts.length}</span>
              </div>
              <div className="search-box">
                <span className="icon">🔍</span>
                <input
                  type="text"
                  placeholder="搜索商品"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="category-tabs">
              <button
                className={`category-tab ${currentCategory === '全部' ? 'active' : ''}`}
                onClick={() => setCurrentCategory('全部')}
              >
                全部 <span className="cat-count">{allProducts.length}</span>
              </button>
              {Object.entries(categories).filter(([cat]) => cat !== '全部').map(([cat, count]) => (
                <button
                  key={cat}
                  className={`category-tab ${currentCategory === cat ? 'active' : ''}`}
                  onClick={() => setCurrentCategory(cat)}
                >
                  {escapeHtml(cat)} <span className="cat-count">{count}</span>
                </button>
              ))}
            </div>
            <div className="product-grid-v3">
              {filteredProducts.length === 0 ? (
                <div className="empty-state" style={{ gridColumn: '1/-1', padding: '40px' }}>
                  <div className="icon" style={{ fontSize: '40px', opacity: 0.4 }}>📦</div>
                  <p style={{ marginTop: '10px', color: '#8c8c8c' }}>暂无商品</p>
                </div>
              ) : (
                filteredProducts.map(p => {
                  const inStock = p.stock > 0;
                  return (
                    <div
                      key={p.id}
                      className="product-card-v3"
                      onClick={() => inStock && openOrderModal(p.id)}
                      style={{ cursor: inStock ? 'pointer' : 'not-allowed', opacity: inStock ? 1 : 0.6 }}
                    >
                      <div className="pc-top">
                        <div className="pc-name" title={p.name}>{escapeHtml(p.name)}</div>
                        <span className={`stock-tag ${inStock ? 'in-stock' : 'out-stock'}`}>
                          {inStock ? '有货' : '缺货'}
                        </span>
                      </div>
                      <div className="pc-bottom">
                        <span className="pc-price">¥{Number(p.price).toFixed(2)}</span>
                        <button
                          className="cart-btn"
                          disabled={!inStock}
                          onClick={(e) => { e.stopPropagation(); inStock && openOrderModal(p.id); }}
                          title="立即购买"
                        >🛒</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 支付成功页面 */}
      {showSuccess && (
        <div className="shop-main">
          <div className="success-wrap">
            <div className="success-icon">✓</div>
            <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>支付成功 · 卡密已发放</div>
            <div style={{ fontSize: '13px', color: '#faad14', marginBottom: '20px' }}>请妥善保管以下卡密，关闭页面后可通过订单号查询</div>
            <div className="card-list" style={{ textAlign: 'left' }}>
              {currentOrder?.cards?.map((card, idx) => (
                <div key={idx} className="card-item">
                  <div className="card-item-label">
                    <span>卡密 {idx + 1}{card.card_type && card.card_type !== 'default' ? `（${card.card_type}）` : ''}</span>
                    <button
                      className="copy-single-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(card.card_content);
                        showToast('已复制', 'success');
                      }}
                    >复制</button>
                  </div>
                  <p className="card-item-value">{escapeHtml(card.card_content)}</p>
                </div>
              ))}
            </div>
            <div className="btn-group" style={{ marginTop: '20px' }}>
              <button className="btn btn-primary" onClick={copyAllCards}>复制全部卡密</button>
              <button className="btn btn-secondary" onClick={backToHome}>返回首页</button>
            </div>
          </div>
        </div>
      )}

      {/* 页脚 */}
      <footer className="site-footer">
        <div className="footer-content">
          <div className="footer-text">{siteSettings.footer_text || `© ${new Date().getFullYear()} ${siteSettings.site_name || '自动发卡商城'}`}</div>
          {siteSettings.icp_number && (
            <a href="https://beian.miit.gov.cn" target="_blank" rel="noopener noreferrer" className="footer-icp">{siteSettings.icp_number}</a>
          )}
        </div>
      </footer>

      {/* 下单弹窗 */}
      {showOrderModal && (
        <div className="pay-modal" onClick={(e) => e.target === e.currentTarget && setShowOrderModal(false)}>
          <div className="pay-modal-box">
            <span className="pay-modal-close" onClick={() => setShowOrderModal(false)}>&times;</span>
            <div className="pay-modal-title">{selectedProduct?.name}</div>
            <div className="pay-modal-amount">¥{selectedProduct ? Number(selectedProduct.price).toFixed(2) : '0.00'}</div>
            <div className="pay-form-group">
              <div className="pay-form-label">联系方式 (邮箱/手机号/QQ，提取卡密凭证)</div>
              <input
                type="text"
                className="pay-form-input"
                placeholder="请输入5位以上数字或字母"
                value={orderContact}
                onChange={(e) => setOrderContact(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && submitOrder()}
              />
            </div>
            <div className="pay-form-group">
              <div className="pay-form-label">选择支付通道</div>
              <div className="pay-channels">
                <div className="pay-channel active">💙 支付宝</div>
                <div className="pay-channel disabled">💚 微信支付</div>
              </div>
            </div>
            <button className="pay-submit" onClick={submitOrder} disabled={loading}>
              {loading ? '创建订单中...' : '立即安全支付购买'}
            </button>
          </div>
        </div>
      )}

      {/* 二维码支付弹窗 */}
      {showQrModal && (
        <div className="pay-modal">
          <div className="pay-modal-box qr-modal-box">
            <span className="pay-modal-close" onClick={closeQrModal}>&times;</span>
            <div className="pay-modal-title">{currentOrder?.product_name}</div>
            <div className="pay-modal-amount">¥{currentOrder ? Number(currentOrder.amount).toFixed(2) : '0.00'}</div>
            <div className="qr-wrapper">
              <div ref={qrRef} style={{ width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="loading"></span>
              </div>
            </div>
            <div className="qr-tip">{siteSettings.payment_tip || '请使用支付宝扫码支付，支付成功后将自动跳转'}</div>
            <div className="qr-order-no">订单号：{currentOrder?.order_no}</div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => currentOrder && startPolling(currentOrder.order_no)}>我已完成支付</button>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={closeQrModal}>取消支付</button>
            </div>
          </div>
        </div>
      )}

      {/* 订单查询弹窗 */}
      {showQueryModal && (
        <div className="pay-modal" onClick={(e) => e.target === e.currentTarget && setShowQueryModal(false)}>
          <div className="pay-modal-box" style={{ maxWidth: '480px', textAlign: 'left' }}>
            <span className="pay-modal-close" onClick={() => setShowQueryModal(false)}>&times;</span>
            <div className="pay-modal-title" style={{ textAlign: 'left', marginBottom: '16px' }}>订单查询</div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <input
                type="text"
                className="pay-form-input"
                placeholder="请输入订单编号"
                style={{ flex: 1 }}
                value={queryOrderNo}
                onChange={(e) => setQueryOrderNo(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && doQueryOrder()}
              />
              <button className="btn btn-primary" style={{ flex: 'none', padding: '10px 24px' }} onClick={doQueryOrder}>查询</button>
            </div>
            {queryResult && <div dangerouslySetInnerHTML={{ __html: queryResult }} />}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>{toast.message}</div>
      )}
    </>
  );
}
