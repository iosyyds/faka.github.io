# 自动发卡商城 (Next.js 版)

基于 Next.js + Supabase + 支付宝的自动发卡系统。

## 功能特性

- 商品展示与分类筛选
- 支付宝扫码支付
- 支付成功自动发卡
- 订单查询
- 管理后台（商品管理、卡密管理、订单管理、网站设置）
- 响应式设计，支持移动端

## 环境变量

在 Vercel 或本地 `.env.local` 中配置：

```
SUPABASE_URL=你的Supabase项目URL
SUPABASE_SERVICE_KEY=你的Supabase service_role key
ALIPAY_APP_ID=支付宝APPID
ALIPAY_PRIVATE_KEY=支付宝私钥
ALIPAY_PUBLIC_KEY=支付宝公钥
ALIPAY_NOTIFY_URL=回调地址
ALIPAY_SANDBOX=false
ADMIN_PASSWORD=管理后台密码
```

## 本地开发

```bash
npm install
npm run dev
```

打开 http://localhost:3000

## 部署到 Vercel

1. 推送到 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量
4. 部署完成

## 数据库

在 Supabase SQL Editor 中执行 `supabase-schema.sql` 初始化数据库。
