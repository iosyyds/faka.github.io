# 甜甜发卡 - 自动发卡商城系统

基于 Next.js + Supabase + 支付宝的全自动发卡系统，支持PC端和移动端自适应。

## 功能特性

### 前台功能
- 商品网格展示，支持分类筛选和搜索
- 商品详情弹窗购买，无需跳转页面
- 支付宝扫码支付，二维码实时生成
- 支付成功自动发卡，页面即时显示卡密
- 卡密自动发送到用户邮箱（HTML精美模板）
- 订单查询（订单号+邮箱）
- 网站Logo自定义上传
- 响应式设计，完美适配手机和电脑
- 界面锁定：禁止放大缩小、禁止F12、禁止右键

### 后台功能
- 管理员登录（bcrypt密码哈希）
- 商品管理（增删改查、上下架、分类、价格、库存）
- 卡密管理（批量导入TXT、手动添加、删除、状态管理）
- 订单管理（查看、状态筛选、手动标记支付）
- 系统设置（网站名称、Logo上传）
- 邮件SMTP配置说明
- 数据统计（今日销售额、订单数、待处理）

### 安全特性
- 卡密按顺序发放，支付成功后自动标记已使用
- 支付宝回调RSA2签名验签
- 后台Session认证
- 订单状态双保险（回调+主动查询）
- 库存自动扣减，防止超卖

## 技术栈
- **前端框架**：Next.js 14 (App Router)
- **数据库**：Supabase (PostgreSQL)
- **支付**：支付宝当面付（扫码支付）
- **邮件**：Nodemailer (SMTP)
- **样式**：原生CSS + 响应式设计
- **部署**：Vercel

## 环境变量配置

在 Vercel 项目设置或本地 `.env.local` 中配置以下环境变量：

### 数据库配置
```env
NEXT_PUBLIC_SUPABASE_URL=你的Supabase项目URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=你的Supabase service_role key
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
ADMIN_USERNAME=admin
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

## 项目结构

```
faka-nextjs/
├── app/
│   ├── api/                    # API路由
│   │   ├── create-order/       # 创建订单
│   │   ├── query-order/        # 查询订单
│   │   ├── notify/             # 支付宝回调
│   │   ├── upload-logo/        # Logo上传
│   │   ├── settings/           # 系统设置
│   │   ├── admin-login/        # 管理员登录
│   │   ├── admin-products/     # 商品管理
│   │   ├── admin-cards/        # 卡密管理
│   │   └── admin-orders/       # 订单管理
│   ├── admin/                  # 后台管理页面
│   ├── product/[id]/           # 商品详情页
│   ├── query/                  # 订单查询页
│   ├── layout.js               # 全局布局
│   ├── page.js                 # 首页
│   └── globals.css             # 全局样式
├── lib/
│   ├── db.js                   # 数据库操作
│   ├── alipay.js               # 支付宝SDK
│   ├── email.js                # 邮件发送
│   └── security.js             # 安全工具
├── public/                     # 静态资源
├── supabase-schema.sql         # 数据库初始化脚本
├── .env.example                # 环境变量示例
├── package.json
└── README.md
```

## 使用说明

### 后台管理
- 访问 `https://你的域名/admin`
- 使用管理员账号密码登录
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

## 注意事项

1. **支付宝沙箱测试**：将 `ALIPAY_SANDBOX` 设为 `true` 可使用沙箱环境测试
2. **邮件发送**：未配置SMTP时不影响下单，仅不发送邮件
3. **库存管理**：卡密数量即为商品库存，售完后自动显示已售空
4. **数据备份**：定期在 Supabase 中备份数据库
5. **HTTPS**：生产环境必须使用HTTPS，支付宝回调需要

## License

MIT
