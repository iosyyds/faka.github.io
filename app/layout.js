import './globals.css';

export const metadata = {
  title: '自动发卡商城',
  description: '24小时自动发货，扫码即购，秒发卡密',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
