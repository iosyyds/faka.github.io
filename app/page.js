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
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
    checkUser();
  }, []);

  const checkUser = () => {
    const token = localStorage.getItem('user_token');
    if (token) {
      fetch(`${API_BASE}/user/info`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => { if (data.user) setUser(data.user); })
        .catch(() => {});
    }
  };

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

  const goProduct = (id) => router.push(`/product/${id}`);
  const goLogin = () => router.push('/login');
  const goUser = () => router.push('/user');

  return (
    <div>
      {/* 导航栏 - 精简一行 */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo" onClick={() => router.push('/')} style={{cursor:'pointer'}}>
            <div className="nav-logo-icon">N</div>
            <span>{settings.site_name || 'Nova Key'}</span>
          </div>
          <div className="nav-right" style={{gap: '8px'}}>
            <button className="btn btn-secondary btn-sm" onClick={goUser}>查单</button>
            {user ? (
              <button className="btn btn-primary btn-sm" onClick={goUser}>{user.username}</button>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={goLogin}>登录</button>
            )}
          </div>
        </div>
      </nav>

      {/* 精简顶部区域 - 小搜索框 */}
      <div style={{
        background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
        padding: '24px 20px',
        textAlign: 'center',
        color: '#fff'
      }}>
        <h1 style={{fontSize: '20px', fontWeight: 700, marginBottom: '12px'}}>
          {settings.site_name || 'Nova Key'}
        </h1>
        <div style={{maxWidth: '400px', margin: '0 auto', position: 'relative'}}>
          <input
            type="text"
            placeholder="搜索商品..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 16px 10px 38px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <span style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px'}}>🔍</span>
        </div>
      </div>

      {/* 主内容 */}
      <div className="container" style={{paddingTop: '16px', paddingBottom: '16px'}}>
        {/* 公告 */}
        {settings.notice && (
          <div style={{
            marginBottom: '12px',
            padding: '10px 14px',
            background: '#fef3c7',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>📢</span>
            <span>{settings.notice}</span>
          </div>
        )}

        {/* 分类标签 - 精简一行 */}
        <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px'}}>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '13px',
              cursor: 'pointer',
              background: activeCategory === 'all' ? '#7c3aed' : '#f3f4f6',
              color: activeCategory === 'all' ? '#fff' : '#6b7280',
              fontWeight: 500
            }}
            onClick={() => setActiveCategory('all')}
          >
            全部
          </div>
          {categories.map((cat, i) => (
            <div
              key={i}
              style={{
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '13px',
                cursor: 'pointer',
                background: activeCategory === cat ? '#7c3aed' : '#f3f4f6',
                color: activeCategory === cat ? '#fff' : '#6b7280',
                fontWeight: 500
              }}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </div>
          ))}
        </div>

        {/* 商品列表 - 紧凑卡片 */}
        {loading ? (
          <div className="empty">
            <div className="spinner" style={{margin: '0 auto 16px'}}></div>
            <div className="empty-text">加载中...</div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📦</div>
            <div className="empty-text">暂无商品</div>
          </div>
        ) : (
          <div className="product-grid">
            {filteredProducts.map((p) => (
              <div key={p.id} className="product-card" onClick={() => goProduct(p.id)} style={{cursor: 'pointer'}}>
                <div className="product-card-img" style={{aspectRatio: '16/9'}}>
                  {p.image ? (
                    <img src={p.image} alt={p.name} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '36px', background: 'linear-gradient(135deg, #ede9fe, #f3e8ff)'
                    }}>🎁</div>
                  )}
                  <div style={{
                    position: 'absolute',
                    top: '8px', left: '8px',
                    padding: '3px 8px',
                    background: p.stock > 0 ? 'rgba(124,58,237,0.9)' : 'rgba(239,68,68,0.9)',
                    color: '#fff',
                    fontSize: '11px',
                    borderRadius: '4px',
                    fontWeight: 500
                  }}>
                    {p.stock > 0 ? '现货' : '售空'}
                  </div>
                </div>
                <div style={{padding: '10px 12px'}}>
                  <div style={{fontSize: '14px', fontWeight: 600, marginBottom: '4px', color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{p.name}</div>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div style={{fontSize: '16px', fontWeight: 700, color: '#7c3aed'}}>
                      <span style={{fontSize: '12px'}}>¥</span>{p.price}
                    </div>
                    <button className="btn btn-primary btn-sm" style={{padding: '4px 10px', fontSize: '12px'}} onClick={(e) => {
                      e.stopPropagation();
                      goProduct(p.id);
                    }}>
                      购买
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 精简页脚 */}
      <footer style={{
        textAlign: 'center',
        padding: '16px 20px',
        fontSize: '12px',
        color: '#9ca3af',
        borderTop: '1px solid #f3f4f6'
      }}>
        {settings.site_name || 'Nova Key'} © {new Date().getFullYear()}
        {settings.icp && <span style={{marginLeft: '12px'}}>{settings.icp}</span>}
      </footer>
    </div>
  );
}
