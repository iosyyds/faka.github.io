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
  const goAdmin = () => router.push('/admin');

  return (
    <div>
      {/* 导航栏 */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo" onClick={() => router.push('/')} style={{cursor:'pointer'}}>
            <div className="nav-logo-icon">N</div>
            <span>{settings.site_name || 'Nova Key'}</span>
          </div>
          <div className="nav-search">
            <span className="nav-search-icon">🔍</span>
            <input
              type="text"
              placeholder="搜索商品..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="nav-right">
            <button className="btn btn-secondary btn-sm" onClick={() => router.push('/user')}>
              📋 查单
            </button>
            {user ? (
              <button className="btn btn-primary btn-sm" onClick={goUser}>
                👤 {user.username}
              </button>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={goLogin}>
                登录 / 注册
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero区域 */}
      <div style={{
        background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%)',
        padding: '60px 20px',
        textAlign: 'center',
        color: '#fff'
      }}>
        <h1 style={{fontSize: '36px', fontWeight: 800, marginBottom: '12px'}}>
          {settings.site_name || 'Nova Key'} 自动发卡平台
        </h1>
        <p style={{fontSize: '16px', opacity: 0.9, marginBottom: '24px'}}>
          {settings.site_subtitle || '安全、快捷、全自动的数字商品交易平台'}
        </p>
        <div style={{
          maxWidth: '500px',
          margin: '0 auto',
          position: 'relative'
        }}>
          <input
            type="text"
            placeholder="输入关键词搜索商品..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 20px 14px 48px',
              borderRadius: '9999px',
              border: 'none',
              fontSize: '15px',
              outline: 'none',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}
          />
          <span style={{
            position: 'absolute',
            left: '18px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '18px'
          }}>🔍</span>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '40px',
          marginTop: '32px',
          flexWrap: 'wrap'
        }}>
          <div>
            <div style={{fontSize: '28px', fontWeight: 700}}>{products.length}</div>
            <div style={{fontSize: '13px', opacity: 0.8}}>在售商品</div>
          </div>
          <div>
            <div style={{fontSize: '28px', fontWeight: 700}}>24/7</div>
            <div style={{fontSize: '13px', opacity: 0.8}}>自动发货</div>
          </div>
          <div>
            <div style={{fontSize: '28px', fontWeight: 700}}>100%</div>
            <div style={{fontSize: '13px', opacity: 0.8}}>安全保障</div>
          </div>
        </div>
      </div>

      {/* 主内容 */}
      <div className="container">
        {/* 公告 */}
        {settings.notice && (
          <div className="card" style={{marginBottom: '24px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px'}}>
            <span style={{fontSize: '18px'}}>📢</span>
            <span style={{fontSize: '14px', color: 'var(--text-secondary)'}}>{settings.notice}</span>
          </div>
        )}

        {/* 分类标签 */}
        <div className="category-tabs">
          <div
            className={`category-tab ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            全部商品
          </div>
          {categories.map((cat, i) => (
            <div
              key={i}
              className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </div>
          ))}
        </div>

        {/* 商品列表 */}
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
              <div key={p.id} className="product-card" onClick={() => goProduct(p.id)}>
                <div className="product-card-img">
                  {p.image ? (
                    <img src={p.image} alt={p.name} />
                  ) : (
                    <div style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '48px',
                      background: 'linear-gradient(135deg, #ede9fe, #f3e8ff)'
                    }}>🎁</div>
                  )}
                  <div className="product-card-tag">
                    {p.stock > 0 ? '自动发货' : '已售空'}
                  </div>
                </div>
                <div className="product-card-body">
                  <div className="product-card-name">{p.name}</div>
                  <div className="product-card-desc">{p.description || p.desc || '点击查看详情'}</div>
                  <div className="product-card-bottom">
                    <div className="product-card-price">
                      <small>¥</small>{p.price}
                      {p.original_price && p.original_price > p.price && (
                        <span style={{
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          textDecoration: 'line-through',
                          marginLeft: '8px',
                          fontWeight: 400
                        }}>¥{p.original_price}</span>
                      )}
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={(e) => {
                      e.stopPropagation();
                      goProduct(p.id);
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
        <div style={{marginBottom: '8px'}}>
          {settings.site_name || 'Nova Key'} © {new Date().getFullYear()}
          {settings.icp && <span style={{marginLeft: '16px'}}>{settings.icp}</span>}
        </div>
        {settings.footer && <div style={{fontSize: '12px'}}>{settings.footer}</div>}
      </footer>
    </div>
  );
}
