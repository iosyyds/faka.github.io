'use client';
import { useState, useEffect } from 'react';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api' : '/api';

const emptyForm = { name: '', price: '', original_price: '', category: '', stock: 0, sales: 0, description: '', detail: '', image: '', tag: '', status: 'active' };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/products?all=1`, { cache: 'no-store' });
      const data = await res.json();
      setProducts(data.products || data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/upload-image`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) setForm({...form, image: data.url});
      else alert('上传失败');
    } catch (err) { alert('上传失败'); }
    finally { setUploading(false); }
  };

  const save = async () => {
    if (!form.name || !form.price) { alert('请填写商品名称和价格'); return; }
    try {
      const url = editing ? `${API_BASE}/product/${editing.id}` : `${API_BASE}/product`;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success || data.product || data.id) {
        alert('保存成功');
        setShowModal(false);
        await loadProducts();
      } else {
        if (res.status === 401) { alert('登录已过期'); localStorage.removeItem('admin_token'); window.location.href = '/admin/login'; return; }
        alert(data.error || data.message || '保存失败');
      }
    } catch (e) { alert('保存失败：' + (e.message || '')); }
  };

  const del = async (id) => {
    if (!confirm('确定删除这个商品吗？')) return;
    try {
      await fetch(`${API_BASE}/product/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` } });
      await loadProducts();
    } catch (e) { alert('删除失败'); }
  };

  const edit = (p) => {
    setEditing(p);
    setForm({...emptyForm, ...p});
    setShowModal(true);
  };

  const add = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  if (loading) return <div style={{padding: '40px', textAlign: 'center', color: '#6b7280'}}>加载中...</div>;

  return (
    <div style={{padding: '24px'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h1 style={{fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0}}>商品管理</h1>
        <button onClick={add} style={{padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500}}>+ 添加商品</button>
      </div>
      <div className="card">
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>ID</th><th>商品名称</th><th>分类</th><th>价格</th><th>库存</th><th>销量</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.name}</td>
                  <td>{p.category || '-'}</td>
                  <td style={{color: '#dc2626', fontWeight: 600}}>¥{p.price}</td>
                  <td>{p.stock || 0}</td>
                  <td>{p.sales || 0}</td>
                  <td><span className={`badge ${p.status === 'active' ? 'badge-success' : 'badge-secondary'}`}>{p.status === 'active' ? '上架' : '下架'}</span></td>
                  <td>
                    <button onClick={() => edit(p)} style={{padding: '4px 10px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', marginRight: '6px'}}>编辑</button>
                    <button onClick={() => del(p.id)} style={{padding: '4px 10px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px'}}>删除</button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && <tr><td colSpan="8"><div style={{padding: '40px', textAlign: 'center', color: '#9ca3af'}}>暂无商品</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'}}>
          <div style={{background: 'white', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto'}}>
            <div style={{padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 1}}>
              <h3 style={{margin: 0, fontSize: '18px', fontWeight: 600}}>{editing ? '编辑商品' : '添加商品'}</h3>
              <div style={{display: 'flex', gap: '8px'}}>
                <button onClick={save} style={{padding: '6px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px'}}>保存</button>
                <button onClick={() => setShowModal(false)} style={{padding: '6px 16px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px'}}>取消</button>
              </div>
            </div>
            <div style={{padding: '24px'}}>
              <div className="form-group"><label className="form-label">商品名称 *</label><input type="text" className="form-input" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">分类</label><input type="text" className="form-input" value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} placeholder="如：会员、软件" /></div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                <div className="form-group"><label className="form-label">售价 *</label><input type="number" step="0.01" className="form-input" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">划线价</label><input type="number" step="0.01" className="form-input" value={form.original_price} onChange={(e) => setForm({...form, original_price: e.target.value})} /></div>
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                <div className="form-group"><label className="form-label">库存</label><input type="number" className="form-input" value={form.stock} onChange={(e) => setForm({...form, stock: parseInt(e.target.value) || 0})} /></div>
                <div className="form-group"><label className="form-label">销量</label><input type="number" className="form-input" value={form.sales || 0} onChange={(e) => setForm({...form, sales: parseInt(e.target.value) || 0})} /></div>
              </div>
              <div className="form-group"><label className="form-label">状态</label><select className="form-select" value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}><option value="active">上架</option><option value="inactive">下架</option></select></div>
              <div className="form-group"><label className="form-label">自定义标签</label><input type="text" className="form-input" value={form.tag || ''} onChange={(e) => setForm({...form, tag: e.target.value})} placeholder="如：热销、新品" maxLength={6} /></div>
              <div className="form-group">
                <label className="form-label">商品图片</label>
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{marginBottom: '10px'}} />
                {form.image && <img src={form.image} alt="商品图" style={{maxWidth: '200px', borderRadius: '8px'}} />}
              </div>
              <div className="form-group"><label className="form-label">商品简介</label><textarea className="form-textarea" style={{minHeight: '60px'}} value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">商品详情（支持HTML）</label><textarea className="form-textarea" style={{minHeight: '80px'}} value={form.detail} onChange={(e) => setForm({...form, detail: e.target.value})} /></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
