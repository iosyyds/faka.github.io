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
    try {
      const res = await fetch(`${API_BASE}/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: selectedProduct.id, email, quantity, pay_method: 'epay' })
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
            <div className="nav-logo-icon-responsive">N</div>
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
        {/* 公告栏 */}
        {settings.notice && (
          <div className="notice-responsive">
            <span style={{fontSize: '16px', flexShrink: 0}}>📢</span>
            <div className="notice-content-responsive">
              <div className="notice-marquee-responsive">{settings.notice}</div>
            </div>
          </div>
        )}

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
        <div style={{marginBottom: '4px'}}>
          {settings.site_name || '甜甜发卡'} © {new Date().getFullYear()}
          {settings.icp && <span style={{marginLeft: '12px'}}>{settings.icp}</span>}
        </div>
        {settings.footer && <div>{settings.footer}</div>}
      </footer>

      {/* 购买弹窗 */}
      {showBuy && selectedProduct && (
        <div className="modal-overlay-responsive">
          <div className="modal-responsive" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-responsive">
              <div className="modal-title-responsive">{order ? '支付结果' : '确认下单'}</div>
              <div className="modal-close-responsive" onClick={() => { setShowBuy(false); setOrder(null); }}>×</div>
            </div>

            <div className="modal-body-responsive">
              {!order ? (
                <>
                  <div className="modal-product-info-responsive">
                    <div style={{fontWeight: 600, color: '#111827', marginBottom: '6px', fontSize: '14px'}}>{selectedProduct.name}</div>
                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#6b7280'}}>
                      <span>单价：¥{selectedProduct.price}</span>
                      <span>库存：{selectedProduct.stock}</span>
                    </div>
                  </div>

                  <div className="form-group-responsive">
                    <label className="form-label-responsive">邮箱地址（用于接收卡密）</label>
                    <input
                      type="email"
                      placeholder="请输入您的邮箱"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="form-input-responsive"
                    />
                  </div>

                  <div className="form-group-responsive">
                    <label className="form-label-responsive">购买数量</label>
                    <div className="quantity-selector-responsive">
                      <button className="quantity-btn-responsive" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                      <span className="quantity-value-responsive">{quantity}</span>
                      <button className="quantity-btn-responsive" onClick={() => setQuantity(Math.min(selectedProduct.stock, quantity + 1))}>+</button>
                    </div>
                  </div>

                  <div className="modal-total-responsive">
                    <span style={{fontSize: '14px', color: '#4b5563'}}>合计金额</span>
                    <span style={{fontSize: '18px', fontWeight: 700, color: '#2563eb'}}><span style={{fontSize: '13px'}}>¥</span>{(selectedProduct.price * quantity).toFixed(2)}</span>
                  </div>

                  <button
                    onClick={handleBuy}
                    disabled={ordering || selectedProduct.stock <= 0}
                    className="modal-submit-responsive"
                  >
                    {ordering ? '处理中...' : `确认支付 ¥${(selectedProduct.price * quantity).toFixed(2)}`}
                  </button>
                </>
              ) : (
                <div style={{textAlign: 'center'}}>
                  <div style={{fontSize: '48px', marginBottom: '12px'}}>✅</div>
                  <h3 style={{fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '6px'}}>支付成功</h3>
                  <p style={{fontSize: '13px', color: '#6b7280', marginBottom: '16px'}}>订单号：{order.order_no || order.id}</p>
                  <p style={{fontSize: '12px', color: '#9ca3af', marginBottom: '16px'}}>卡密已发送至您的邮箱，也可在下方查看</p>
                  {order.cards && order.cards.length > 0 && (
                    <div style={{textAlign: 'left', marginBottom: '16px'}}>
                      <div style={{fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '10px'}}>您的卡密：</div>
                      {order.cards.map((card, i) => (
                        <div key={i} className="card-item-responsive">
                          <span className="card-content-responsive">{card.card_content || card.content || card}</span>
                          <button className="card-copy-btn-responsive" onClick={() => copyCard(card.card_content || card.content || card)}>复制</button>
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
              {!order ? (
                <button className="modal-cancel-btn-responsive" onClick={() => setShowBuy(false)}>取消</button>
              ) : (
                <button className="modal-query-btn-responsive" onClick={() => { setShowBuy(false); setOrder(null); router.push('/query'); }}>订单查询</button>
              )}
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
          padding: 16px 20px;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          justifyContent: space-between;
          alignItems: center;
        }
        .modal-title-responsive {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }
        .modal-close-responsive {
          font-size: 24px;
          color: #9ca3af;
          cursor: pointer;
          line-height: 1;
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
      `}</style>
    </div>
  );
}
