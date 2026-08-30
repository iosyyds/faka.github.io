import './globals.css';

export const metadata = {
  title: {
    default: '甜甜发卡 - 24小时自动发卡平台',
    template: '%s | 甜甜发卡',
  },
  description: '甜甜发卡是专业的虚拟商品自动发卡平台，支持支付宝在线支付，付款后自动秒发卡密，24小时无人值守，安全可靠。',
  keywords: '自动发卡,发卡平台,虚拟商品,卡密购买,自动发货,支付宝支付,24小时发卡',
  authors: [{ name: '甜甜发卡' }],
  creator: '甜甜发卡',
  publisher: '甜甜发卡',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: '甜甜发卡',
    title: '甜甜发卡 - 24小时自动发卡平台',
    description: '专业的虚拟商品自动发卡平台，支持支付宝在线支付，付款后自动秒发卡密，24小时无人值守。',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: '甜甜发卡 - 24小时自动发卡平台',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '甜甜发卡 - 24小时自动发卡平台',
    description: '专业的虚拟商品自动发卡平台，支持支付宝在线支付，付款后自动秒发卡密。',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'technology',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/favicon.ico" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="msapplication-TileColor" content="#ffffff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="甜甜发卡" />
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* 结构化数据 - 网站 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "甜甜发卡",
              "url": "https://faka.example.com",
              "description": "专业的虚拟商品自动发卡平台，支持支付宝在线支付，付款后自动秒发卡密。",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://faka.example.com/?search={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
