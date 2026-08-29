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

  return (
    <div>
      {/* 导航栏 */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo" onClick={() => router.push('/')} style={{cursor:'pointer'}}>
            <div className="nav-logo-icon">N</div>
            <span>{settings.site_name || 'Nova Key'}</span>
          </div>
          <div className="nav-right">
            <div style={{position: 'relative', width: '240px'}}>
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
              <div key={p.id} className="product-card animate-fade-in" style={{animationDelay: `${i * 0.03}s`}} onClick={() => router.push(`/product/${p.id}`)}>
                <div className="product-card-img">
                  {p.image ? (
                    <img src={p.image} alt={p.name} />
                  ) : (
                    <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', background: '#f3f4f6'}}>🎁</div>
                  )}
                  <div className="product-card-tag" style={{
                    background: p.stock > 0 ? '#d1fae5' : '#fee2e2',
                    color: p.stock > 0 ? '#065f46' : '#991b1b'
                  }}>
                    {p.stock > 0 ? `库存 ${p.stock}` : '已售空'}
                  </div>
                  {p.category && (
                    <div className="product-card-tag" style={{
                      top: '10px',
                      left: 'auto',
                      right: '10px',
                      background: '#dbeafe',
                      color: '#1e40af'
                    }}>{p.category}</div>
                  )}
                </div>
                <div className="product-card-body">
                  <div className="product-card-name">{p.name}</div>
                  <div className="product-card-desc">{p.description || p.desc || '点击查看详情'}</div>
                  <div className="product-card-bottom">
                    <div className="product-card-price">
                      <small>¥</small>{p.price}
                      {p.original_price && p.original_price > p.price && (
                        <span style={{fontSize: '12px', color: '#9ca3af', textDecoration: 'line-through', marginLeft: '8px', fontWeight: 400}}>¥{p.original_price}</span>
                      )}
                    </div>
                    <button className="btn btn-primary btn-sm" disabled={p.stock <= 0} onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/product/${p.id}`);
                    }}>
                      立即购买
                    </button>
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
          {settings.site_name || 'Nova Key'} © {new Date().getFullYear()}
          {settings.icp && <span style={{marginLeft: '16px'}}>{settings.icp}</span>}
        </div>
        {settings.footer && <div>{settings.footer}</div>}
      </footer>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
