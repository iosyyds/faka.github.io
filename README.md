# 甜甜发卡 - 自动发卡商城系统

基于 Next.js 14 + Supabase + 支付宝的全自动发卡系统，支持PC端和移动端自适应，SEO友好。

## 功能特性

### 前台功能
- 商品网格展示，支持分类筛选和搜索
- 商品详情弹窗购买，无需跳转页面
- 支付宝扫码支付，二维码实时生成
- 支付成功自动发卡，页面即时显示卡密
- 卡密自动发送到用户邮箱（HTML精美模板）
- 订单查询（订单号+邮箱）
- 网站Logo自定义上传，自动同步Favicon
- 首页横幅配置（标题、副标题、标签、右侧图片）
- 底部链接自定义（服务条款、隐私政策等独立页面）
- 商品图片上传、自定义标签、销量手动控制
- 响应式设计，完美适配手机和电脑
- 服务端渲染（SSR），SEO友好

### 后台功能
- 管理员登录（Token认证）
- 数据概览仪表盘（商品数、订单数、销售额、待处理）
- 商品管理（增删改查、上下架、分类、价格、库存、图片、标签、销量）
- 卡密管理（批量导入TXT、手动添加、删除、状态管理）
- 订单管理（查看、状态筛选、手动标记支付）
- 系统设置（可折叠面板）：
  - 🏠 基础设置（网站名称、Logo、图标文字）
  - 🎨 首页横幅配置（图片、标题、副标题、标签）
  - 🔗 底部链接配置（描述、3个自定义链接）
  - 📄 页面内容配置（服务条款、隐私政策内容）
  - 📧 邮件自动发送配置（SMTP说明）
- 移动端底部导航栏（5个功能入口，选中高亮动画）
- 弹窗flex布局，保存按钮始终可见

### SEO优化
- 商品详情页服务端渲染（SSR），搜索引擎可直接抓取内容
- 动态Metadata：每个商品页面独立title、description、keywords
- 结构化数据（JSON-LD）：WebSite + Product类型，支持富媒体搜索结果
- 自动生成sitemap.xml（包含所有商品页面）
- robots.txt（允许搜索引擎爬取，禁止后台和API）
- Open Graph + Twitter Card社交分享标签
- PWA manifest.json，支持添加到主屏幕
- 移除防复制脚本，改善用户体验和搜索引擎评分

### 安全特性
- 卡密按顺序发放，支付成功后自动标记已使用
- 支付宝回调RSA2签名验签
- 后台Token认证（24小时有效期）
- 订单状态双保险（回调+主动查询）
- 库存自动扣减，防止超卖
- 安全响应头（X-Content-Type-Options、Referrer-Policy等）

## 技术栈

- **前端框架**：Next.js 14 (App Router) - ESM模块
- **数据库**：Supabase (PostgreSQL)
- **支付**：支付宝当面付（扫码支付）
- **邮件**：Nodemailer (SMTP)
- **样式**：原生CSS + 响应式设计
- **部署**：Vercel
- **SEO**：SSR + Metadata API + JSON-LD

## 环境变量配置

在 Vercel 项目设置或本地 `.env.local` 中配置以下环境变量：

### 数据库配置
```env
NEXT_PUBLIC_SUPABASE_URL=你的Supabase项目URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase anon key
SUPABASE_SERVICE_KEY=你的Supabase service_role key
```

### 支付宝支付配置
```env
ALIPAY_APP_ID=支付宝应用APPID
ALIPAY_PRIVATE_KEY=支付宝应用私钥（RSA2）
ALIPAY_PUBLIC_KEY=支付宝公钥
ALIPAY_NOTIFY_URL=https://你的域名/api/notify
ALIPAY_SANDBOX=false
```

### 邮件SMTP配置（自动发卡邮件）
```env
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=你的邮箱地址
SMTP_PASS=邮箱授权码（非登录密码）
SMTP_FROM=你的邮箱地址
```

### 站点配置
```env
NEXT_PUBLIC_SITE_URL=https://你的域名
ADMIN_PASSWORD=管理员密码
```

## 快速开始

### 本地开发
```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入你的配置

# 启动开发服务器
npm run dev
```
打开 http://localhost:3000

### 数据库初始化
1. 登录 Supabase 控制台
2. 进入 SQL Editor
3. 执行 `supabase-schema.sql` 文件中的所有SQL语句
4. 数据库表创建完成

## 部署到 Vercel

1. 将代码推送到 GitHub 仓库
2. 登录 Vercel，导入该仓库
3. 框架预设选择 Next.js
4. 在 Environment Variables 中配置所有环境变量
5. 点击 Deploy 部署
6. 部署完成后，在 Supabase 中配置网站域名到 CORS 白名单
7. 配置自定义域名（可选）

## 支付宝配置说明

1. 登录 [支付宝开放平台](https://open.alipay.com/)
2. 创建网页/移动应用
3. 开通"当面付"功能
4. 生成应用私钥和公钥（RSA2）
5. 将应用公钥上传到支付宝，获取支付宝公钥
6. 在环境变量中配置 APPID、私钥、公钥
7. 回调地址填写：`https://你的域名/api/notify`

## 邮件配置说明

支持 QQ邮箱、163邮箱、Gmail 等SMTP服务：
- **QQ邮箱**：SMTP服务器 `smtp.qq.com`，端口465，使用授权码
- **163邮箱**：SMTP服务器 `smtp.163.com`，端口465，使用授权码
- **Gmail**：SMTP服务器 `smtp.gmail.com`，端口587，使用应用密码

## SEO优化说明

### 已实现的SEO功能
1. **服务端渲染（SSR）**：商品详情页使用SSR，页面源码包含完整商品信息
2. **动态Metadata**：每个商品页面自动生成独立的title、description、keywords
3. **结构化数据**：
   - WebSite类型（全站）
   - Product类型（商品页，包含价格、库存、图片）
4. **sitemap.xml**：自动生成，包含所有静态页面和商品详情页
5. **robots.txt**：允许搜索引擎爬取前台，禁止后台和API
6. **社交分享**：Open Graph + Twitter Card
7. **PWA支持**：manifest.json，支持添加到主屏幕

### 部署后SEO操作
1. 配置 `NEXT_PUBLIC_SITE_URL` 环境变量为实际域名
2. 替换 layout.js 和 sitemap.js 中的示例域名
3. 在 public 目录添加 og-image.jpg（1200x630）用于社交分享
4. 提交 sitemap.xml 到 Google Search Console 和百度资源平台
5. 使用 Google Rich Results Test 验证结构化数据

## 项目结构

```
faka-nextjs/
├── app/
│   ├── api/                    # API路由
│   │   ├── create-order/       # 创建订单
│   │   ├── query-order/        # 查询订单
│   │   ├── notify/             # 支付宝回调
│   │   ├── upload-logo/        # Logo上传
│   │   ├── upload-image/       # 商品图片上传
│   │   ├── settings/           # 系统设置
│   │   ├── admin-login/        # 管理员登录
│   │   ├── admin-products/     # 商品管理
│   │   ├── admin-cards/        # 卡密管理
│   │   ├── admin-orders/       # 订单管理
│   │   └── change-password/    # 修改密码
│   ├── admin/                  # 后台管理页面（折叠面板+底部导航）
│   ├── product/[id]/           # 商品详情页（SSR + 动态Metadata）
│   │   ├── page.js             # 服务端组件
│   │   └── ProductClient.js    # 客户端交互组件
│   ├── query/                  # 订单查询页
│   ├── terms/                  # 服务条款页
│   ├── privacy/                # 隐私政策页
│   ├── layout.js               # 全局布局（SEO Metadata + 结构化数据）
│   ├── page.js                 # 首页
│   ├── globals.css             # 全局样式
│   ├── sitemap.js              # 自动生成sitemap.xml
│   ├── robots.js               # robots.txt
│   └── manifest.js             # PWA manifest.json
├── lib/
│   ├── db.js                   # 数据库操作（ESM）
│   ├── alipay.js               # 支付宝SDK（ESM）
│   ├── email.js                # 邮件发送（ESM）
│   └── security.js             # 安全工具（ESM）
├── public/                     # 静态资源
├── supabase-schema.sql         # 数据库初始化脚本
├── SEO.md                      # SEO优化详细说明
├── .env.example                # 环境变量示例
├── next.config.js              # Next.js配置（图片优化、安全头）
├── package.json
└── README.md
```

## 使用说明

### 后台管理
- 访问 `https://你的域名/admin`
- 使用管理员密码登录
- 首次使用请先添加商品和卡密

### 添加卡密
1. 进入后台 → 卡密管理
2. 选择商品
3. 批量导入（TXT每行一个卡密）或手动添加
4. 卡密状态：available（可用）→ used（已使用）

### 下单流程
1. 用户在首页选择商品，点击购买
2. 填写邮箱，选择数量，点击立即支付
3. 显示支付宝二维码，用户扫码支付
4. 支付成功后自动显示卡密，同时发送邮件
5. 可在订单查询页随时查看

### 后台折叠面板
系统设置页面分为5个可折叠面板，点击标题展开/折叠：
- 基础设置（默认展开）
- 首页横幅配置（默认折叠）
- 底部链接配置（默认折叠）
- 页面内容配置（默认折叠）
- 邮件自动发送配置（默认折叠）

## 注意事项

1. **支付宝沙箱测试**：将 `ALIPAY_SANDBOX` 设为 `true` 可使用沙箱环境测试
2. **邮件发送**：未配置SMTP时不影响下单，仅不发送邮件
3. **库存管理**：卡密数量即为商品库存，售完后自动显示已售空
4. **数据备份**：定期在 Supabase 中备份数据库
5. **HTTPS**：生产环境必须使用HTTPS，支付宝回调需要
6. **ESM模块**：所有lib文件使用ESM语法（import/export），不支持require
7. **域名配置**：部署后请更新 `NEXT_PUBLIC_SITE_URL` 和代码中的示例域名

## License

MIT
