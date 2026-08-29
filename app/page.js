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

  useEffect(() => {
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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    if (activeCategory !== 'all' && p.category !== activeCategory) return false;
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <div className="noise-overlay"></div>

      <nav className="nav-glass">
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => router.push('/')}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(228,184,99,0.3), rgba(228,184,99,0.1))',
              border: '1px solid rgba(228,184,99,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#E4B863', fontWeight: 800, fontSize: '16px'
            }}>N</div>
            <span style={{ fontSize: '17px', fontWeight: 700, color: '#fff' }}>
              {settings.site_name || '夜航发卡'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-ghost" onClick={() => router.push('/query')}>订单查询</button>
            <button className="btn-gold" onClick={() => router.push('/admin')}>管理后台</button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        <div className="glass glass-lg animate-fade-in" style={{
          padding: '48px 40px', marginBottom: '32px', textAlign: 'center',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', top: '-50%', right: '-20%', width: '50%', height: '200%',
            background: 'radial-gradient(circle, rgba(228,184,99,0.08) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}></div>
          <h1 style={{
            fontSize: '36px', fontWeight: 800, marginBottom: '12px',
            background: 'linear-gradient(135deg, #fff 0%, #E4B863 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
          }}>
            {settings.site_name || '夜航发卡'}
          </h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', marginBottom: '28px' }}>
            {settings.site_subtitle || '安全、快捷、全自动的数字商品交易平台'}
          </p>
          <div style={{ maxWidth: '480px', margin: '0 auto', position: 'relative' }}>
            <input type="text" className="input-glass" placeholder="搜索商品..."
              value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: '48px' }} />
            <span style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', opacity: 0.5 }}>🔍</span>
          </div>
        </div>

        {settings.notice && (
          <div className="glass animate-fade-in" style={{
            padding: '14px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '16px'
          }}>
            <span style={{ fontSize: '18px' }}>📢</span>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>{settings.notice}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }} className="animate-fade-in">
          <div className={`category-tab ${activeCategory === 'all' ? 'active' : ''}`} onClick={() => setActiveCategory('all')}>全部商品</div>
          {categories.map((cat, i) => (
            <div key={i} className={`category-tab ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>{cat}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'rgba(255,255,255,0.5)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>加载中...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="glass" style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>📦</div>
            <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)' }}>暂无商品</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {filteredProducts.map((p, i) => (
              <div key={p.id} className="product-card animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }} onClick={() => router.push(`/product/${p.id}`)}>
                <div style={{ position: 'relative', aspectRatio: '16/9', background: 'rgba(255,255,255,0.03)', overflow: 'hidden' }}>
                  {p.image ? (
                    <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '56px', background: 'linear-gradient(135deg, rgba(228,184,99,0.08), rgba(124,156,196,0.08))' }}>🎁</div>
                  )}
                  <div style={{
                    position: 'absolute', top: '12px', left: '12px', padding: '5px 12px',
                    background: p.stock > 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                    border: `1px solid ${p.stock > 0 ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
                    color: p.stock > 0 ? '#34d399' : '#f87171',
                    borderRadius: '9999px', fontSize: '11px', fontWeight: 600, backdropFilter: 'blur(10px)'
                  }}>{p.stock > 0 ? '现货' : '售空'}</div>
                  {p.category && (
                    <div style={{
                      position: 'absolute', top: '12px', right: '12px', padding: '5px 12px',
                      background: 'rgba(228,184,99,0.15)', border: '1px solid rgba(228,184,99,0.3)',
                      color: '#E4B863', borderRadius: '9999px', fontSize: '11px', fontWeight: 500, backdropFilter: 'blur(10px)'
                    }}>{p.category}</div>
                  )}
                </div>
                <div style={{ padding: '18px 20px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  {p.description && (
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="price-gold" style={{ fontSize: '20px' }}>
                      <small>¥</small>{p.price}
                      {p.original_price && p.original_price > p.price && (
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', textDecoration: 'line-through', marginLeft: '8px', fontWeight: 400 }}>¥{p.original_price}</span>
                      )}
                    </div>
                    <button className="btn-gold" style={{ padding: '8px 18px', fontSize: '13px' }} disabled={p.stock <= 0}
                      onClick={(e) => { e.stopPropagation(); router.push(`/product/${p.id}`); }}>
                      立即购买
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer style={{ textAlign: 'center', padding: '32px 24px', marginTop: '40px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
        <div style={{ marginBottom: '6px' }}>
          {settings.site_name || '夜航发卡'} © {new Date().getFullYear()}
          {settings.icp && <span style={{ marginLeft: '16px' }}>{settings.icp}</span>}
        </div>
        {settings.footer && <div>{settings.footer}</div>}
      </footer>
    </div>
  );
}
