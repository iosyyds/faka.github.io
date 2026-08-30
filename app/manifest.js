export default function manifest() {
  return {
    name: '甜甜发卡 - 24小时自动发卡平台',
    short_name: '甜甜发卡',
    description: '专业的虚拟商品自动发卡平台，支持支付宝在线支付，付款后自动秒发卡密。',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#2563eb',
    orientation: 'portrait',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
        purpose: 'any maskable',
      },
    ],
    categories: ['shopping', 'utilities'],
    lang: 'zh-CN',
    dir: 'ltr',
  };
}
