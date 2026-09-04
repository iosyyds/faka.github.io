import './globals.css';

export const metadata = {
  metadataBase: new URL('https://www.qqqi.top'),
  title: {
    default: '甜甜发卡 - 24小时自动发卡平台 | 虚拟商品卡密自动发货秒发卡',
    template: '%s | 甜甜发卡 - 自动发卡平台',
  },
  description: '甜甜发卡是专业的24小时自动发卡平台，支持支付宝在线支付，付款后自动秒发卡密。提供虚拟商品、软件授权、会员账号、游戏点卡、激活码、CDKEY、充值卡等自助购买服务，安全可靠，即买即得，无需等待人工发货。',
  keywords: '自动发卡,发卡平台,虚拟商品,卡密购买,自动发货,支付宝支付,24小时发卡,秒发卡,自助购买,软件授权,会员账号,游戏点卡,激活码,CDKEY,充值卡,卡密平台,自动发卡网,虚拟卡密,在线发卡,即时发货,自动发卡系统,发卡网,自助发卡,虚拟物品交易,数字商品,电子卡密,授权码,注册码,序列号,兑换码',
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
    siteName: '甜甜发卡 - 24小时自动发卡平台',
    title: '甜甜发卡 - 24小时自动发卡平台 | 虚拟商品卡密自动发货秒发卡',
    description: '专业的24小时自动发卡平台，支付宝支付，自动秒发卡密。虚拟商品、软件授权、会员账号、游戏点卡一站式自助购买。',
    url: 'https://www.qqqi.top',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: '甜甜发卡 - 24小时自动发卡平台',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '甜甜发卡 - 24小时自动发卡平台',
    description: '专业的24小时自动发卡平台，支付宝支付，自动秒发卡密。',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
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
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#f8fafc' },
  ],
};

export default function RootLayout({ children }) {
  const jsonLdWebsite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "甜甜发卡",
    "alternateName": "甜甜发卡平台",
    "url": "https://www.qqqi.top",
    "description": "专业的24小时自动发卡平台，支持支付宝在线支付，付款后自动秒发卡密。",
    "inLanguage": "zh-CN",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://www.qqqi.top/?search={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  const jsonLdOrganization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "甜甜发卡",
    "url": "https://www.qqqi.top",
    "logo": "https://www.qqqi.top/favicon.ico",
    "description": "24小时自动发卡平台，虚拟商品卡密自动发货",
    "areaServed": "CN",
    "knowsAbout": ["自动发卡", "发卡平台", "虚拟商品", "卡密发货", "支付宝支付", "软件授权", "会员账号", "游戏点卡", "秒发卡", "自助购买"]
  };

  const jsonLdFAQ = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "甜甜发卡平台如何购买商品？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "选择商品后填写邮箱，点击立即支付，使用支付宝扫码付款，支付成功后系统自动发卡密，页面直接显示同时发送到您的邮箱。"
        }
      },
      {
        "@type": "Question",
        "name": "支付后多久能收到卡密？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "支付成功后系统自动秒发，页面立即显示卡密，同时发送卡密到您填写的邮箱，无需等待人工发货。"
        }
      },
      {
        "@type": "Question",
        "name": "如何查询已购买的订单？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "点击页面顶部的订单查询，输入订单号和购买时填写的邮箱即可查询订单状态和卡密信息。"
        }
      },
      {
        "@type": "Question",
        "name": "支持哪些支付方式？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "目前支持支付宝在线支付，扫码即可付款，安全便捷。"
        }
      },
      {
        "@type": "Question",
        "name": "甜甜发卡平台安全吗？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "甜甜发卡采用支付宝官方支付接口，支付安全有保障。卡密支付成功后自动发放，全程无人为干预，保护您的隐私和交易安全。"
        }
      },
      {
        "@type": "Question",
        "name": "可以购买哪些类型的商品？",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "平台支持各类虚拟商品，包括软件授权、会员账号、游戏点卡、激活码、CDKEY、充值卡、注册码、序列号、兑换码等数字商品。"
        }
      }
    ]
  };

  const jsonLdBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "首页",
        "item": "https://www.qqqi.top"
      }
    ]
  };

  const jsonLdService = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "自动发卡服务",
    "provider": {
      "@type": "Organization",
      "name": "甜甜发卡"
    },
    "areaServed": "CN",
    "description": "24小时自动发卡服务，支持支付宝支付，虚拟商品卡密自动发货秒发卡",
    "offers": {
      "@type": "Offer",
      "priceCurrency": "CNY",
      "price": "0.01",
      "availability": "https://schema.org/InStock"
    }
  };

  return (
    <html lang="zh-CN">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="canonical" href="https://www.qqqi.top" />
        
        <meta name="baidu-site-verification" content="" />
        <meta name="google-site-verification" content="" />
        <meta name="360-site-verification" content="" />
        <meta name="sogou_site_verification" content="" />
        <meta name="shenma-site-verification" content="" />
        
        <meta name="theme-color" content="#f8fafc" />
        <meta name="msapplication-TileColor" content="#f8fafc" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="甜甜发卡" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no, email=no, address=no" />
        
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebsite) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFAQ) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdService) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
