'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '../components/Layout';
import { IconRefresh } from '../components/Icons';

const API = typeof window !== 'undefined' && location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api';

export default function Cards() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [selPid, setSelPid] = useState('');
  const [cards, setCards] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => { if (!localStorage.getItem('admin_token')) { router.push('/admin/login'); return; } loadProducts(); }, [router]);

  const loadProducts = async () => {
    const token = localStorage.getItem('admin_token');
    const res = await fetch(`${API}/products?all=1`, {headers:{Authorization:`Bearer ${token}`}, cache:'no-store'});
    const data = await res.json();
    setProducts(data.products || data.data || []);
  };

  const loadCards = async () => {
    if (!selPid) return;
    const token = localStorage.getItem('admin_token');
    const res = await fetch(`${API}/cards?product_id=${selPid}`, {headers:{Authorization:`Bearer ${token}`}, cache:'no-store'});
    const data = await res.json();
    setCards(data.cards || data.data || []);
  };

  const importCards = async () => {
    if (!selPid) return alert('请选择商品');
    if (!text.trim()) return alert('请输入卡密');
    const token = localStorage.getItem('admin_token');
    const res = await fetch(`${API}/cards/import`, {method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`}, body:JSON.stringify({product_id:selPid, cards:text})});
    const data = await res.json();
    if (data.success) { alert(`成功导入 ${data.count||0} 条`); setText(''); loadCards(); }
    else alert(data.error || '导入失败');
  };

  return (
    <Layout active="cards">
      <div className="page-header"><div className="page-title">卡密管理</div><div className="page-sub">批量导入和管理卡密库存</div></div>
      <div className="card" style={{marginBottom:'20px'}}>
        <div className="card-header"><div className="card-title">批量导入卡密</div></div>
        <div className="card-body">
          <div className="form-group"><label className="form-label">选择商品</label><select className="form-select" value={selPid} onChange={e=>{setSelPid(e.target.value);setCards([]);}}><option value="">请选择商品</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div className="form-group"><label className="form-label">卡密内容（每行一个）</label><textarea className="form-textarea" style={{minHeight:'120px',fontFamily:'monospace',fontSize:'13px'}} value={text} onChange={e=>setText(e.target.value)} placeholder={'卡号----密码\n卡号----密码\n...'} /></div>
          <div style={{fontSize:'12px',color:'#9ca3af',marginBottom:'14px'}}>共 {text.split('\n').filter(c=>c.trim()).length} 条</div>
          <button className="btn btn-primary" onClick={importCards}>导入卡密</button>
        </div>
      </div>
      {selPid && (
        <div className="card">
          <div className="card-header"><div className="card-title">卡密列表（{cards.length}）</div><button className="btn btn-sm btn-secondary" onClick={loadCards}><IconRefresh size={12}/> 刷新</button></div>
          <div className="card-body">
            {cards.length === 0 ? (
              <div className="empty"><div className="empty-icon">🔑</div><div className="empty-text">暂无卡密</div></div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                {cards.slice(0,50).map(c => (
                  <div key={c.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',background:'#fafafa',borderRadius:'8px'}}>
                    <div style={{fontFamily:'monospace',fontSize:'12.5px',color:'#374151',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.card_content||c.content}</div>
                    <span className={`badge ${c.status==='available'?'badge-green':'badge-gray'}`} style={{marginLeft:'10px'}}>{c.status==='available'?'未售':'已售'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
