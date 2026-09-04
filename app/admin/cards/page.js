'use client';
import { useState, useEffect } from 'react';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api' : '/api';

export default function Cards() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [cards, setCards] = useState([]);
  const [importText, setImportText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    const res = await fetch(`${API_BASE}/products?all=1`, { cache: 'no-store' });
    const data = await res.json();
    setProducts(data.products || data.data || []);
  };

  const loadCards = async () => {
    if (!selectedProduct) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/cards?product_id=${selectedProduct}`, { cache: 'no-store' });
      const data = await res.json();
      setCards(data.cards || data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const importCards = async () => {
    if (!selectedProduct) { alert('请先选择商品'); return; }
    if (!importText.trim()) { alert('请输入卡密内容'); return; }
    try {
      const res = await fetch(`${API_BASE}/cards/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: JSON.stringify({ product_id: selectedProduct, cards: importText })
      });
      const data = await res.json();
      if (data.success) {
        alert(`成功导入 ${data.count || 0} 条卡密`);
        setImportText('');
        loadCards();
      } else {
        alert(data.error || '导入失败');
      }
    } catch (e) { alert('导入失败'); }
  };

  return (
    <div style={{padding: '24px'}}>
      <h1 style={{fontSize: '22px', fontWeight: 700, marginBottom: '20px', color: '#111827'}}>卡密管理</h1>
      <div className="card" style={{marginBottom: '20px'}}>
        <div className="card-header"><div className="card-title">批量导入卡密</div></div>
        <div style={{padding: '20px'}}>
          <div className="form-group">
            <label className="form-label">选择商品</label>
            <select className="form-select" value={selectedProduct} onChange={(e) => { setSelectedProduct(e.target.value); setCards([]); }}>
              <option value="">请选择商品</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">卡密内容（每行一个）</label>
            <textarea className="form-textarea" style={{minHeight: '120px'}} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="每行一个卡密，例如：&#10;ABC123&#10;DEF456&#10;GHI789" />
          </div>
          <button onClick={importCards} style={{padding: '8px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px'}}>导入卡密</button>
        </div>
      </div>
      {selectedProduct && (
        <div className="card">
          <div className="card-header"><div className="card-title">卡密列表（{cards.length}）</div><button onClick={loadCards} style={{padding: '6px 12px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px'}}>刷新</button></div>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>ID</th><th>卡密内容</th><th>状态</th><th>创建时间</th></tr></thead>
              <tbody>
                {cards.slice(0, 50).map(c => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td style={{fontFamily: 'monospace', fontSize: '13px'}}>{c.card_content || c.content}</td>
                    <td><span className={`badge ${c.status === 'available' ? 'badge-success' : 'badge-secondary'}`}>{c.status === 'available' ? '未售' : '已售'}</span></td>
                    <td style={{fontSize: '12px', color: '#9ca3af'}}>{c.created_at ? new Date(c.created_at).toLocaleString() : '-'}</td>
                  </tr>
                ))}
                {cards.length === 0 && !loading && <tr><td colSpan="4"><div style={{padding: '40px', textAlign: 'center', color: '#9ca3af'}}>暂无卡密</div></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
