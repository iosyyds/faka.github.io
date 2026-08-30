'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

export default function Home() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({});
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // 购买弹窗状态
  const [showBuy, setShowBuy] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [email, setEmail] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [ordering, setOrdering] = useState(false);
  const [order, setOrder] = useState(null);

  useEffect(() => { loadData(); }, []);

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

  return (
    <div>
      {/* 导航栏 */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo" onClick={() => router.push('/')} style={{cursor:'pointer'}}>
            <div className="nav-logo-icon">N</div>
            <span>{settings.site_name || '甜甜发卡'}</span>
          </div>
          <div className="nav-right">
            <div style={{position: 'relative', width: '200px'}}>
              <input
                type="text"
                className="form-input"
                placeholder="搜索商品..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{paddingLeft: '36px', height: '38px'}}
              />
              <span style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', opacity: 0.5}}>🔍</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => router.push('/query')}>订单查询</button>
            <button className="btn btn-primary btn-sm" onClick={() => router.push('/admin')}>管理后台</button>
          </div>
        </div>
      </nav>

      <div className="container">
        {/* 公告栏 */}
        {settings.notice && (
          <div className="card" style={{
            marginBottom: '20px',
            padding: '12px 16px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{fontSize: '16px'}}>📢</span>
            <div style={{
              flex: 1,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              position: 'relative'
            }}>
              <div style={{
                display: 'inline-block',
                animation: 'marquee 20s linear infinite',
                fontSize: '14px',
                color: '#1e40af'
              }}>
                {settings.notice}
              </div>
            </div>
          </div>
        )}

        {/* 分类标签 */}
        <div className="category-tabs">
          <div className={`category-tab ${activeCategory === 'all' ? 'active' : ''}`} onClick={() => setActiveCategory('all')}>全部商品</div>
          {categories.map((cat, i) => (
            <div key={i} className={`category-tab ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>{cat}</div>
          ))}
        </div>

        {/* 商品网格 */}
        {loading ? (
          <div className="empty">
            <div className="spinner" style={{margin: '0 auto 16px'}}></div>
            <div className="empty-text">加载中...</div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="card">
            <div className="empty">
              <div className="empty-icon">📦</div>
              <div className="empty-text">暂无商品</div>
            </div>
          </div>
        ) : (
          <div className="product-grid">
            {filteredProducts.map((p, i) => (
              <div key={p.id} className="product-card animate-fade-in" style={{animationDelay: `${i * 0.03}s`}} onClick={() => openBuy(p)}>
                {/* 商品图片 - 大图 */}
                <div style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '4/3',
                  overflow: 'hidden',
                  background: '#f3f4f6'
                }}>
                  {p.image ? (
                    <img src={p.image} alt={p.name} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                  ) : (
                    <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '56px', background: '#f3f4f6'}}>🎁</div>
                  )}
                </div>

                {/* 商品信息 */}
                <div style={{padding: '14px 16px 16px'}}>
                  {/* 商品名称 */}
                  <div style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#111827',
                    marginBottom: '10px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    letterSpacing: '-0.01em'
                  }}>{p.name}</div>

                  {/* 价格行 */}
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px'}}>
                    <span style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#dc2626'
                    }}>
                      <span style={{fontSize: '13px'}}>¥</span>{p.price}
                    </span>
                    {p.original_price && p.original_price > p.price && (
                      <span style={{
                        fontSize: '13px',
                        color: '#9ca3af',
                        textDecoration: 'line-through',
                        fontWeight: 400
                      }}>¥{p.original_price}</span>
                    )}
                    {/* 库存标签 */}
                    <span style={{
                      marginLeft: 'auto',
                      padding: '3px 10px',
                      background: p.stock > 0 ? '#d1fae5' : '#fee2e2',
                      color: p.stock > 0 ? '#065f46' : '#991b1b',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: 500
                    }}>
                      {p.stock > 0 ? `剩 ${p.stock}` : '售空'}
                    </span>
                  </div>

                  {/* 已售 */}
                  <div style={{
                    fontSize: '13px',
                    color: '#9ca3af'
                  }}>
                    已售 {p.sales || 0}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 页脚 */}
      <footer className="footer">
        <div style={{marginBottom: '4px'}}>
          {settings.site_name || '甜甜发卡'} © {new Date().getFullYear()}
          {settings.icp && <span style={{marginLeft: '16px'}}>{settings.icp}</span>}
        </div>
        {settings.footer && <div>{settings.footer}</div>}
      </footer>

      {/* 购买弹窗 */}
      {showBuy && selectedProduct && (
        <div className="modal-overlay" onClick={() => !order && setShowBuy(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{order ? '支付结果' : '确认下单'}</div>
              <div className="modal-close" onClick={() => { setShowBuy(false); setOrder(null); }}>×</div>
            </div>
            <div className="modal-body">
              {!order ? (
                <>
                  <div style={{padding: '14px', background: '#f9fafb', borderRadius: '8px', marginBottom: '18px'}}>
                    <div style={{fontWeight: 600, color: '#111827', marginBottom: '6px'}}>{selectedProduct.name}</div>
                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#6b7280'}}>
                      <span>单价：¥{selectedProduct.price}</span>
                      <span>库存：{selectedProduct.stock}</span>
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
                      <button className="btn btn-secondary btn-sm" onClick={() => setQuantity(Math.min(selectedProduct.stock, quantity + 1))}>+</button>
                    </div>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: '#eff6ff', borderRadius: '8px', marginBottom: '18px'}}>
                    <span style={{fontSize: '14px', color: '#4b5563'}}>合计金额</span>
                    <span style={{fontSize: '20px', fontWeight: 700, color: '#2563eb'}}><span style={{fontSize: '14px'}}>¥</span>{(selectedProduct.price * quantity).toFixed(2)}</span>
                  </div>
                  <button className="btn btn-primary btn-lg" style={{width: '100%'}} disabled={ordering || selectedProduct.stock <= 0} onClick={handleBuy}>
                    {ordering ? '处理中...' : `确认支付 ¥${(selectedProduct.price * quantity).toFixed(2)}`}
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
                          <span style={{fontSize: '13px', fontFamily: 'monospace', color: '#2563eb', wordBreak: 'break-all'}}>{card.card_content || card.content || card}</span>
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

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        /* 手机端商品卡片样式 */
        @media (max-width: 768px) {
          .product-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 12px !important;
          }
          .product-card {
            border-radius: 12px !important;
          }
        }
      `}</style>
    </div>
  );
}
