import './globals.css';

export const metadata = {
  title: '自动发卡商城',
  description: '24小时自动发货，扫码即购，秒发卡密',
  viewport: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // 禁止F12和右键
              document.addEventListener('keydown', function(e) {
                if (e.key === 'F12') { e.preventDefault(); return false; }
                if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) { e.preventDefault(); return false; }
                if (e.ctrlKey && e.key === 'u') { e.preventDefault(); return false; }
              });
              document.addEventListener('contextmenu', function(e) { e.preventDefault(); return false; });
              // 禁止双指缩放
              document.addEventListener('touchmove', function(e) {
                if (e.touches.length > 1) { e.preventDefault(); }
              }, { passive: false });
              let lastTouch = 0;
              document.addEventListener('touchend', function(e) {
                const now = Date.now();
                if (now - lastTouch <= 300) { e.preventDefault(); }
                lastTouch = now;
              }, { passive: false });
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
