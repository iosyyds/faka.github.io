'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '../components/Layout';
import { IconPlus, IconEdit, IconTrash, IconClose, IconUpload } from '../components/Icons';

const API = typeof window !== 'undefined' && location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api';
const EMPTY = {name:'',price:'',original_price:'',category:'',stock:0,sales:0,description:'',detail:'',image:'',tag:'',status:'active'};

export default function Products() {
  const router = useRouter();
  const [list, setList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  useEffect(() => { if (!localStorage.getItem('admin_token')) { router.push('/admin/login'); return; } load(); }, [router]);

  const load = async () => {
    const token = localStorage.getItem('admin_token');
    const res = await fetch(`${API}/products?all=1`, {headers:{Authorization:`Bearer ${token}`}, cache:'no-store'});
    const data = await res.json();
    setList(data.products || data.data || []);
  };

  const uploadImg = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch(`${API}/upload-image`, {method:'POST', body:fd});
    const data = await res.json();
    if (data.url) setForm(f => ({...f, image:data.url}));
  };

  const save = async () => {
    if (!form.name || !form.price) return alert('请填写商品名称和价格');
    const token = localStorage.getItem('admin_token');
    const url = editing ? `${API}/product/${editing.id}` : `${API}/product`;
    const res = await fetch(url, {method:editing?'PUT':'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`}, body:JSON.stringify(form)});
    const data = await res.json();
    if (data.success || data.product || data.id) { alert('保存成功'); setShowModal(false); load(); }
    else { if (res.status===401) { alert('登录已过期'); localStorage.removeItem('admin_token'); router.push('/admin/login'); return; } alert(data.error||'保存失败'); }
  };

  const del = async (id) => {
    if (!confirm('确定删除？')) return;
    const token = localStorage.getItem('admin_token');
    await fetch(`${API}/product/${id}`, {method:'DELETE', headers:{Authorization:`Bearer ${token}`}});
    load();
  };

  return (
    <Layout active="products">
      <div className="page-header" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
        <div><div className="page-title">商品管理</div><div className="page-sub">共 {list.length} 个商品</div></div>
        <button className="btn btn-primary" onClick={()=>{setEditing(null);setForm(EMPTY);setShowModal(true);}}><IconPlus size={14}/> 添加商品</button>
      </div>
      {list.length === 0 ? (
        <div className="card"><div className="empty"><div className="empty-icon">📦</div><div className="empty-text">暂无商品，点击右上角添加</div></div></div>
      ) : (
        <div className="product-grid">
          {list.map(p => (
            <div key={p.id} className="product-card">
              {p.image ? <img src={p.image} alt="" className="product-img" /> : <div className="product-img" style={{display:'flex',alignItems:'center',justifyContent:'center',fontSize:'32px',opacity:0.3}}>📦</div>}
              <div className="product-info">
                <div className="product-name">{p.name}</div>
                <div className="product-meta"><div className="product-price">¥{p.price}</div><div className="product-stock">库存 {p.stock||0}</div></div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                  <span className={`badge ${p.status==='active'?'badge-green':'badge-gray'}`}>{p.status==='active'?'上架':'下架'}</span>
                  <span style={{fontSize:'11px',color:'#9ca3af'}}>销量 {p.sales||0}</span>
                </div>
                <div className="product-actions">
                  <button className="btn btn-sm btn-secondary" style={{flex:1}} onClick={()=>{setEditing(p);setForm({...EMPTY,...p});setShowModal(true);}}><IconEdit size={12}/> 编辑</button>
                  <button className="btn btn-sm btn-danger" onClick={()=>del(p.id)}><IconTrash size={12}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-mask" onClick={e=>{if(e.target===e.currentTarget)setShowModal(false);}}>
          <div className="modal">
            <div className="modal-header"><div className="modal-title">{editing?'编辑商品':'添加商品'}</div><button className="modal-close" onClick={()=>setShowModal(false)}><IconClose size={16}/></button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">商品名称 *</label><input className="form-input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">分类</label><input className="form-input" value={form.category} onChange={e=>setForm({...form,category:e.target.value})} placeholder="如：会员、软件" /></div>
                <div className="form-group"><label className="form-label">售价 *</label><input type="number" step="0.01" className="form-input" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">划线价</label><input type="number" step="0.01" className="form-input" value={form.original_price} onChange={e=>setForm({...form,original_price:e.target.value})} /></div>
                <div className="form-group"><label className="form-label">库存</label><input type="number" className="form-input" value={form.stock} onChange={e=>setForm({...form,stock:parseInt(e.target.value)||0})} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">销量</label><input type="number" className="form-input" value={form.sales||0} onChange={e=>setForm({...form,sales:parseInt(e.target.value)||0})} /></div>
                <div className="form-group"><label className="form-label">状态</label><select className="form-select" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="active">上架</option><option value="inactive">下架</option></select></div>
              </div>
              <div className="form-group"><label className="form-label">自定义标签</label><input className="form-input" value={form.tag||''} onChange={e=>setForm({...form,tag:e.target.value})} placeholder="如：热销、新品" maxLength={6} /></div>
              <div className="form-group"><label className="form-label">商品图片</label><input type="file" accept="image/*" onChange={uploadImg} style={{marginBottom:'8px'}} />{form.image && <img src={form.image} alt="" style={{maxWidth:'160px',borderRadius:'10px'}} />}</div>
              <div className="form-group"><label className="form-label">商品简介</label><textarea className="form-textarea" style={{minHeight:'60px'}} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} /></div>
              <div className="form-group"><label className="form-label">商品详情（支持HTML）</label><textarea className="form-textarea" style={{minHeight:'80px'}} value={form.detail} onChange={e=>setForm({...form,detail:e.target.value})} /></div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setShowModal(false)}>取消</button><button className="btn btn-primary" onClick={save}>保存</button></div>
          </div>
        </div>
      )}
    </Layout>
  );
}
