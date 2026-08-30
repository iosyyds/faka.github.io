'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

export default function Terms() {
  const router = useRouter();
  const [settings, setSettings] = useState({});
  const [content, setContent] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setSettings(d.settings);
          setContent(d.settings.terms_content || '');
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo" onClick={() => router.push('/')} style={{cursor:'pointer'}}>
            {settings.site_logo ? (
              <img src={settings.site_logo} alt="Logo" style={{width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover'}} />
            ) : (
              <div className="nav-logo-icon">{settings.logo_text || '甜'}</div>
            )}
            <span>{settings.site_name || '甜甜发卡'}</span>
          </div>
          <div className="nav-right">
            <button className="btn btn-secondary btn-sm" onClick={() => router.push('/')}>← 返回首页</button>
          </div>
        </div>
      </nav>

      <div className="container" style={{maxWidth: '800px'}}>
        <div className="card animate-fade-in">
          <div className="card-body" style={{padding: '32px'}}>
            <h1 style={{fontSize: '24px', fontWeight: 700, color: '#111827', marginBottom: '8px'}}>服务条款</h1>
            <p style={{fontSize: '13px', color: '#9ca3af', marginBottom: '24px'}}>最后更新：{new Date().toLocaleDateString()}</p>
            
            {content ? (
              <div 
                style={{fontSize: '14px', lineHeight: 1.8, color: '#374151'}}
                dangerouslySetInnerHTML={{__html: content}}
              />
            ) : (
              <div style={{fontSize: '14px', lineHeight: 1.8, color: '#374151'}}>
                <h3 style={{fontSize: '16px', fontWeight: 600, color: '#111827', marginTop: '20px', marginBottom: '10px'}}>一、服务说明</h3>
                <p style={{marginBottom: '12px'}}>欢迎使用本网站提供的虚拟商品及服务。本服务条款是您与本网站之间关于使用本网站服务所订立的协议。</p>
                
                <h3 style={{fontSize: '16px', fontWeight: 600, color: '#111827', marginTop: '20px', marginBottom: '10px'}}>二、用户权利与义务</h3>
                <p style={{marginBottom: '12px'}}>1. 用户应确保所提供的邮箱地址真实有效，以便接收卡密信息。</p>
                <p style={{marginBottom: '12px'}}>2. 用户应妥善保管购买的卡密，因用户自身原因导致卡密泄露的，本网站不承担责任。</p>
                <p style={{marginBottom: '12px'}}>3. 用户不得利用本网站服务从事任何违法违规活动。</p>
                
                <h3 style={{fontSize: '16px', fontWeight: 600, color: '#111827', marginTop: '20px', marginBottom: '10px'}}>三、支付与交付</h3>
                <p style={{marginBottom: '12px'}}>1. 本网站支持支付宝支付，支付成功后系统自动发货。</p>
                <p style={{marginBottom: '12px'}}>2. 卡密将通过页面展示和邮件两种方式发送给用户。</p>
                <p style={{marginBottom: '12px'}}>3. 因支付渠道问题导致发货延迟的，请联系客服处理。</p>
                
                <h3 style={{fontSize: '16px', fontWeight: 600, color: '#111827', marginTop: '20px', marginBottom: '10px'}}>四、退款政策</h3>
                <p style={{marginBottom: '12px'}}>1. 虚拟商品一经售出，非质量问题不予退款。</p>
                <p style={{marginBottom: '12px'}}>2. 如卡密无法使用且经核实确属商品问题，可申请退款或补发。</p>
                
                <h3 style={{fontSize: '16px', fontWeight: 600, color: '#111827', marginTop: '20px', marginBottom: '10px'}}>五、免责声明</h3>
                <p style={{marginBottom: '12px'}}>1. 本网站仅提供商品交易平台，不对商品的使用效果做任何保证。</p>
                <p style={{marginBottom: '12px'}}>2. 因不可抗力导致服务中断的，本网站不承担责任。</p>
                
                <h3 style={{fontSize: '16px', fontWeight: 600, color: '#111827', marginTop: '20px', marginBottom: '10px'}}>六、条款修改</h3>
                <p style={{marginBottom: '12px'}}>本网站保留随时修改本服务条款的权利，修改后的条款将在网站上公布。</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
