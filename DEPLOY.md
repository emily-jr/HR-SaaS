# HR SaaS 平台 - 部署指南

## 架构说明

- **前端/后端**: Next.js 14 (全栈应用，API 路由集成在同一个应用中)
- **数据库**: PostgreSQL (推荐使用 Supabase 云服务)
- **认证**: NextAuth.js v5 (JWT 模式)
- **ORM**: Prisma

## 部署前准备

### 1. 数据库设置 (Supabase)

1. 登录 [Supabase](https://supabase.com) 创建项目
2. 进入 SQL Editor，执行 `supabase-setup.sql` 文件（包含建表 + 种子数据）
3. 在项目 Settings → Database 中找到连接字符串

### 2. 环境变量配置

复制 `.env.example` 为 `.env` 并填写真实值：

```bash
cp .env.example .env
```

必填项：
- `DATABASE_URL` — Supabase 连接字符串
- `AUTH_SECRET` — 随机密钥（生成命令：`openssl rand -base64 32`）
- `AUTH_URL` — 你的域名（如 `https://hr.yourcompany.com`）
- `NEXT_PUBLIC_APP_URL` — 同 AUTH_URL

## 部署方式

### 方式一：Docker 部署（推荐）

```bash
# 1. 构建镜像
docker build -t hr-saas .

# 2. 运行容器
docker run -d \
  --name hr-saas \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  hr-saas
```

### 方式二：Node.js 直接部署

服务器需要 Node.js 20+ 和 npm。

```bash
# 1. 安装依赖
npm ci

# 2. 生成 Prisma 客户端
npx prisma generate

# 3. 构建生产版本
npm run build

# 4. 启动应用
node .next/standalone/server.js
```

> `next.config.js` 已配置 `output: "standalone"`，构建产物自包含，无需在服务器上安装 node_modules。

### 方式三：使用 PM2 进程管理

```bash
# 安装 PM2
npm install -g pm2

# 构建
npm ci
npx prisma generate
npm run build

# 使用 PM2 启动
pm2 start .next/standalone/server.js --name hr-saas
pm2 save
pm2 startup
```

### 方式四：Vercel / Netlify 等平台

不推荐——因为项目依赖 Prisma 和自定义 API 路由，完整服务端功能需要 Node.js 运行环境。

## 验证部署

1. 访问 `http://你的服务器:3000/login`
2. 使用种子数据中的账号登录：
   - 租户 ID: `demo`
   - 管理员: `admin@demo.com` / `123456`
   - 员工: `dev@demo.com` / `123456`

## Nginx 反向代理 (可选)

```nginx
server {
    listen 80;
    server_name hr.yourcompany.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 数据库迁移 (后续更新 Schema 时)

```bash
# 开发环境生成迁移文件
npx prisma migrate dev --name 描述

# 生产环境应用迁移
npx prisma migrate deploy
```
