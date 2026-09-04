export const metadata = {
  title: '服务条款 - 甜甜发卡 | 自动发卡平台用户协议',
  description: '甜甜发卡服务条款，了解使用本自动发卡平台的规则、权利和义务。包括虚拟商品购买、卡密发放、支付安全、售后保障等用户协议内容。',
  keywords: '服务条款,用户协议,甜甜发卡,自动发卡平台,虚拟商品协议,卡密购买条款,支付协议,售后政策',
  alternates: {
    canonical: '/terms',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: '服务条款 - 甜甜发卡 | 自动发卡平台用户协议',
    description: '甜甜发卡服务条款，了解使用本自动发卡平台的规则和注意事项。',
    type: 'article',
  },
};

export default function TermsLayout({ children }) {
  return children;
}
