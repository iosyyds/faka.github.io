export const metadata = {
  title: '隐私政策 - 甜甜发卡 | 自动发卡平台隐私保护',
  description: '甜甜发卡隐私政策，我们如何收集、使用和保护您的个人信息。包括邮箱、订单信息、支付数据的隐私保护措施。',
  keywords: '隐私政策,个人信息保护,甜甜发卡,自动发卡平台,数据安全,邮箱保护,订单隐私',
  alternates: {
    canonical: '/privacy',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: '隐私政策 - 甜甜发卡 | 自动发卡平台隐私保护',
    description: '甜甜发卡隐私政策，我们如何保护您的个人信息和交易安全。',
    type: 'article',
  },
};

export default function PrivacyLayout({ children }) {
  return children;
}
