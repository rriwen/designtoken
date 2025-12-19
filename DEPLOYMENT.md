# 部署指南

## GitHub 部署

代码已经推送到 GitHub 仓库：`https://github.com/rriwen/designtoken.git`

### 推送更新

```bash
# 添加更改
git add .

# 提交更改
git commit -m "你的提交信息"

# 推送到 GitHub
git push origin main
```

## Vercel 部署

### 方法一：通过 Vercel Dashboard（推荐）

1. **访问 Vercel**
   - 打开 [https://vercel.com](https://vercel.com)
   - 使用 GitHub 账号登录

2. **导入项目**
   - 点击 "Add New..." → "Project"
   - 选择 GitHub 仓库 `rriwen/designtoken`
   - 点击 "Import"

3. **配置项目**
   - Vercel 会自动检测到 Vite 项目
   - 确认以下配置：
     - **Framework Preset**: Vite
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
     - **Install Command**: `npm install`
   - 点击 "Deploy"

4. **等待部署完成**
   - Vercel 会自动构建并部署项目
   - 部署完成后会提供一个 URL（如：`https://designtoken.vercel.app`）

### 方法二：通过 Vercel CLI

1. **安装 Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **登录 Vercel**
   ```bash
   vercel login
   ```

3. **部署项目**
   ```bash
   cd "/Users/4x/Desktop/DesignToken System"
   vercel
   ```

4. **生产环境部署**
   ```bash
   vercel --prod
   ```

### 自动部署

- 每次推送到 `main` 分支时，Vercel 会自动触发部署
- 可以通过 Vercel Dashboard 查看部署历史和状态

### 环境变量

如果项目需要环境变量，可以在 Vercel Dashboard 中设置：
1. 进入项目设置
2. 选择 "Environment Variables"
3. 添加所需的变量

### 自定义域名

1. 在 Vercel Dashboard 中进入项目
2. 选择 "Settings" → "Domains"
3. 添加你的自定义域名
4. 按照提示配置 DNS 记录

## 构建配置

项目已配置 `vercel.json`，包含：
- ✅ Vite 框架检测
- ✅ SPA 路由重写（所有路由指向 index.html）
- ✅ 静态资源缓存优化

## 故障排除

### 构建失败

1. **检查 Node.js 版本**
   - Vercel 默认使用 Node.js 18.x
   - 如需指定版本，在 `package.json` 中添加：
     ```json
     "engines": {
       "node": "18.x"
     }
     ```

2. **检查依赖**
   - 确保所有依赖都在 `package.json` 中
   - 运行 `npm install` 确保本地可以正常构建

3. **查看构建日志**
   - 在 Vercel Dashboard 中查看详细的构建日志
   - 检查错误信息

### 路由问题

如果遇到 404 错误：
- 确保 `vercel.json` 中的 `rewrites` 配置正确
- 所有路由应该重写到 `/index.html`

## 更新部署

每次更新代码后：

1. **提交并推送**
   ```bash
   git add .
   git commit -m "更新说明"
   git push origin main
   ```

2. **Vercel 自动部署**
   - Vercel 会自动检测到新的推送
   - 触发新的构建和部署

3. **查看部署状态**
   - 在 Vercel Dashboard 中查看部署进度
   - 部署完成后会自动更新生产环境

## 回滚部署

如果需要回滚到之前的版本：

1. 在 Vercel Dashboard 中进入项目
2. 选择 "Deployments"
3. 找到要回滚的版本
4. 点击 "..." → "Promote to Production"

## 性能优化

项目已配置：
- ✅ 静态资源缓存（1年）
- ✅ 代码分割
- ✅ 生产环境优化构建

## 监控和分析

Vercel 提供：
- 实时日志
- 性能分析
- 错误追踪
- 访问统计

可以在 Vercel Dashboard 中查看这些信息。
