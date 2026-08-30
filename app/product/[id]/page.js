import { createClient } from '@supabase/supabase-js';
import ProductClient from './ProductClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 动态生成SEO metadata
export async function generateMetadata({ params }) {
  try {
    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: product } = await supabase
        .from('products')
        .select('*')
        .eq('id', params.id)
        .single();
      
      if (product) {
        return {
          title: `${product.name} - 甜甜发卡`,
          description: product.description || `购买${product.name}，价格¥${product.price}，自动发货，秒发卡密。`,
          keywords: `${product.name},${product.category || ''},自动发卡,虚拟商品,卡密购买`,
          openGraph: {
            title: `${product.name} - 甜甜发卡`,
            description: product.description || `购买${product.name}，价格¥${product.price}，自动发货。`,
            images: product.image ? [{ url: product.image }] : [],
            type: 'product',
          },
        };
      }
    }
  } catch (e) {
    console.error('Metadata生成失败:', e);
  }
  
  return {
    title: '商品详情 - 甜甜发卡',
    description: '甜甜发卡 - 24小时自动发卡平台',
  };
}

export default async function ProductPage({ params }) {
  let product = null;
  let settings = {};
  
  try {
    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      
      // 获取商品信息
      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .eq('id', params.id)
        .single();
      product = productData;
      
      // 获取网站设置
      const { data: settingsData } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .single();
      if (settingsData) {
        settings = {
          site_name: settingsData.site_name || '甜甜发卡',
          site_logo: settingsData.site_logo || '',
          logo_text: settingsData.logo_text || '甜',
        };
      }
    }
  } catch (e) {
    console.error('商品详情加载失败:', e);
  }
  
  if (!product) {
    return (
      <div className="container">
        <div className="card">
          <div style={{textAlign: 'center', padding: '60px 20px'}}>
            <div style={{fontSize: '48px', marginBottom: '16px'}}>❌</div>
            <div style={{fontSize: '18px', color: '#374151', marginBottom: '16px'}}>商品不存在</div>
            <a href="/" className="btn btn-primary">返回首页</a>
          </div>
        </div>
      </div>
    );
  }
  
  // 商品结构化数据
  const productJsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.name,
    "image": product.image || "",
    "description": product.description || "",
    "sku": product.id,
    "offers": {
      "@type": "Offer",
      "priceCurrency": "CNY",
      "price": product.price,
      "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };
  
  return (
    <>
      {/* 商品结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <ProductClient product={product} settings={settings} />
    </>
  );
}
