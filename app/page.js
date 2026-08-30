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
    <div style={{minHeight: '100vh', background: '#f8fafc'}}>
      {/* 导航栏 - 移动端适配 */}
      <nav style={{
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 16px',
          minHeight: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          {/* Logo */}
          <div style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}} onClick={() => router.push('/')}>
            <div style={{
              width: '32px', height: '32px',
              background: '#2563eb',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: '14px',
              flexShrink: 0
            }}>N</div>
            <span style={{fontSize: '16px', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap'}}>
              {settings.site_name || '甜甜发卡'}
            </span>
          </div>

          {/* 右侧按钮 */}
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <button
              onClick={() => router.push('/query')}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#4b5563',
                background: '#fff',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >订单查询</button>
            <button
              onClick={() => router.push('/admin')}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#fff',
                background: '#2563eb',
                border: '1px solid #2563eb',
                borderRadius: '8px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >管理后台</button>
          </div>

          {/* 搜索框 - 独占一行 */}
          <div style={{width: '100%', position: 'relative', paddingBottom: '10px'}}>
            <input
              type="text"
              placeholder="搜索商品..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                background: '#fff'
              }}
            />
            <span style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', opacity: 0.5, marginTop: '-5px'}}>🔍</span>
          </div>
        </div>
      </nav>

      <div style={{maxWidth: '1200px', margin: '0 auto', padding: '16px'}}>
        {/* 公告栏 */}
        {settings.notice && (
          <div style={{
            marginBottom: '16px',
            padding: '10px 14px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflow: 'hidden'
          }}>
            <span style={{fontSize: '14px', flexShrink: 0}}>📢</span>
            <div style={{flex: 1, overflow: 'hidden', whiteSpace: 'nowrap'}}>
              <div style={{
                display: 'inline-block',
                animation: 'marquee 20s linear infinite',
                fontSize: '13px',
                color: '#1e40af'
              }}>
                {settings.notice}
              </div>
            </div>
          </div>
        )}

        {/* 分类标签 */}
        <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch'}}>
          <div
            onClick={() => setActiveCategory('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              background: activeCategory === 'all' ? '#2563eb' : '#fff',
              color: activeCategory === 'all' ? '#fff' : '#4b5563',
              border: `1px solid ${activeCategory === 'all' ? '#2563eb' : '#d1d5db'}`,
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >全部商品</div>
          {categories.map((cat, i) => (
            <div
              key={i}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                background: activeCategory === cat ? '#2563eb' : '#fff',
                color: activeCategory === cat ? '#fff' : '#4b5563',
                border: `1px solid ${activeCategory === cat ? '#2563eb' : '#d1d5db'}`,
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >{cat}</div>
          ))}
        </div>

        {/* 商品网格 - 手机端两列 */}
        {loading ? (
          <div style={{textAlign: 'center', padding: '60px 20px', color: '#9ca3af'}}>
            <div style={{fontSize: '32px', marginBottom: '12px'}}>⏳</div>
            加载中...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb'}}>
            <div style={{fontSize: '48px', marginBottom: '12px', opacity: 0.5}}>📦</div>
            <div style={{fontSize: '14px', color: '#6b7280'}}>暂无商品</div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px'
          }}>
            {filteredProducts.map((p, i) => (
              <div
                key={p.id}
                onClick={() => openBuy(p)}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-out',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                {/* 商品图片 */}
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
                    <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', background: '#f3f4f6'}}>🎁</div>
                  )}
                </div>

                {/* 商品信息 */}
                <div style={{padding: '10px 12px 12px'}}>
                  {/* 商品名称 */}
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#111827',
                    marginBottom: '8px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>{p.name}</div>

                  {/* 价格行 */}
                  <div style={{display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px'}}>
                    <span style={{
                      fontSize: '17px',
                      fontWeight: 700,
                      color: '#dc2626'
                    }}>
                      <span style={{fontSize: '11px'}}>¥</span>{p.price}
                    </span>
                    {p.original_price && p.original_price > p.price && (
                      <span style={{
                        fontSize: '11px',
                        color: '#9ca3af',
                        textDecoration: 'line-through',
                        fontWeight: 400
                      }}>¥{p.original_price}</span>
                    )}
                    {/* 库存标签 */}
                    <span style={{
                      marginLeft: 'auto',
                      padding: '2px 8px',
                      background: p.stock > 0 ? '#d1fae5' : '#fee2e2',
                      color: p.stock > 0 ? '#065f46' : '#991b1b',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 500,
                      flexShrink: 0
                    }}>
                      {p.stock > 0 ? `剩${p.stock}` : '售空'}
                    </span>
                  </div>

                  {/* 已售 */}
                  <div style={{
                    fontSize: '12px',
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
      <footer style={{
        textAlign: 'center',
        padding: '20px 16px',
        fontSize: '12px',
        color: '#9ca3af',
        borderTop: '1px solid #f3f4f6',
        marginTop: '32px'
      }}>
        <div style={{marginBottom: '4px'}}>
          {settings.site_name || '甜甜发卡'} © {new Date().getFullYear()}
          {settings.icp && <span style={{marginLeft: '12px'}}>{settings.icp}</span>}
        </div>
        {settings.footer && <div>{settings.footer}</div>}
      </footer>

      {/* 购买弹窗 */}
      {showBuy && selectedProduct && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }} onClick={() => !order && setShowBuy(false)}>
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '440px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #f3f4f6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{fontSize: '16px', fontWeight: 600, color: '#111827'}}>{order ? '支付结果' : '确认下单'}</div>
              <div style={{fontSize: '24px', color: '#9ca3af', cursor: 'pointer', lineHeight: 1}} onClick={() => { setShowBuy(false); setOrder(null); }}>×</div>
            </div>

            <div style={{padding: '20px'}}>
              {!order ? (
                <>
                  <div style={{padding: '12px', background: '#f9fafb', borderRadius: '8px', marginBottom: '16px'}}>
                    <div style={{fontWeight: 600, color: '#111827', marginBottom: '6px', fontSize: '14px'}}>{selectedProduct.name}</div>
                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#6b7280'}}>
                      <span>单价：¥{selectedProduct.price}</span>
                      <span>库存：{selectedProduct.stock}</span>
                    </div>
                  </div>

                  <div style={{marginBottom: '14px'}}>
                    <label style={{display: 'block', fontSize: '13px', fontWeight: 500, color: '#4b5563', marginBottom: '6px'}}>邮箱地址（用于接收卡密）</label>
                    <input
                      type="email"
                      placeholder="请输入您的邮箱"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{marginBottom: '16px'}}>
                    <label style={{display: 'block', fontSize: '13px', fontWeight: 500, color: '#4b5563', marginBottom: '6px'}}>购买数量</label>
                    <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        style={{
                          width: '36px', height: '36px',
                          background: '#fff',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '16px',
                          cursor: 'pointer'
                        }}
                      >-</button>
                      <span style={{fontSize: '16px', fontWeight: 600, color: '#111827', minWidth: '32px', textAlign: 'center'}}>{quantity}</span>
                      <button
                        onClick={() => setQuantity(Math.min(selectedProduct.stock, quantity + 1))}
                        style={{
                          width: '36px', height: '36px',
                          background: '#fff',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '16px',
                          cursor: 'pointer'
                        }}
                      >+</button>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    background: '#eff6ff',
                    borderRadius: '8px',
                    marginBottom: '16px'
                  }}>
                    <span style={{fontSize: '14px', color: '#4b5563'}}>合计金额</span>
                    <span style={{fontSize: '18px', fontWeight: 700, color: '#2563eb'}}><span style={{fontSize: '13px'}}>¥</span>{(selectedProduct.price * quantity).toFixed(2)}</span>
                  </div>

                  <button
                    onClick={handleBuy}
                    disabled={ordering || selectedProduct.stock <= 0}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '15px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
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
                        <div key={i} style={{
                          padding: '10px 12px',
                          background: '#f9fafb',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          marginBottom: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span style={{fontSize: '12px', fontFamily: 'monospace', color: '#2563eb', wordBreak: 'break-all', flex: 1}}>{card.card_content || card.content || card}</span>
                          <button
                            onClick={() => copyCard(card.card_content || card.content || card)}
                            style={{
                              padding: '4px 10px',
                              fontSize: '11px',
                              background: '#fff',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              color: '#4b5563',
                              cursor: 'pointer',
                              flexShrink: 0,
                              marginLeft: '8px'
                            }}
                          >复制</button>
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

            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid #f3f4f6',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              {!order ? (
                <button
                  onClick={() => setShowBuy(false)}
                  style={{
                    padding: '8px 16px',
                    background: '#fff',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#4b5563',
                    cursor: 'pointer'
                  }}
                >取消</button>
              ) : (
                <button
                  onClick={() => { setShowBuy(false); setOrder(null); router.push('/query'); }}
                  style={{
                    padding: '8px 16px',
                    background: '#2563eb',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >订单查询</button>
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
        @media (min-width: 768px) {
          .product-grid-desktop {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
