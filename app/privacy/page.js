'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

export default function Privacy() {
  const router = useRouter();
  const [settings, setSettings] = useState({});
  const [content, setContent] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setSettings(d.settings);
          setContent(d.settings.privacy_content || '');
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
            <h1 style={{fontSize: '24px', fontWeight: 700, color: '#111827', marginBottom: '8px'}}>隐私政策</h1>
            <p style={{fontSize: '13px', color: '#9ca3af', marginBottom: '24px'}}>最后更新：{new Date().toLocaleDateString()}</p>
            
            {content ? (
              <div 
                style={{fontSize: '14px', lineHeight: 1.8, color: '#374151'}}
                dangerouslySetInnerHTML={{__html: content}}
              />
            ) : (
              <div style={{fontSize: '14px', lineHeight: 1.8, color: '#374151'}}>
                <h3 style={{fontSize: '16px', fontWeight: 600, color: '#111827', marginTop: '20px', marginBottom: '10px'}}>一、信息收集</h3>
                <p style={{marginBottom: '12px'}}>本网站在您使用服务时，可能会收集以下信息：</p>
                <p style={{marginBottom: '12px'}}>1. 您主动提供的邮箱地址（用于接收卡密信息）</p>
                <p style={{marginBottom: '12px'}}>2. 订单信息（商品名称、购买数量、支付金额等）</p>
                <p style={{marginBottom: '12px'}}>3. 设备信息（浏览器类型、操作系统、IP地址等）</p>
                
                <h3 style={{fontSize: '16px', fontWeight: 600, color: '#111827', marginTop: '20px', marginBottom: '10px'}}>二、信息使用</h3>
                <p style={{marginBottom: '12px'}}>我们收集的信息将用于：</p>
                <p style={{marginBottom: '12px'}}>1. 处理您的订单并发送卡密信息</p>
                <p style={{marginBottom: '12px'}}>2. 提供客户支持和售后服务</p>
                <p style={{marginBottom: '12px'}}>3. 改进网站服务和用户体验</p>
                <p style={{marginBottom: '12px'}}>4. 防范欺诈和保障交易安全</p>
                
                <h3 style={{fontSize: '16px', fontWeight: 600, color: '#111827', marginTop: '20px', marginBottom: '10px'}}>三、信息保护</h3>
                <p style={{marginBottom: '12px'}}>我们采取以下措施保护您的个人信息：</p>
                <p style={{marginBottom: '12px'}}>1. 卡密信息采用加密方式存储</p>
                <p style={{marginBottom: '12px'}}>2. 支付过程采用安全加密传输</p>
                <p style={{marginBottom: '12px'}}>3. 严格限制员工访问您的个人信息</p>
                <p style={{marginBottom: '12px'}}>4. 定期进行安全检查和漏洞修复</p>
                
                <h3 style={{fontSize: '16px', fontWeight: 600, color: '#111827', marginTop: '20px', marginBottom: '10px'}}>四、信息共享</h3>
                <p style={{marginBottom: '12px'}}>我们不会向第三方出售或出租您的个人信息。仅在以下情况下可能共享：</p>
                <p style={{marginBottom: '12px'}}>1. 获得您的明确同意</p>
                <p style={{marginBottom: '12px'}}>2. 法律法规要求或政府主管部门要求</p>
                <p style={{marginBottom: '12px'}}>3. 支付处理机构（仅用于完成支付交易）</p>
                
                <h3 style={{fontSize: '16px', fontWeight: 600, color: '#111827', marginTop: '20px', marginBottom: '10px'}}>五、Cookie使用</h3>
                <p style={{marginBottom: '12px'}}>本网站可能使用Cookie来改善用户体验。您可以通过浏览器设置禁用Cookie，但这可能影响部分功能的使用。</p>
                
                <h3 style={{fontSize: '16px', fontWeight: 600, color: '#111827', marginTop: '20px', marginBottom: '10px'}}>六、您的权利</h3>
                <p style={{marginBottom: '12px'}}>您有权：</p>
                <p style={{marginBottom: '12px'}}>1. 查询、更正您的个人信息</p>
                <p style={{marginBottom: '12px'}}>2. 删除您的个人信息（法律法规要求保留的除外）</p>
                <p style={{marginBottom: '12px'}}>3. 撤回对个人信息使用的同意</p>
                
                <h3 style={{fontSize: '16px', fontWeight: 600, color: '#111827', marginTop: '20px', marginBottom: '10px'}}>七、政策更新</h3>
                <p style={{marginBottom: '12px'}}>本隐私政策可能会不时更新。更新后的政策将在网站上公布，建议您定期查阅。</p>
                
                <h3 style={{fontSize: '16px', fontWeight: 600, color: '#111827', marginTop: '20px', marginBottom: '10px'}}>八、联系我们</h3>
                <p style={{marginBottom: '12px'}}>如您对本隐私政策有任何疑问，请通过网站提供的联系方式与我们联系。</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
