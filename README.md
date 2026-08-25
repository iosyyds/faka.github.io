# 自动发卡商城

一个基于 GitHub + Vercel + Supabase + 支付宝当面付的自动发卡网站。用户扫码支付后自动发放卡密，全程无人值守。

## 技术架构

```
用户浏览器
    │
    ├── 前端页面（静态HTML/CSS/JS）── Vercel 静态托管 / GitHub Pages
    │
    └── API 请求 ──> Vercel Serverless Functions（Node.js）
                        │
                        ├── 支付宝当面付（扫码支付 + 回调验签）
                        └── Supabase PostgreSQL（商品/卡密/订单）
```

## 安全特性（防白嫖/0元购）

本系统在服务端做了多层严格校验，**前端传的任何数据都不可信**：

| 防护层级 | 具体措施 |
|---------|---------|
| **价格防篡改** | 创建订单时价格从数据库读取，前端传的价格直接忽略 |
| **金额校验** | 支付宝回调时严格比对回调金额与订单金额，不一致直接拒绝 |
| **签名验签** | 支付宝回调必须通过 RSA2 签名验证，防止伪造回调 |
| **app_id 校验** | 验证回调的 app_id 与配置一致，防止其他应用回调 |
| **订单状态机** | 只有 `pending` 状态才能变为 `paid`，已支付订单不能重复处理 |
| **卡密发放条件** | 只有订单状态确认为 `paid` 时才返回卡密内容 |
| **卡密原子消费** | 条件更新 + 并发校验，防止重复发卡 |
| **订单号不可预测** | 时间戳 + 随机十六进制 + 随机数，防止遍历 |
| **管理接口鉴权** | HMAC 签名 Token + 常量时间密码比较，防止时序攻击 |
| **CORS 限制** | 可配置只允许指定域名调用 API |
| **数据库 RLS** | Supabase 行级安全，匿名用户无法直接访问数据 |

## 部署步骤

### 第一步：创建 Supabase 数据库

1. 注册 [Supabase](https://supabase.com/)（免费）
2. 新建一个项目，等待初始化完成
3. 进入项目 -> **SQL Editor** -> 新建查询
4. 将 `supabase-schema.sql` 文件内容全部复制进去，点击 **Run** 执行
5. 进入 **Settings** -> **API**，记录以下信息：
   - **Project URL** → 后面配置 `SUPABASE_URL`
   - **service_role secret**（点击 reveal 显示）→ 后面配置 `SUPABASE_SERVICE_KEY`
   - ⚠️ 注意：用 `service_role` key，**不是** `anon` key

### 第二步：配置支付宝当面付

1. 登录 [支付宝开放平台](https://open.alipay.com/)
2. 创建一个**网页/移动应用**，或使用已有应用
3. 在应用中添加并签约**当面付**产品（需要企业/个体工商户资质）
4. 进入应用详情 -> **开发信息**：
   - 记录 **AppID** → 后面配置 `ALIPAY_APP_ID`
   - 生成 **RSA2 密钥**（使用支付宝密钥生成工具）
   - 记录**应用私钥** → 后面配置 `ALIPAY_PRIVATE_KEY`
   - 将**应用公钥**上传到支付宝平台
   - 记录支付宝平台返回的**支付宝公钥** → 后面配置 `ALIPAY_PUBLIC_KEY`
5. 回调地址先留空，等 Vercel 部署完成后再填

### 第三步：部署到 Vercel

1. 将本项目代码推送到 GitHub 仓库
2. 注册 [Vercel](https://vercel.com/)（免费），用 GitHub 账号登录
3. 点击 **Add New** -> **Project** -> 导入你的 GitHub 仓库
4. 在 **Environment Variables** 中添加以下变量：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `ALIPAY_APP_ID` | 支付宝应用ID | `2021001234567890` |
| `ALIPAY_PRIVATE_KEY` | 应用私钥（RSA2） | 长字符串，可不带BEGIN/END |
| `ALIPAY_PUBLIC_KEY` | 支付宝公钥 | 长字符串 |
| `ALIPAY_NOTIFY_URL` | 回调地址 | `https://你的域名/api/notify` |
| `ALIPAY_SANDBOX` | 是否沙箱模式 | `false`（正式） |
| `SUPABASE_URL` | Supabase项目URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase service_role key | 长字符串 |
| `ADMIN_PASSWORD` | 管理后台密码 | 你的强密码 |
| `ALLOWED_ORIGINS` | 允许的域名 | `*` 或你的域名 |

5. 点击 **Deploy** 等待部署完成
6. 部署完成后，Vercel 会给你一个域名（如 `auto-card-shop.vercel.app`）

### 第四步：完成支付宝回调配置

1. 回到支付宝开放平台 -> 应用 -> 开发信息
2. 设置**授权回调地址**为：`https://你的-vercel域名/api/notify`
3. 同时在 Vercel 环境变量中确认 `ALIPAY_NOTIFY_URL` 也是这个地址

### 第五步：配置 GitHub Pages（可选）

如果你想用 GitHub Pages 托管前端而不是 Vercel：

1. 在 GitHub 仓库 -> **Settings** -> **Pages**
2. Source 选择 `main` 分支，根目录
3. 等待部署完成，获得 GitHub Pages 域名
4. 修改 `js/main.js` 中的 `API_BASE` 为你的 Vercel API 地址
5. 在 Vercel 环境变量 `ALLOWED_ORIGINS` 中添加 GitHub Pages 域名

> 推荐直接用 Vercel 托管全部（静态+API），更简单，不需要跨域配置。

## 使用说明

### 管理后台

访问：`https://你的域名/admin/`

1. 输入管理密码登录
2. **商品管理**：添加商品（名称、描述、价格）
3. **卡密导入**：选择商品，批量粘贴卡密（每行一条），导入
4. **订单列表**：查看所有订单和支付状态

### 用户购买流程

1. 用户访问首页，看到商品列表和实时库存
2. 点击"立即购买"，系统创建订单并生成支付宝扫码二维码
3. 用户用支付宝扫码支付
4. 支付宝回调通知后端，后端验签 + 金额校验 + 更新订单状态 + 发放卡密
5. 前端每3秒轮询订单状态，支付成功后自动显示卡密
6. 用户可一键复制全部卡密

## API 接口说明

| 接口 | 方法 | 说明 | 鉴权 |
|------|------|------|------|
| `/api/products` | GET | 获取商品列表（含库存） | 否 |
| `/api/create-order` | POST | 创建订单 | 否 |
| `/api/query-order` | GET | 查询订单状态（paid时返回卡密） | 否 |
| `/api/notify` | POST | 支付宝异步回调 | 签名验签 |
| `/api/admin-login` | POST | 管理登录 | 密码 |
| `/api/admin-products` | GET/POST | 商品管理 | Token |
| `/api/admin-cards` | POST | 卡密导入 | Token |
| `/api/admin-orders` | GET | 订单列表 | Token |

## 本地开发

```bash
# 安装依赖
npm install

# 安装 Vercel CLI
npm i -g vercel

# 登录 Vercel
vercel login

# 本地开发（会自动拉取环境变量）
vercel dev
```

本地访问：`http://localhost:3000`

## 常见问题

### Q: 支付宝回调收不到怎么办？
A: 检查以下几点：
1. `ALIPAY_NOTIFY_URL` 是否为公网可访问的 HTTPS 地址
2. 支付宝开放平台的授权回调地址是否与之一致
3. Vercel 日志中是否有回调请求记录
4. 支付宝公钥是否配置正确（不是应用公钥）

### Q: 支付成功但卡密没显示？
A: 可能是回调处理失败：
1. 查看 Vercel 日志中的错误信息
2. 检查 Supabase 数据库中订单状态是否更新为 `paid`
3. 检查卡密库存是否充足
4. 卡密发放失败时不会回滚支付，需要人工补卡

### Q: 如何防止用户重复支付同一个订单？
A: 订单创建后15分钟未支付会自动关闭（支付宝侧），且订单状态幂等校验确保不会重复发卡。

### Q: 支持哪些支付方式？
A: 当前仅支持支付宝当面付（扫码支付）。如需微信支付，需要额外对接微信支付接口。

### Q: 卡密数据安全吗？
A: 卡密存储在 Supabase 数据库中，启用了行级安全（RLS），只有 service_role key 能访问。前端无法直接读取卡密，只有支付成功后通过后端接口获取。

## 目录结构

```
auto-card-shop/
├── index.html              # 前端首页
├── css/
│   └── style.css           # 样式
├── js/
│   └── main.js             # 前端逻辑
├── admin/
│   └── index.html          # 管理后台
├── api/                    # Vercel Serverless Functions
│   ├── products.js         # 商品列表
│   ├── create-order.js     # 创建订单
│   ├── notify.js           # 支付宝回调
│   ├── query-order.js      # 查询订单
│   ├── admin-login.js      # 管理登录
│   ├── admin-products.js   # 商品管理
│   ├── admin-cards.js      # 卡密导入
│   └── admin-orders.js     # 订单列表
├── lib/                    # 核心库
│   ├── alipay.js           # 支付宝SDK封装
│   ├── db.js               # 数据库操作层
│   └── security.js         # 安全工具
├── supabase-schema.sql     # 数据库建表脚本
├── package.json
├── vercel.json
├── .env.example            # 环境变量示例
├── .gitignore
└── README.md
```

## 许可证

MIT
